'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Save, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { ComplianceType, IDataRequirement, IFacility, IRequestDocumentSpec, IRequestField, ReportingFrequency } from '@/types';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { StatusBadge } from '@/components/common/StatusBadge';
import { notify } from '@/lib/notify';
import { FormSection } from '@/components/requests/FormSection';
import { DynamicFieldBuilder } from '@/components/requests/DynamicFieldBuilder';
import { DocumentRequirementsBuilder } from '@/components/requests/DocumentRequirementsBuilder';
import { RequestFormPreview } from '@/components/requests/RequestFormPreview';
import {
  BRSR_PRINCIPLES,
  BRSR_SECTIONS,
  CONSULTANT_REQUEST_TEMPLATES,
  DATA_CATEGORIES,
  REPORTING_FREQUENCIES,
  SUBMISSION_FORMATS,
  financialYearOptions,
  generateMonthRange,
  suggestRequestTitle,
} from '@/lib/dataRequestCategories';
import { validateFields } from '@/lib/requestFieldUtils';

const COMPLIANCE_OPTIONS: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];

interface FacilityDataRequestPanelProps {
  facilityId: string;
  facilityName?: string;
  period?: string;
  className?: string;
}

export function FacilityDataRequestPanel({
  facilityId: initialFacilityId,
  facilityName: initialFacilityName,
  period: defaultPeriod = DEFAULT_CHECKLIST_PERIOD,
  className = '',
}: FacilityDataRequestPanelProps) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [facilities, setFacilities] = useState<IFacility[]>([]);
  const [facilityId, setFacilityId] = useState(initialFacilityId);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: false, 4: false, 5: false });
  const [showPreview, setShowPreview] = useState(false);

  const [title, setTitle] = useState('');
  const [dataCategory, setDataCategory] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [period, setPeriod] = useState(defaultPeriod);
  const [brsrSection, setBrsrSection] = useState<string>(BRSR_SECTIONS[2]);
  const [brsrPrinciples, setBrsrPrinciples] = useState<string[]>(['P6']);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [linkedCompliances, setLinkedCompliances] = useState<ComplianceType[]>(['PAT', 'RCO']);

  const [fields, setFields] = useState<IRequestField[]>([]);
  const [documents, setDocuments] = useState<IRequestDocumentSpec[]>([]);

  const [reportingFrequency, setReportingFrequency] = useState<ReportingFrequency>('ANNUAL');
  const [reportingPeriodStart, setReportingPeriodStart] = useState('');
  const [reportingPeriodEnd, setReportingPeriodEnd] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [submissionFormat, setSubmissionFormat] = useState<string>(SUBMISSION_FORMATS[0]);

  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [allowPartialSubmission, setAllowPartialSubmission] = useState(true);
  const [notifyClient, setNotifyClient] = useState(true);
  const [clientContact, setClientContact] = useState('');

  const selectedFacility = facilities.find((f) => f.facilityId === facilityId);
  const orgName = selectedFacility?.clientGroupName || 'Organization';

  const fyOptions = useMemo(() => financialYearOptions(), []);

  const monthOptions = useMemo(() => {
    if (reportingPeriodStart && reportingPeriodEnd) {
      return generateMonthRange(reportingPeriodStart, reportingPeriodEnd);
    }
    return [];
  }, [reportingPeriodStart, reportingPeriodEnd]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return [...DATA_CATEGORIES];
    return DATA_CATEGORIES.filter((c) => c.toLowerCase().includes(q));
  }, [categorySearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [facRes, reqRes] = await Promise.all([
        fetch('/api/facilities', { credentials: 'include' }),
        fetch(`/api/requirements?facilityId=${facilityId}&period=${encodeURIComponent(period)}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
      ]);
      const facJson = await facRes.json();
      const reqJson = await reqRes.json();
      if (facRes.ok) setFacilities(facJson.data || []);
      if (reqRes.ok) setRequirements(Array.isArray(reqJson.data) ? reqJson.data : []);
    } catch (e) {
      console.error(e);
      notify.error('Could not load request context');
    } finally {
      setLoading(false);
    }
  }, [facilityId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setFacilityId(initialFacilityId);
  }, [initialFacilityId]);

  useEffect(() => {
    if (dataCategory && !title.trim()) {
      setTitle(suggestRequestTitle(dataCategory, selectedFacility?.name || initialFacilityName, period));
    }
  }, [dataCategory, selectedFacility?.name, initialFacilityName, period, title]);

  useEffect(() => {
    if (reportingFrequency === 'MONTHLY' && monthOptions.length) {
      setSelectedMonths((prev) => (prev.length ? prev.filter((m) => monthOptions.includes(m)) : monthOptions));
    }
  }, [reportingFrequency, monthOptions]);

  const toggleSection = (step: number) => {
    setOpenSections((s) => ({ ...s, [step]: !s[step] }));
  };

  const toggleCompliance = (value: ComplianceType) => {
    setLinkedCompliances((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]
    );
  };

  const togglePrinciple = (p: string) => {
    setBrsrPrinciples((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  const applyTemplate = (templateId: string) => {
    const t = CONSULTANT_REQUEST_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    setDataCategory(t.dataCategory);
    setTitle(suggestRequestTitle(t.dataCategory, selectedFacility?.name || initialFacilityName, period));
    setBrsrSection(t.brsrSection);
    setBrsrPrinciples(t.brsrPrinciples);
    setPurpose(t.purpose);
    setInstructions(t.instructions);
    setFields(t.fields.map((f) => ({ ...f })));
    setDocuments(t.documents.map((d) => ({ ...d })));
    setOpenSections({ 1: true, 2: true, 3: true, 4: true, 5: false });
    notify.success(`Template "${t.label}" loaded — adjust before sending.`);
  };

  const validateClient = (): boolean => {
    if (!title.trim()) {
      notify.error('Request title is required.');
      return false;
    }
    if (!dataCategory.trim()) {
      notify.error('Select a data category.');
      return false;
    }
    if (!instructions.trim()) {
      notify.error('Instructions for the client are required.');
      return false;
    }
    const fieldErr = validateFields(fields);
    if (fieldErr) {
      notify.error(fieldErr);
      return false;
    }
    if (!fields.length && !documents.length) {
      notify.error('Add at least one field or document requirement.');
      return false;
    }
    if (reportingFrequency === 'MONTHLY' && !selectedMonths.length) {
      notify.error('Select reporting months for monthly frequency.');
      return false;
    }
    if (!linkedCompliances.length) {
      notify.error('Select at least one linked framework.');
      return false;
    }
    return true;
  };

  const buildPayload = (saveAsDraft: boolean) => ({
    facilityId,
    period,
    title: title.trim(),
    description: instructions.trim(),
    submissionInstructions: instructions.trim(),
    category: 'COMPLIANCE_SPECIFIC' as const,
    linkedCompliances,
    dueDate: dueDate || undefined,
    reportingFrequency,
    reportingPeriodStart: reportingPeriodStart || undefined,
    reportingPeriodEnd: reportingPeriodEnd || undefined,
    monthlyFrequency: reportingFrequency === 'MONTHLY',
    reportingMonths: reportingFrequency === 'MONTHLY' ? selectedMonths : undefined,
    purpose: purpose.trim() || undefined,
    dataCategory,
    brsrSection,
    brsrPrinciples,
    priority,
    requiredFields: fields,
    requiredDocumentSpecs: documents,
    submissionFormat,
    allowPartialSubmission,
    assignedClientContact: clientContact.trim() || undefined,
    saveAsDraft,
  });

  const submit = async (saveAsDraft: boolean) => {
    if (!saveAsDraft && !validateClient()) return;
    if (saveAsDraft && !title.trim() && !fields.length) {
      notify.error('Add a title or at least one field before saving draft.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(buildPayload(saveAsDraft)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');

      if (saveAsDraft) {
        notify.success('Draft saved. Send when ready from Track or send now.');
      } else {
        notify.success(notifyClient ? 'Request sent — client notified.' : json.message || 'Request sent.');
      }

      setTitle('');
      setDataCategory('');
      setPurpose('');
      setInstructions('');
      setFields([]);
      setDocuments([]);
      setDueDate('');
      setSelectedMonths([]);
      await load();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : 'Failed to save request');
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = requirements.filter((r) =>
    ['REQUESTED', 'PARTIALLY_RECEIVED', 'IN_PROGRESS', 'CHANGES_REQUESTED'].includes(
      r.workflowStatus || r.submissionStatus
    )
  ).length;

  const facilityLabel = selectedFacility?.name || initialFacilityName || facilityId;

  return (
    <div className={`space-y-5 ${className}`}>
      <PanelHeader facilityLabel={facilityLabel} orgName={orgName} period={period} openCount={openCount} />

      <QuickTemplateBar onApply={applyTemplate} />

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
      >
        <FormSection step={1} title="Request details" subtitle="Organization, facility, BRSR mapping" open={!!openSections[1]} onToggle={() => toggleSection(1)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Organization</span>
              <input readOnly value={orgName} className="w-full rounded-lg border px-3 py-2 bg-slate-100 dark:bg-slate-800" />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Facility</span>
              <select
                value={facilityId}
                onChange={(e) => setFacilityId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950"
              >
                {facilities.map((f) => (
                  <option key={f.facilityId} value={f.facilityId}>
                    {f.name} ({f.facilityId})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Request title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Reporting financial year</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950">
                {fyOptions.map((fy) => (
                  <option key={fy} value={fy}>
                    FY {fy}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Data category</span>
              <input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search category…"
                className="w-full rounded-lg border px-3 py-2 mb-1 dark:bg-slate-950"
              />
              <select value={dataCategory} onChange={(e) => setDataCategory(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950">
                <option value="">Select category</option>
                {filteredCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">BRSR section</span>
              <select value={brsrSection} onChange={(e) => setBrsrSection(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950">
                {BRSR_SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">BRSR principles (P1–P9)</span>
              <div className="flex flex-wrap gap-1.5">
                {BRSR_PRINCIPLES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePrinciple(p)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border ${
                      brsrPrinciples.includes(p) ? 'bg-emerald-700 text-white' : 'border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Linked frameworks</span>
              <div className="flex flex-wrap gap-2">
                {COMPLIANCE_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCompliance(c)}
                    className={`px-2 py-1 rounded-md text-[10px] font-mono font-bold border ${
                      linkedCompliances.includes(c) ? 'bg-emerald-700 text-white' : 'border-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Priority</span>
              <select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </label>
          </div>
        </FormSection>

        <FormSection step={2} title="Required information" subtitle="Visual field builder — no pipe syntax" open={!!openSections[2]} onToggle={() => toggleSection(2)}>
          <DynamicFieldBuilder fields={fields} onChange={setFields} />
        </FormSection>

        <FormSection step={3} title="Reporting period & documents" subtitle="Frequency, months, submission format" open={!!openSections[3]} onToggle={() => toggleSection(3)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Reporting frequency</span>
              <select
                value={reportingFrequency}
                onChange={(e) => setReportingFrequency(e.target.value as ReportingFrequency)}
                className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950"
              >
                {REPORTING_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Submission format</span>
              <select value={submissionFormat} onChange={(e) => setSubmissionFormat(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950">
                {SUBMISSION_FORMATS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Reporting start (YYYY-MM)</span>
              <input type="month" value={reportingPeriodStart} onChange={(e) => setReportingPeriodStart(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
            </label>
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Reporting end (YYYY-MM)</span>
              <input type="month" value={reportingPeriodEnd} onChange={(e) => setReportingPeriodEnd(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
            </label>
          </div>

          {reportingFrequency === 'MONTHLY' && monthOptions.length > 0 && (
            <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Select reporting months</p>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {monthOptions.map((m) => (
                  <label key={m} className="inline-flex items-center gap-1 text-[10px] font-mono border rounded-md px-2 py-1">
                    <input
                      type="checkbox"
                      checked={selectedMonths.includes(m)}
                      onChange={() =>
                        setSelectedMonths((prev) =>
                          prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
                        )
                      }
                      className="accent-emerald-700"
                    />
                    {m}
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Clients can submit month-by-month; overall status tracks pending months.</p>
            </div>
          )}

          <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Required documents</p>
          <DocumentRequirementsBuilder documents={documents} onChange={setDocuments} />
        </FormSection>

        <FormSection step={4} title="Purpose & instructions" subtitle="Why and how the client should respond" open={!!openSections[4]} onToggle={() => toggleSection(4)}>
          <div className="space-y-3 text-xs">
            <label className="block space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Purpose of collection</span>
              <textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" placeholder="Why this data is required for BRSR / compliance…" />
            </label>
            <label className="block space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Instructions for client</span>
              <textarea rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" placeholder="What to upload, Drive link access, missing data notes…" />
            </label>
          </div>
        </FormSection>

        <FormSection step={5} title="Assignment & delivery" subtitle="Due date, partial submission, preview" open={!!openSections[5]} onToggle={() => toggleSection(5)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Assigned consultant</span>
              <input readOnly value={currentUser?.name || 'Consultant'} className="w-full rounded-lg border px-3 py-2 bg-slate-100 dark:bg-slate-800" />
            </label>
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Client contact (optional)</span>
              <input value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="Name or email" className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
            </label>
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Submission due date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input type="checkbox" checked={allowPartialSubmission} onChange={(e) => setAllowPartialSubmission(e.target.checked)} className="accent-emerald-700" />
              Allow partial submission (e.g. month-by-month)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={notifyClient} onChange={(e) => setNotifyClient(e.target.checked)} className="accent-emerald-700" />
              Notify client when sent
            </label>
          </div>
        </FormSection>

        <div className="flex flex-wrap gap-3 items-center justify-between sticky bottom-4 z-10 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur p-4 shadow-lg">
          <button
            type="button"
            onClick={() => setShowPreview((p) => !p)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold"
          >
            <Eye className="w-4 h-4" /> {showPreview ? 'Hide preview' : 'Preview client form'}
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save draft
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to client
            </button>
          </div>
        </div>
      </form>

      {showPreview && (
        <RequestFormPreview
          title={title}
          purpose={purpose}
          instructions={instructions}
          fields={fields}
          documents={documents}
          period={period}
          facilityLabel={facilityLabel}
          dataCategory={dataCategory}
        />
      )}

      <RecentRequestsList loading={loading} requirements={requirements} facilityId={facilityId} />
    </div>
  );
}

function PanelHeader({
  facilityLabel,
  orgName,
  period,
  openCount,
}: {
  facilityLabel: string;
  orgName: string;
  period: string;
  openCount: number;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/20 dark:to-slate-900 p-5">
      <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
        <Send className="w-5 h-5 text-emerald-700" />
        Create data request — client portal
      </h3>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
        {orgName} · <strong>{facilityLabel}</strong> · FY {period}
      </p>
      <p className="text-[11px] text-slate-500 mt-1">{openCount} open request(s) for this facility.</p>
    </div>
  );
}

function QuickTemplateBar({ onApply }: { onApply: (id: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="text-[10px] font-bold uppercase text-slate-500 self-center w-full sm:w-auto">Quick templates:</span>
      {CONSULTANT_REQUEST_TEMPLATES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onApply(t.id)}
          className="px-3 py-1.5 rounded-full border border-slate-300 dark:border-slate-600 text-[10px] font-bold hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function RecentRequestsList({
  loading,
  requirements,
  facilityId,
}: {
  loading: boolean;
  requirements: IDataRequirement[];
  facilityId: string;
}) {
  return (
    <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recent requests — {facilityId}</span>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : requirements.length === 0 ? (
        <p className="text-xs text-slate-500 py-2">No portal requests for this facility yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 max-h-48 overflow-y-auto text-xs">
          {requirements.slice(0, 12).map((req) => (
            <li key={req._id} className="py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 dark:text-white truncate">{req.title}</div>
                <div className="text-[10px] text-slate-500 font-mono">{req.requestId || req.period}</div>
              </div>
              <StatusBadge status={req.workflowStatus || req.submissionStatus} type="verification" size="sm" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}