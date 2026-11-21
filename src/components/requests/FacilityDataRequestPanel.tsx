'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Save, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type {
  ComplianceType,
  IDataRequirement,
  IFacility,
  IFacilityApplicableRequirement,
  IClientGroup,
  IRequestDocumentSpec,
  IRequestField,
  ReportingFrequency,
} from '@/types';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { getMasterRequirement } from '@/lib/dataRequirementMaster';
import { StatusBadge } from '@/components/common/StatusBadge';
import { notify } from '@/lib/notify';
import { FormSection } from '@/components/requests/FormSection';
import { DynamicFieldBuilder } from '@/components/requests/DynamicFieldBuilder';
import { DocumentRequirementsBuilder } from '@/components/requests/DocumentRequirementsBuilder';
import { RequestFormPreview } from '@/components/requests/RequestFormPreview';
import {
  REPORTING_FREQUENCIES,
  financialYearOptions,
  generateMonthRange,
  suggestRequestTitle,
} from '@/lib/dataRequestCategories';
import { validateFields } from '@/lib/requestFieldUtils';
import {
  DEFAULT_SUBMISSION_FORMAT,
  normalizeDocumentSpecsForDriveXlsx,
} from '@/lib/submissionPolicy';

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
  const [organizations, setOrganizations] = useState<IClientGroup[]>([]);
  const [organizationId, setOrganizationId] = useState('');
  const [checklistRows, setChecklistRows] = useState<IFacilityApplicableRequirement[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [selectedChecklistKey, setSelectedChecklistKey] = useState('');
  const [facilityId, setFacilityId] = useState(initialFacilityId);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: false, 4: false, 5: false });
  const [showPreview, setShowPreview] = useState(false);

  const [title, setTitle] = useState('');
  const [dataCategory, setDataCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [period, setPeriod] = useState(defaultPeriod);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [linkedCompliances, setLinkedCompliances] = useState<ComplianceType[]>(['PAT', 'RCO']);

  const [fields, setFields] = useState<IRequestField[]>([]);
  const [documents, setDocuments] = useState<IRequestDocumentSpec[]>([]);

  const [reportingFrequency, setReportingFrequency] = useState<ReportingFrequency>('ANNUAL');
  const [reportingPeriodStart, setReportingPeriodStart] = useState('');
  const [reportingPeriodEnd, setReportingPeriodEnd] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const submissionFormat = DEFAULT_SUBMISSION_FORMAT;

  const [purpose, setPurpose] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [allowPartialSubmission, setAllowPartialSubmission] = useState(true);
  const [notifyClient, setNotifyClient] = useState(true);
  const [clientContact, setClientContact] = useState('');

  const selectedFacility = facilities.find((f) => f.facilityId === facilityId);
  const selectedOrganization = organizations.find((o) => o._id === organizationId);
  const orgName = selectedOrganization?.name || selectedFacility?.clientGroupName || 'Organization';

  const facilitiesInOrg = useMemo(() => {
    if (!organizationId) return facilities;
    return facilities.filter((f) => f.clientGroupId === organizationId);
  }, [facilities, organizationId]);

  const fyOptions = useMemo(() => financialYearOptions(), []);

  const monthOptions = useMemo(() => {
    if (reportingPeriodStart && reportingPeriodEnd) {
      return generateMonthRange(reportingPeriodStart, reportingPeriodEnd);
    }
    return [];
  }, [reportingPeriodStart, reportingPeriodEnd]);

  const checklistByCategory = useMemo(() => {
    const map = new Map<string, IFacilityApplicableRequirement[]>();
    for (const row of checklistRows) {
      const label = row.master.categoryLabel;
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [checklistRows]);

  const existingCustomCategories = useMemo(() => {
    const fromReqs = new Set(
      requirements.map((r) => r.dataCategory?.trim()).filter(Boolean) as string[]
    );
    return [...fromReqs].filter(
      (c) => !checklistRows.some((row) => row.master.categoryLabel === c || row.master.name === c)
    );
  }, [requirements, checklistRows]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgRes, facRes, reqRes] = await Promise.all([
        fetch('/api/client-groups', { credentials: 'include' }),
        fetch('/api/facilities', { credentials: 'include' }),
        fetch(`/api/requirements?facilityId=${facilityId}&period=${encodeURIComponent(period)}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
      ]);
      const orgJson = await orgRes.json();
      const facJson = await facRes.json();
      const reqJson = await reqRes.json();
      if (orgRes.ok) setOrganizations(orgJson.data || []);
      if (facRes.ok) {
        const list: IFacility[] = facJson.data || [];
        setFacilities(list);
        const current = list.find((f) => f.facilityId === facilityId);
        if (current?.clientGroupId) {
          setOrganizationId((prev) => prev || current.clientGroupId);
        }
      }
      if (reqRes.ok) setRequirements(Array.isArray(reqJson.data) ? reqJson.data : []);
    } catch (e) {
      console.error(e);
      notify.error('Could not load request context');
    } finally {
      setLoading(false);
    }
  }, [facilityId, period]);

  const loadChecklist = useCallback(async () => {
    if (!facilityId) return;
    setChecklistLoading(true);
    try {
      const q = new URLSearchParams({ period });
      if (selectedFacility?.name) q.set('facilityName', selectedFacility.name);
      const res = await fetch(`/api/facilities/${facilityId}/applicable-requirements?${q}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json();
      if (res.ok) {
        setChecklistRows(Array.isArray(json.data?.requirements) ? json.data.requirements : []);
      }
    } catch {
      setChecklistRows([]);
    } finally {
      setChecklistLoading(false);
    }
  }, [facilityId, period, selectedFacility?.name]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadChecklist();
  }, [loadChecklist]);

  useEffect(() => {
    setFacilityId(initialFacilityId);
  }, [initialFacilityId]);

  useEffect(() => {
    if (selectedChecklistKey === '__OTHER__') return;
    if (dataCategory && !title.trim() && selectedChecklistKey) {
      setTitle(suggestRequestTitle(dataCategory, selectedFacility?.name || initialFacilityName, period));
    }
  }, [dataCategory, selectedFacility?.name, initialFacilityName, period, title, selectedChecklistKey]);

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

  const applyChecklistSelection = (itemKey: string) => {
    setSelectedChecklistKey(itemKey);
    if (itemKey === '__OTHER__') {
      setDataCategory(customCategory);
      setTitle('');
      setPurpose('');
      setInstructions('');
      setFields([]);
      setDocuments([]);
      setOpenSections({ 1: true, 2: true, 3: false, 4: true, 5: false });
      return;
    }
    if (itemKey.startsWith('__EXISTING__::')) {
    const label = itemKey.replace('__EXISTING__::', '');
    setDataCategory(label);
    setTitle(suggestRequestTitle(label, selectedFacility?.name || initialFacilityName, period));
    const prior = requirements.find((r) => r.dataCategory === label || r.title === label);
    if (prior) {
      setPurpose(prior.purpose || '');
      setInstructions(prior.submissionInstructions || prior.description || '');
      setFields((prior.requiredFields || []).map((f) => ({ ...f })));
      setDocuments(normalizeDocumentSpecsForDriveXlsx(prior.requiredDocumentSpecs || []));
      setReportingFrequency((prior.reportingFrequency as ReportingFrequency) || 'ANNUAL');
    }
    setOpenSections({ 1: true, 2: true, 3: true, 4: true, 5: false });
      return;
    }

    const master = getMasterRequirement(itemKey);
    const row = checklistRows.find((r) => r.master.itemKey === itemKey);
    if (!master) return;

    if (row && (row.needsVerification || !row.requestable)) {
      notify.error('This requirement needs admin applicability verification before sending.');
      setSelectedChecklistKey('');
      return;
    }

    setDataCategory(row?.master.categoryLabel || master.category);
    setTitle(master.name);
    setPurpose(master.description);
    setInstructions(
      [master.description, master.specialInstructions ? `Note: ${master.specialInstructions}` : '']
        .filter(Boolean)
        .join('\n\n')
    );
    setFields((master.structuredFields || []).map((f) => ({ ...f })));
    setDocuments(normalizeDocumentSpecsForDriveXlsx(master.documentSpecs || []));
    setReportingFrequency((master.reportingFrequency as ReportingFrequency) || 'ANNUAL');
    setLinkedCompliances(master.defaultCompliances);
    setOpenSections({ 1: true, 2: Boolean(master.structuredFields?.length), 3: true, 4: true, 5: false });
    notify.success(`Loaded checklist fields for “${master.name}”.`);
  };

  const handleOrganizationChange = (orgId: string) => {
    setOrganizationId(orgId);
    const inOrg = facilities.filter((f) => f.clientGroupId === orgId);
    if (inOrg.length > 0 && !inOrg.some((f) => f.facilityId === facilityId)) {
      setFacilityId(inOrg[0].facilityId);
    }
    setSelectedChecklistKey('');
  };

  const validateClient = (): boolean => {
    if (!organizationId || !facilityId) {
      notify.error('Select organization and facility.');
      return false;
    }
    if (!title.trim()) {
      notify.error('Request title is required.');
      return false;
    }
    if (!selectedChecklistKey) {
      notify.error('Select a data requirement from the checklist.');
      return false;
    }
    if (selectedChecklistKey === '__OTHER__' && !customCategory.trim() && !dataCategory.trim()) {
      notify.error('Enter a name for the Other category.');
      return false;
    }
    if (!dataCategory.trim() && selectedChecklistKey !== '__OTHER__') {
      notify.error('Data category is missing — re-select a checklist requirement.');
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
    if (!dueDate.trim()) {
      notify.error('Client submission due date is required.');
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
    dataCategory: selectedChecklistKey === '__OTHER__' ? customCategory.trim() || dataCategory : dataCategory,
    sourceChecklistItemKey:
      selectedChecklistKey && !selectedChecklistKey.startsWith('__') ? selectedChecklistKey : undefined,
    masterRequirementId: getMasterRequirement(selectedChecklistKey)?.requirementId,
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
      setCustomCategory('');
      setSelectedChecklistKey('');
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

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(false);
        }}
      >
        <FormSection
          step={1}
          title="Request details"
          subtitle="Organization, facility, FY, checklist — and client submission due date"
          open={!!openSections[1]}
          onToggle={() => toggleSection(1)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Organization</span>
              <select
                value={organizationId}
                onChange={(e) => handleOrganizationChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select organization</option>
                {organizations.map((org) => (
                  <option key={org._id} value={org._id}>
                    {org.name} {org.code ? `(${org.code})` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Facility / unit</span>
              <select
                value={facilityId}
                disabled={!organizationId}
                onChange={(e) => {
                  setFacilityId(e.target.value);
                  setSelectedChecklistKey('');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950"
              >
                {facilitiesInOrg.length === 0 && <option value="">No facilities in this organization</option>}
                {facilitiesInOrg.map((f) => (
                  <option key={f.facilityId} value={f.facilityId}>
                    {f.name} · {f.facilityId}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-500">{facilitiesInOrg.length} unit(s) under {orgName}</p>
            </label>
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Reporting financial year</span>
              <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-lg border px-3 py-2.5 dark:bg-slate-950">
                {fyOptions.map((fy) => (
                  <option key={fy} value={`FY${fy}`}>
                    FY {fy}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                Data requirement (checklist)
              </span>
              <select
                value={selectedChecklistKey}
                disabled={checklistLoading || !facilityId}
                onChange={(e) => applyChecklistSelection(e.target.value)}
                className="w-full rounded-lg border border-emerald-200 bg-emerald-50/40 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/20"
              >
                <option value="">
                  {checklistLoading ? 'Loading checklist…' : 'Select requirement for this facility'}
                </option>
                {checklistByCategory.map(([cat, rows]) => (
                  <optgroup key={cat} label={cat}>
                    {rows.map((row) => (
                      <option
                        key={row.master.itemKey}
                        value={row.master.itemKey}
                        disabled={row.needsVerification || (!row.requestable && row.applicability !== 'APPLICABLE')}
                      >
                        {row.master.name}
                        {row.needsVerification ? ' — needs verification' : ''}
                        {row.applicability === 'NOT_REQUIRED' || row.applicability === 'NOT_APPLICABLE'
                          ? ' — N/A'
                          : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
                {existingCustomCategories.length > 0 && (
                  <optgroup label="Existing custom requests">
                    {existingCustomCategories.map((c) => (
                      <option key={c} value={`__EXISTING__::${c}`}>
                        {c} (reuse fields)
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="__OTHER__">Other — custom requirement (manual fields)</option>
              </select>
            </label>
            {selectedChecklistKey === '__OTHER__' && (
              <label className="space-y-1 md:col-span-2">
                <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Other category name</span>
                <input
                  value={customCategory}
                  onChange={(e) => {
                    setCustomCategory(e.target.value);
                    setDataCategory(e.target.value);
                  }}
                  placeholder="e.g. Special audit dataset"
                  className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950"
                />
              </label>
            )}
            <label className="space-y-1 md:col-span-2">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">Request title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
            </label>
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
            <label className="space-y-1">
              <span className="font-bold text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                Client submission due date <span className="text-rose-600">*</span>
              </span>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-emerald-200 px-3 py-2.5 dark:border-emerald-900 dark:bg-slate-950"
              />
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Appears on client Data Requests and the compliance calendar. Extend from the calendar if the client needs more time.
              </p>
            </label>
          </div>
        </FormSection>

        <FormSection
          step={2}
          title="Required information"
          subtitle={
            selectedChecklistKey && selectedChecklistKey !== '__OTHER__'
              ? 'Pre-filled from checklist — adjust if needed'
              : 'Build fields for your custom requirement'
          }
          open={!!openSections[2]}
          onToggle={() => toggleSection(2)}
        >
          {!selectedChecklistKey ? (
            <p className="text-xs text-slate-500 rounded-lg border border-dashed p-4">
              Select a checklist requirement above to load structured fields, or choose Other to add fields manually.
            </p>
          ) : (
            <DynamicFieldBuilder fields={fields} onChange={setFields} />
          )}
        </FormSection>

        <FormSection
          step={3}
          title="Reporting period & documents"
          subtitle="Google Drive link · .xlsx workbooks only"
          open={!!openSections[3]}
          onToggle={() => toggleSection(3)}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Reporting frequency</span>
              <select
                value={reportingFrequency}
                onChange={(e) => setReportingFrequency(e.target.value as ReportingFrequency)}
                className="w-full rounded-lg border px-3 py-2.5 dark:bg-slate-950"
              >
                {REPORTING_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Submission format</span>
              <div className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                {submissionFormat}
              </div>
              <p className="text-[10px] text-slate-500">Client uploads <strong>.xlsx</strong> to Drive and pastes the share link.</p>
            </div>
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
              <textarea rows={3} value={purpose} onChange={(e) => setPurpose(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" placeholder="Why this data is required for compliance…" />
            </label>
            <label className="block space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Instructions for client</span>
              <textarea
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950"
                placeholder="Upload .xlsx to Google Drive, grant consultant view access, paste the share link. Note any missing months…"
              />
            </label>
          </div>
        </FormSection>

        <FormSection step={5} title="Assignment & delivery" subtitle="Consultant assignment, client contact, notifications" open={!!openSections[5]} onToggle={() => toggleSection(5)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Assigned consultant</span>
              <input readOnly value={currentUser?.name || 'Consultant'} className="w-full rounded-lg border px-3 py-2 bg-slate-100 dark:bg-slate-800" />
            </label>
            <label className="space-y-1">
              <span className="font-bold uppercase text-[10px] text-slate-500">Client contact (optional)</span>
              <input value={clientContact} onChange={(e) => setClientContact(e.target.value)} placeholder="Name or email" className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
            </label>
            {dueDate ? (
              <p className="md:col-span-2 text-[11px] text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 px-3 py-2">
                Client due date:{' '}
                <strong className="font-mono">
                  {new Date(`${dueDate}T12:00:00`).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </strong>{' '}
                (edit in Request details above)
              </p>
            ) : null}
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