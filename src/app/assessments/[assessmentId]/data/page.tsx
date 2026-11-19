'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { ComplianceType, IDataRequirement, IAssessment } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { ChevronRight, FileSpreadsheet, Plus, RefreshCw, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const COMPLIANCES: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];

export default function AssessmentDataPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;
  const [assessment, setAssessment] = useState<IAssessment | null>(null);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC'>('COMMON_ENERGY');
  const [linkedCompliances, setLinkedCompliances] = useState<ComplianceType[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [monthlyFrequency, setMonthlyFrequency] = useState(false);
  const [reportingMonths, setReportingMonths] = useState('');

  const loadData = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError('');
    try {
      const assessmentResponse = await fetch(`/api/assessments/${assessmentId}`, { cache: 'no-store', credentials: 'include' });
      const assessmentPayload = await assessmentResponse.json().catch(() => null);
      if (!assessmentResponse.ok || !assessmentPayload?.data) throw new Error(assessmentPayload?.error || 'Unable to load assessment details.');
      const currentAssessment = assessmentPayload.data as IAssessment;
      setAssessment(currentAssessment);
      setLinkedCompliances((current) => current.length ? current : [currentAssessment.complianceType]);
      const query = new URLSearchParams({ facilityId: currentAssessment.facilityId, period: currentAssessment.period });
      const requirementsResponse = await fetch(`/api/requirements?${query.toString()}`, { cache: 'no-store', credentials: 'include' });
      const requirementsPayload = await requirementsResponse.json().catch(() => null);
      if (!requirementsResponse.ok) throw new Error(requirementsPayload?.error || 'Unable to load client submissions.');
      setRequirements(Array.isArray(requirementsPayload?.data) ? requirementsPayload.data : []);
    } catch (loadError) {
      console.error('Error loading consultant data checklist:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load client submissions.');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const summary = useMemo(() => ({
    total: requirements.length,
    requested: requirements.filter((item) => item.submissionStatus === 'REQUESTED').length,
    received: requirements.filter((item) => item.submissionStatus === 'RECEIVED' || item.submissionStatus === 'PARTIALLY_RECEIVED').length,
    approved: requirements.filter((item) => item.verificationStatus === 'APPROVED').length,
  }), [requirements]);

  const createRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!assessment) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const months = reportingMonths.split(',').map((month) => month.trim()).filter(Boolean);
      const response = await fetch('/api/requirements', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId: assessment.facilityId,
          period: assessment.period,
          title: title.trim(), description: description.trim(), category,
          linkedCompliances, dueDate: dueDate || undefined,
          monthlyFrequency, reportingMonths: monthlyFrequency ? months : [],
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to create data request.');
      setTitle(''); setDescription(''); setDueDate(''); setMonthlyFrequency(false); setReportingMonths('');
      setShowForm(false); setSuccess('Data request created and made visible in the authorized client portal.');
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create data request.');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-xs text-slate-500">Loading Data Collection Checklist...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href={`/facilities/${assessment?.facilityId || ''}`} className="hover:text-emerald-600">{assessment?.facilityName || assessment?.facilityId || 'Facility'}</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href={`/assessments/${assessmentId}`}>Assessment</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-slate-900 dark:text-white">Data Collection</span>
      </div>

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-600" /><h1 className="text-xl font-bold text-slate-900 dark:text-white">Data requests · {assessment?.period}</h1></div>
            <p className="mt-1 text-xs text-slate-500">{assessment?.facilityName || assessment?.facilityId} · {assessment?.complianceType}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadData()} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
            <button onClick={() => setShowForm((value) => !value)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"><Plus className="w-3.5 h-3.5" /> Create data request</button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Total requests', summary.total], ['Awaiting client', summary.requested], ['Received', summary.received], ['Approved', summary.approved]].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3"><div className="text-xl font-bold text-slate-900 dark:text-white">{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>
          ))}
        </div>
      </section>

      {error && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
      {success && <div role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">{success}</div>}

      {showForm && (
        <form onSubmit={createRequest} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
          <div><h2 className="font-bold text-slate-900 dark:text-white">Create a request for the client</h2><p className="text-xs text-slate-500 mt-1">The request will appear in the client portal after it is saved.</p></div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Requirement title<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly grid electricity bills" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" /></label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Requirement category<select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm"><option value="COMMON_ENERGY">Common energy</option><option value="COMPLIANCE_SPECIFIC">Compliance specific</option></select></label>
          </div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Instructions / description<textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Explain exactly what the client needs to submit, including units and supporting evidence." className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" /></label>
          <fieldset><legend className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Linked compliances</legend><div className="flex flex-wrap gap-3">{COMPLIANCES.map((code) => <label key={code} className="inline-flex items-center gap-1.5 text-xs"><input type="checkbox" checked={linkedCompliances.includes(code)} onChange={(e) => setLinkedCompliances((current) => e.target.checked ? [...current, code] : current.filter((item) => item !== code))} />{code}</label>)}</div></fieldset>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Client submission deadline<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" /></label>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mt-5"><input type="checkbox" checked={monthlyFrequency} onChange={(e) => setMonthlyFrequency(e.target.checked)} /> Monthly reporting requirement</label>
          </div>
          {monthlyFrequency && <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Reporting months (comma-separated, YYYY-MM)<input value={reportingMonths} onChange={(e) => setReportingMonths(e.target.value)} placeholder="2025-04, 2025-05, 2025-06" className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-sm" /></label>}
          {linkedCompliances.length === 0 && <p className="text-xs text-rose-600">Select at least one compliance.</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold">Cancel</button><button disabled={saving || linkedCompliances.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"><Send className="w-3.5 h-3.5" />{saving ? 'Creating…' : 'Create and send request'}</button></div>
        </form>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 space-y-3">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Requirements and client submissions</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs"><thead className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500"><tr><th className="p-3">Requirement</th><th className="p-3">Compliance</th><th className="p-3">Submission</th><th className="p-3">Verification</th><th className="p-3">Evidence</th><th className="p-3">Due date</th><th className="p-3">Action</th></tr></thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{requirements.map((req) => <tr key={req._id} className="align-top"><td className="p-3 min-w-52"><div className="font-semibold text-slate-900 dark:text-white">{req.title}</div><div className="mt-1 text-[11px] text-slate-500">{req.description}</div></td><td className="p-3"><div className="flex flex-wrap gap-1">{req.linkedCompliances?.map((code) => <span key={code} className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-1 font-mono">{code}</span>)}</div></td><td className="p-3"><StatusBadge status={req.submissionStatus} size="sm" /></td><td className="p-3"><StatusBadge status={req.verificationStatus} size="sm" /></td><td className="p-3 min-w-48">{req.submittedDriveLinks?.length ? req.submittedDriveLinks.map((link, index) => <div key={`${link.url}-${index}`} className="mb-2"><DriveLinkBadge url={link.url} label={link.description || 'Client evidence'} billDetails={link.billDetails} utilityConnectionSnapshot={link.utilityConnectionSnapshot} facilityId={req.facilityId} /><div className="mt-1 text-[10px] text-slate-500">{link.submittedBy} · {link.submittedAt ? formatDate(link.submittedAt) : ''}</div></div>) : <span className="italic text-slate-400">Awaiting client</span>}</td><td className="p-3 whitespace-nowrap">{req.dueDate ? formatDate(req.dueDate) : '—'}</td><td className="p-3">{req.datasetId ? <Link href={`/datasets/${req.datasetId}/verify`} className="rounded bg-emerald-50 text-emerald-800 px-2 py-1 font-semibold">Review dataset</Link> : <span className="text-slate-400">Evidence review</span>}</td></tr>)}
              {requirements.length === 0 && <tr><td colSpan={7} className="p-10 text-center text-slate-500">No requests yet. Create a request above or publish the facility checklist to generate requests.</td></tr>}</tbody></table>
        </div>
      </section>
    </div>
  );
}
