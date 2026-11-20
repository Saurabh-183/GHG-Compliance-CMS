'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/context/AuthContext';
import {
  RegulatoryTemplate, RegulatoryField, getTemplatesForFramework,
  getRegulatoryTemplate, calculateRegulatoryValues, RegulatoryFramework
} from '@/lib/regulatory/regulatoryTemplates';

type Props = { assessmentId: string; framework: RegulatoryFramework; period: string; facilityId: string };
type Review = { fieldKey: string; status: string; comments?: string; reviewedByName?: string };
type Evidence = { fieldKey?: string; title: string; url: string; note?: string };

const columnLabel: Record<string,string> = {
  BASELINE: 'Baseline year', ASSESSMENT: 'Assessment / target year', TARGET: 'Target year', VALUE: 'Reported value'
};

export function RegulatoryMetricsPanel({ assessmentId, framework, period, facilityId }: Props) {
  const { currentRole } = useAuth();
  const templates = useMemo(() => getTemplatesForFramework(framework), [framework]);
  const [templateId, setTemplateId] = useState(framework === 'CCTS' ? '' : (templates[0]?.id || ''));
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [status, setStatus] = useState('NOT_REQUESTED');
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [evidenceTitle, setEvidenceTitle] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [evidenceNote, setEvidenceNote] = useState('');

  const template = getRegulatoryTemplate(templateId);
  const isReviewer = currentRole === 'ADMIN' || currentRole === 'CONSULTANT';
  const isClient = currentRole === 'CLIENT';
  const computed = useMemo(() => ({...values, ...calculateRegulatoryValues(templateId, values)}), [templateId, values]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/regulatory`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to load regulatory data');
      if (data.submission) {
        setTemplateId(data.submission.templateId);
        setValues(data.submission.values || {});
        setReviews(data.submission.fieldReviews || []);
        setEvidence(data.submission.evidence || []);
        setStatus(data.submission.status || 'DRAFT');
        setVersion(data.submission.version || 0);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to load regulatory data');
    } finally { setLoading(false); }
  }, [assessmentId]);

  useEffect(() => { void load(); }, [load]);

  const setValue = (key: string, value: unknown) => setValues(prev => ({...prev, [key]: value}));
  const valueKey = (field: RegulatoryField, column: string) => column === 'VALUE' ? field.key : `${field.key}__${column}`;

  async function saveDraft() {
    if (!template) return;
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/regulatory`, {
        method: 'PUT', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ templateId, values, evidence })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save');
      setValues(data.submission.values || values);
      setStatus(data.submission.status);
      setVersion(data.submission.version);
      setMessage('Draft saved successfully.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  async function submit() {
    setBusy(true); setMessage('');
    try {
      const saveRes = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/regulatory`, {
        method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({templateId,values,evidence})
      });
      const saved = await saveRes.json();
      if (!saveRes.ok) throw new Error(saved.error || 'Save before submit failed');
      const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/regulatory`, {method:'POST'});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submit failed');
      setStatus(data.submission.status); setVersion(data.submission.version); setMessage('Submitted for review.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Submit failed'); }
    finally { setBusy(false); }
  }

  async function requestData() {
    if (!templateId) { setMessage('Choose the correct summary sheet first.'); return; }
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/regulatory`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'REQUEST_DATA', templateId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to send data request');
      setStatus(data.submission.status); setVersion(data.submission.version); setMessage('Data request sent to the client.');
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Unable to send data request'); }
    finally { setBusy(false); }
  }

  async function review(action: string, fieldKey?: string) {
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/regulatory`, {
        method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,fieldKey,comments: action==='REJECT_FIELD'?'Please review the supporting source and correct this value.':''})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (data.fields ? data.fields.join(', ') : 'Review action failed'));
      setStatus(data.submission.status); setReviews(data.submission.fieldReviews || []); setVersion(data.submission.version);
      setMessage(`Action ${action.replaceAll('_',' ').toLowerCase()} completed.`);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Review action failed'); }
    finally { setBusy(false); }
  }

  function exportWorkbook() {
    if (!template) return;
    const rows = template.sections.flatMap(section => [
      { Section: section.title, Particulars: '', Unit: '', 'Source / Accounting Basis': '' },
      ...section.fields.map(field => {
        const row: Record<string, string> = {
          Section: section.title, Particulars: field.label, Unit: field.unit,
          'Source / Accounting Basis': field.sourceRef || ''
        };
        field.columns.forEach(col => {
          const key = valueKey(field, col);
          const raw = computed[key];
          row[templateId.startsWith('PAT_') && col === 'BASELINE' ? 'Average of Year 1 to Year 3' : (columnLabel[col] || col)] = raw === undefined || raw === null ? '' : String(raw);
        });
        return row;
      })
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Regulatory Summary');
    XLSX.writeFile(workbook, `${template.id}-${period}.xlsx`);
  }

  function addEvidence() {
    if (!evidenceTitle.trim() || !/^https?:\/\/\S+/i.test(evidenceUrl.trim())) {
      setMessage('Enter an evidence title and a valid http(s) URL.');
      return;
    }
    setEvidence(old => [...old, {title:evidenceTitle.trim(),url:evidenceUrl.trim(),note:evidenceNote.trim()}]);
    setEvidenceTitle(''); setEvidenceUrl(''); setEvidenceNote('');
  }

  if (loading) return <section className="rounded-xl border border-slate-200 dark:border-slate-700 p-6">Loading regulatory metrics…</section>;
  if (!templates.length) return <section className="rounded-xl border border-amber-300 p-5 text-sm">No regulatory template is configured for {framework}.</section>;

  const reviewMap = new Map(reviews.map(r => [r.fieldKey,r]));
  const canEdit = isClient;
  const locked = !['REQUESTED','DRAFT','RETURNED'].includes(status);

  return (
    <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Regulatory reporting</span>
            <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-[10px] font-semibold">{status.replaceAll('_',' ')}</span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-900 dark:text-white">Structured Regulatory Compliance Metrics</h2>
          <p className="mt-1 text-xs text-slate-500">Facility: {facilityId} · Period: {period} · Version: {version || 'New'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={templateId} disabled={isClient || (status !== 'DRAFT' && status !== 'RETURNED' && status !== 'NOT_REQUESTED')} onChange={e=>{setTemplateId(e.target.value);setValues({});setReviews([]);}} className="min-w-64 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs">
            <option value="">Choose the correct sector / summary sheet</option>{templates.map(t=><option key={t.id} value={t.id}>{t.sector} — {t.formName}</option>)}
          </select>
          {isReviewer && (!status || status === 'DRAFT' || status === 'NOT_REQUESTED') && <button disabled={busy || !template} onClick={requestData} className="rounded-lg bg-indigo-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Request data from client</button>}
          {(isClient || !!template) && <button onClick={exportWorkbook} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold">Export Excel</button>}
          {isClient && <button disabled={busy || locked || !template} onClick={saveDraft} className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-xs font-semibold disabled:opacity-50">{busy?'Saving…':'Save draft'}</button>}
          {isClient && <button disabled={busy || locked || !template || status==='SUBMITTED' || status==='UNDER_REVIEW'} onClick={submit} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Submit for review</button>}
        </div>
      </div>

      {message && <div className="mx-5 mt-4 rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-3 text-xs text-slate-700 dark:text-slate-200">{message}</div>}

      {isClient && status==='NOT_REQUESTED' && <div className="p-5 text-sm text-slate-600 dark:text-slate-300">No regulatory data request has been assigned to this facility yet. Your consultant will send the applicable summary sheet here.</div>}
      {isReviewer && status==='NOT_REQUESTED' && <div className="p-5 text-xs text-slate-500">Choose the applicable summary sheet above and send a data request to the client.</div>}
      {isReviewer && status==='REQUESTED' && <div className="px-5 pt-4 text-xs text-indigo-700 dark:text-indigo-300">Waiting for the client to complete this requested summary sheet.</div>}
      {isReviewer && status==='SUBMITTED' && <div className="px-5 pt-4 flex gap-2"><button disabled={busy} onClick={()=>review('START_REVIEW')} className="rounded-lg bg-blue-700 text-white px-3 py-2 text-xs">Start review</button></div>}
      {template && status !== 'NOT_REQUESTED' && (status !== 'REQUESTED' || isClient) && <div className="p-5 sm:p-6 space-y-6">
        {template.sections.map(section=>(
          <div key={section.id} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">{section.title}</h3>
              {section.description && <p className="text-xs text-slate-500 mt-1">{section.description}</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead><tr className="border-y border-slate-200 dark:border-slate-700 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 w-[34%]">Particulars</th>
                  <th className="px-3 py-3">Unit / Source reference</th>
                  {Array.from(new Set(section.fields.flatMap(field=>field.columns))).map(col=><th key={col} className="px-3 py-3">{templateId.startsWith('PAT_') && col === 'BASELINE' ? 'Average of Year 1 to Year 3' : (columnLabel[col] || col)}</th>)}
                  {isReviewer && <th className="px-3 py-3">Review</th>}
                </tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {section.fields.map(field=>{
                    const reviewState=reviewMap.get(field.key);
                    return <tr key={field.key} className="align-top">
                      <td className="px-4 py-3"><div className="text-xs font-semibold text-slate-800 dark:text-slate-100">{field.label}{field.required && <span className="text-red-500"> *</span>}</div>{field.calculationNote && <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-300">{field.calculationNote}</div>}{isClient && reviewState?.status === 'REJECTED' && <div className="mt-2 rounded bg-rose-50 dark:bg-rose-950/30 px-2 py-1.5 text-[10px] text-rose-700 dark:text-rose-300">Consultant correction: {reviewState.comments || 'Please review and correct this value.'}</div>}</td>
                      <td className="px-3 py-3"><div className="text-xs text-slate-700 dark:text-slate-300">{field.unit}</div><div className="mt-1 text-[10px] text-slate-400">{field.sourceRef}</div></td>
                      {field.columns.map(col=>{
                        const key=valueKey(field,col);
                        const isComputed=field.input===false;
                        const raw=isComputed && col==='VALUE' ? computed[field.key] : computed[key];
                        const val=raw === undefined || raw === null ? '' : String(raw);
                        return <td key={col} className="px-3 py-2 min-w-36">
                          <input
                            type={field.kind==='date'?'date':(field.kind==='text'||col==='NOT_APPLICABLE')?'text':'number'}
                            step={field.unit.includes('%')?'0.01':'any'}
                            value={val}
                            readOnly={isComputed || locked || !canEdit}
                            onChange={e=>setValue(key,field.kind==='text'||field.kind==='date'||col==='NOT_APPLICABLE'?e.target.value:(e.target.value===''?'':Number(e.target.value)))}
                            className={`w-full rounded-md border px-2.5 py-2 text-xs ${isComputed?'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300':'bg-white dark:bg-slate-950'} border-slate-200 dark:border-slate-700`}
                            placeholder={isComputed?'Calculated':'Enter value'}
                          />
                        </td>;
                      })}
                      {isReviewer && <td className="px-3 py-2 min-w-36">
                        <div className="text-[10px] mb-1 text-slate-500">{reviewState?.status || 'PENDING'}</div>
                        <div className="flex gap-1">
                          <button disabled={busy || !['SUBMITTED','UNDER_REVIEW','RETURNED'].includes(status)} onClick={()=>review('VERIFY_FIELD',field.key)} className="rounded bg-emerald-700 text-white px-2 py-1 text-[10px] disabled:opacity-40">Verify</button>
                          <button disabled={busy || !['SUBMITTED','UNDER_REVIEW','RETURNED'].includes(status)} onClick={()=>review('REJECT_FIELD',field.key)} className="rounded bg-rose-700 text-white px-2 py-1 text-[10px] disabled:opacity-40">Reject</button>
                        </div>
                      </td>}
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
          <div><h3 className="text-sm font-bold">Supporting evidence</h3><p className="text-xs text-slate-500 mt-1">Add links to bills, audit reports, production records, REC certificates and calculation workbooks.</p></div>
          {isClient && <div className="space-y-2"><div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input value={evidenceTitle} onChange={e=>setEvidenceTitle(e.target.value)} placeholder="Document title" className="rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-xs"/>
            <input value={evidenceUrl} onChange={e=>setEvidenceUrl(e.target.value)} placeholder="https:// evidence URL" className="rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-xs"/>
            <button onClick={addEvidence} className="rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-xs font-semibold">Add evidence link</button>
          </div>
          <input value={evidenceNote} onChange={e=>setEvidenceNote(e.target.value)} placeholder="Optional note" className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-transparent px-3 py-2 text-xs"/>
          </div>}
          {evidence.map((item,i)=><div key={`${item.url}-${i}`} className="flex items-center justify-between gap-3 text-xs border-t border-slate-100 dark:border-slate-800 pt-2"><a href={item.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{item.title}</a>{isClient && <button onClick={()=>setEvidence(old=>old.filter((_,idx)=>idx!==i))} className="text-rose-600">Remove</button>}</div>)}
        </div>
        {isReviewer && <div className="flex flex-wrap gap-2 border-t border-slate-200 dark:border-slate-700 pt-4">
          <button disabled={busy || status!=='UNDER_REVIEW'} onClick={()=>review('VERIFY_REPORT')} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs text-white disabled:opacity-40">Verify report</button>
          <button disabled={busy || !['SUBMITTED','UNDER_REVIEW'].includes(status)} onClick={()=>review('RETURN')} className="rounded-lg bg-amber-600 px-4 py-2 text-xs text-white disabled:opacity-40">Return for correction</button>
          {currentRole==='ADMIN' && <button disabled={busy || status!=='VERIFIED'} onClick={()=>review('APPROVE')} className="rounded-lg bg-blue-700 px-4 py-2 text-xs text-white disabled:opacity-40">Final approval</button>}
        </div>}
      </div>}
    </section>
  );
}
