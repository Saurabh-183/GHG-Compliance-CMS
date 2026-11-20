'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { BrsrDataCategory, BrsrRequestTemplate } from '@/lib/brsrRequestTemplates';
import { BRSR_CATEGORY_LABELS, BRSR_REQUEST_TEMPLATES } from '@/lib/brsrRequestTemplates';
import type { IDataRequirement, IFacility } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataRequestStatsBar, type RequestStats } from '@/components/requests/DataRequestStatsBar';
import { DataRequestCard } from '@/components/requests/DataRequestCard';
import { resolveDataCategoryLabel, matchesQuickFilter } from '@/lib/dataRequestDisplay';
import { notify } from '@/lib/notify';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import {
  Building2,
  Filter,
  LayoutGrid,
  List,
  Loader2,
  Save,
  Search,
  Send,
  Sparkles,
  Table2,
} from 'lucide-react';

type Tab = 'create' | 'track';

export function ConsultantDataRequestManager({
  selectedFacilityId,
  onFacilityChange,
}: {
  selectedFacilityId: string;
  onFacilityChange: (id: string) => void;
}) {
  const [templates] = useState<BrsrRequestTemplate[]>(BRSR_REQUEST_TEMPLATES);
  const [facilities, setFacilities] = useState<IFacility[]>([]);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [stats, setStats] = useState<RequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<Tab>('create');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [facilityIds, setFacilityIds] = useState<string[]>([]);
  const [period, setPeriod] = useState(DEFAULT_CHECKLIST_PERIOD);
  const [dueDate, setDueDate] = useState('');
  const [reportingMonths, setReportingMonths] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<BrsrDataCategory | 'ALL'>('ALL');
  const [templateSearch, setTemplateSearch] = useState('');
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [trackSearch, setTrackSearch] = useState('');
  const [trackQuick, setTrackQuick] = useState<string>('all');
  const [trackView, setTrackView] = useState<'cards' | 'table'>('cards');
  const [trackFacility, setTrackFacility] = useState('ALL');
  const [trackPeriod, setTrackPeriod] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFacilityId) params.set('facilityId', selectedFacilityId);
      const statsParams = new URLSearchParams();
      if (selectedFacilityId) statsParams.set('facilityId', selectedFacilityId);

      const [facilityRes, reqRes, statsRes] = await Promise.all([
        fetch('/api/facilities'),
        fetch(`/api/requirements?${params.toString()}`, { cache: 'no-store' }),
        fetch(`/api/requirements/stats?${statsParams.toString()}`, { cache: 'no-store' }),
      ]);
      const facilityJson = await facilityRes.json();
      const reqJson = await reqRes.json();
      const statsJson = await statsRes.json();
      if (facilityRes.ok) setFacilities(facilityJson.data || []);
      if (reqRes.ok) setRequirements(Array.isArray(reqJson.data) ? reqJson.data : []);
      if (statsRes.ok) setStats(statsJson.data);
    } catch (error) {
      console.error(error);
      notify.error('Could not load request management data');
    } finally {
      setLoading(false);
    }
  }, [selectedFacilityId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedFacilityId && facilityIds.length === 0) {
      setFacilityIds([selectedFacilityId]);
    }
  }, [selectedFacilityId, facilityIds.length]);

  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchCat = categoryFilter === 'ALL' || t.dataCategory === categoryFilter;
      const q = templateSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        `${t.title} ${t.description} ${BRSR_CATEGORY_LABELS[t.dataCategory]}`.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [templates, categoryFilter, templateSearch]);

  const previewTemplate = templates.find((t) => t.id === previewTemplateId);

  const periods = useMemo(
    () => [...new Set(requirements.map((r) => r.period))].sort(),
    [requirements]
  );

  const tracked = useMemo(() => {
    return requirements.filter((req) => {
      const haystack = `${req.requestId} ${req.title} ${req.facilityId} ${req.facilityName} ${resolveDataCategoryLabel(req)}`.toLowerCase();
      const q = trackSearch.trim().toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (trackFacility !== 'ALL' && req.facilityId !== trackFacility) return false;
      if (trackPeriod !== 'ALL' && req.period !== trackPeriod) return false;
      if (trackQuick !== 'all' && !matchesQuickFilter(req, trackQuick)) return false;
      return true;
    });
  }, [requirements, trackSearch, trackFacility, trackPeriod, trackQuick]);

  const toggleTemplate = (id: string) => {
    setSelectedTemplateIds((c) => (c.includes(id) ? c.filter((t) => t !== id) : [...c, id]));
    setPreviewTemplateId(id);
  };

  const toggleFacility = (facilityId: string) => {
    setFacilityIds((c) =>
      c.includes(facilityId) ? c.filter((f) => f !== facilityId) : [...c, facilityId]
    );
  };

  const createFromSelection = async (saveAsDraft: boolean) => {
    if (facilityIds.length === 0) {
      notify.error('Select at least one facility.');
      return;
    }
    const selected = templates.filter((t) => selectedTemplateIds.includes(t.id));
    if (selected.length === 0) {
      notify.error('Select at least one BRSR template.');
      return;
    }

    setSubmitting(true);
    try {
      for (const template of selected) {
        const months = reportingMonths.split(',').map((m) => m.trim()).filter(Boolean);
        const res = await fetch('/api/requirements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            facilityId: facilityIds[0],
            facilityIds: facilityIds.slice(1),
            period,
            title: template.title,
            description: template.description,
            purpose: template.purpose,
            category: 'COMPLIANCE_SPECIFIC',
            linkedCompliances: template.suggestedCompliances,
            dataCategory: template.dataCategory,
            templateId: template.id,
            brsrSection: template.brsrSection,
            brsrPrinciple: template.brsrPrinciple,
            requiredFields: template.requiredFields,
            requiredDocuments: template.requiredDocuments,
            submissionInstructions: template.submissionInstructions,
            monthlyFrequency: template.monthlyFrequency,
            reportingMonths: template.monthlyFrequency ? months : undefined,
            dueDate: dueDate || undefined,
            saveAsDraft,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Create failed');
      }
      notify.success(saveAsDraft ? 'Draft saved for client review.' : 'Requests sent to client portal.');
      setSelectedTemplateIds([]);
      setTab('track');
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Failed to create requests');
    } finally {
      setSubmitting(false);
    }
  };

  const sendDraft = async (req: IDataRequirement) => {
    try {
      const res = await fetch(`/api/requirements/${req._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SEND_TO_CLIENT' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Send failed');
      notify.success('Request sent to client.');
      await load();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Send failed');
    }
  };

  if (loading) return <CarbonCrunchLoader message="Loading data request workspace…" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <label className="text-[10px] font-bold uppercase text-slate-500">Scope facility</label>
          <select
            value={selectedFacilityId}
            onChange={(e) => {
              onFacilityChange(e.target.value);
              setTrackFacility(e.target.value || 'ALL');
            }}
            className="mt-1 w-full sm:w-72 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm font-medium text-slate-900 dark:text-white shadow-sm"
          >
            <option value="">All assigned facilities</option>
            {facilities.map((f) => (
              <option key={f.facilityId} value={f.facilityId}>
                {f.name} ({f.facilityId})
              </option>
            ))}
          </select>
        </div>
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setTab('create')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'create' ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-800 dark:text-emerald-300' : 'text-slate-600'}`}
          >
            <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
            Create requests
          </button>
          <button
            type="button"
            onClick={() => setTab('track')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${tab === 'track' ? 'bg-white dark:bg-slate-900 shadow-sm text-emerald-800 dark:text-emerald-300' : 'text-slate-600'}`}
          >
            <Table2 className="w-3.5 h-3.5 inline mr-1.5" />
            Track & send ({requirements.length})
          </button>
        </div>
      </div>

      <DataRequestStatsBar
        stats={stats}
        totalFallback={requirements.length}
        activeQuickFilter={trackQuick}
        onQuickFilter={(key) => {
          setTrackQuick(key);
          setTab('track');
        }}
      />

      {tab === 'create' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="xl:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-50/80 to-transparent dark:from-emerald-950/30">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">BRSR request templates</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Each template becomes one independent request per facility.</p>
            </div>

            <div className="p-4 space-y-3 border-b border-slate-100 dark:border-slate-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="Search templates…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${categoryFilter === 'ALL' ? 'bg-emerald-700 text-white border-emerald-600' : 'border-slate-300 dark:border-slate-600'}`}
                >
                  All
                </button>
                {(Object.keys(BRSR_CATEGORY_LABELS) as BrsrDataCategory[]).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border truncate max-w-[140px] ${
                      categoryFilter === cat
                        ? 'bg-emerald-700 text-white border-emerald-600'
                        : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {BRSR_CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto">
              {filteredTemplates.map((template) => {
                const selected = selectedTemplateIds.includes(template.id);
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => toggleTemplate(template.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      selected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/25 ring-1 ring-emerald-500/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                      {BRSR_CATEGORY_LABELS[template.dataCategory]}
                    </span>
                    <p className="mt-1 text-xs font-bold text-slate-900 dark:text-white leading-snug">{template.title}</p>
                    <p className="mt-1 text-[10px] text-slate-500 line-clamp-2">{template.description}</p>
                    <div className="mt-2 flex gap-2 text-[9px] text-slate-400">
                      <span>{template.requiredFields.length} fields</span>
                      <span>{template.requiredDocuments.length} docs</span>
                      {template.monthlyFrequency && <span>Monthly</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4 shadow-sm">
              <h4 className="text-xs font-bold uppercase text-slate-500">Assignment</h4>
              <label className="block text-xs space-y-1">
                Reporting period
                <input value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
              </label>
              <label className="block text-xs space-y-1">
                Due date
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border px-3 py-2 dark:bg-slate-950" />
              </label>
              <label className="block text-xs space-y-1">
                Reporting months (if monthly template)
                <input
                  value={reportingMonths}
                  onChange={(e) => setReportingMonths(e.target.value)}
                  placeholder="2025-04, 2025-05"
                  className="w-full rounded-lg border px-3 py-2 font-mono text-[11px] dark:bg-slate-950"
                />
              </label>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-500 mb-2 flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> Target facilities
                </p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {facilities.map((f) => (
                    <button
                      key={f.facilityId}
                      type="button"
                      onClick={() => toggleFacility(f.facilityId)}
                      className={`px-2 py-1.5 rounded-lg text-[10px] border text-left ${
                        facilityIds.includes(f.facilityId)
                          ? 'bg-emerald-700 text-white border-emerald-600'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      <span className="font-semibold block">{f.name}</span>
                      <span className="font-mono opacity-80">{f.facilityId}</span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-slate-500">
                Selected: {selectedTemplateIds.length} template(s) × {facilityIds.length} facility(ies) ={' '}
                <strong>{selectedTemplateIds.length * facilityIds.length}</strong> request records
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void createFromSelection(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Send to client portal
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void createFromSelection(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 border rounded-xl text-xs font-bold"
                >
                  <Save className="w-4 h-4" /> Save as draft
                </button>
              </div>
            </section>

            {previewTemplate && (
              <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 text-[11px] space-y-2 max-h-64 overflow-y-auto">
                <p className="font-bold text-slate-900 dark:text-white">{previewTemplate.title}</p>
                <p className="text-slate-600 dark:text-slate-400">{previewTemplate.purpose}</p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">Fields preview</p>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-600 dark:text-slate-400">
                  {previewTemplate.requiredFields.slice(0, 6).map((f) => (
                    <li key={f.key}>
                      {f.label}
                      {f.required ? ' *' : ''}
                    </li>
                  ))}
                  {previewTemplate.requiredFields.length > 6 && (
                    <li>+{previewTemplate.requiredFields.length - 6} more…</li>
                  )}
                </ul>
              </section>
            )}
          </aside>
        </div>
      )}

      {tab === 'track' && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={trackSearch}
                onChange={(e) => setTrackSearch(e.target.value)}
                placeholder="Search requests, facility, category…"
                className="w-full pl-9 py-2.5 rounded-xl border text-xs dark:bg-slate-950"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select value={trackFacility} onChange={(e) => setTrackFacility(e.target.value)} className="rounded-lg border text-xs px-2 py-2 dark:bg-slate-950">
                <option value="ALL">All facilities</option>
                {facilities.map((f) => (
                  <option key={f.facilityId} value={f.facilityId}>
                    {f.name}
                  </option>
                ))}
              </select>
              <select value={trackPeriod} onChange={(e) => setTrackPeriod(e.target.value)} className="rounded-lg border text-xs px-2 py-2 dark:bg-slate-950">
                <option value="ALL">All periods</option>
                {periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <TrackViewToggle view={trackView} onChange={setTrackView} />
            </div>
          </div>

          {trackView === 'cards' ? (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tracked.map((req) => (
                <DataRequestCard
                  key={req._id}
                  requirement={req}
                  href="/data-review"
                  primaryActionLabel={req.workflowStatus === 'DRAFT' ? 'Send to client' : undefined}
                  onPrimaryAction={
                    req.workflowStatus === 'DRAFT' ? () => void sendDraft(req) : undefined
                  }
                />
              ))}
              {tracked.length === 0 && (
                <p className="col-span-full py-12 text-center text-sm text-slate-500">No requests match filters.</p>
              )}
            </div>
          ) : (
            <RequestsTable requirements={tracked} onSendDraft={sendDraft} />
          )}
        </section>
      )}
    </div>
  );
}

function TrackViewToggle({
  view,
  onChange,
}: {
  view: 'cards' | 'table';
  onChange: (v: 'cards' | 'table') => void;
}) {
  return (
    <div className="inline-flex border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`px-2 py-2 ${view === 'cards' ? 'bg-emerald-700 text-white' : 'bg-white dark:bg-slate-900'}`}
        title="Card view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`px-2 py-2 ${view === 'table' ? 'bg-emerald-700 text-white' : 'bg-white dark:bg-slate-900'}`}
        title="Table view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

function RequestsTable({
  requirements,
  onSendDraft,
}: {
  requirements: IDataRequirement[];
  onSendDraft: (req: IDataRequirement) => void;
}) {
  return (
    <table className="w-full text-xs text-left">
      <thead>
        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500">
          <th className="p-3">Request</th>
          <th className="p-3">Organization / facility</th>
          <th className="p-3">BRSR category</th>
          <th className="p-3">Period</th>
          <th className="p-3">Due</th>
          <th className="p-3">Consultant</th>
          <th className="p-3">Status</th>
          <th className="p-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
        {requirements.map((req) => (
          <tr key={req._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
            <td className="p-3">
              <div className="font-semibold text-slate-900 dark:text-white max-w-[200px]">{req.title}</div>
              <div className="font-mono text-[10px] text-emerald-700">{req.requestId}</div>
            </td>
            <td className="p-3">
              <div className="font-semibold">{req.facilityName || req.facilityId}</div>
              <div className="font-mono text-[10px] text-slate-500">{req.facilityId}</div>
              {req.clientGroupName && <div className="text-[10px] text-slate-400">{req.clientGroupName}</div>}
            </td>
            <td className="p-3 text-slate-700 dark:text-slate-300 max-w-[120px]">{resolveDataCategoryLabel(req)}</td>
            <td className="p-3 font-mono">{req.period}</td>
            <td className="p-3 whitespace-nowrap">{req.dueDate ? formatDate(req.dueDate) : '—'}</td>
            <td className="p-3">{req.requestedByName || '—'}</td>
            <td className="p-3">
              <StatusBadge status={req.workflowStatus || 'REQUESTED'} type="verification" size="sm" />
            </td>
            <td className="p-3 text-right">
              {req.workflowStatus === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => onSendDraft(req)}
                  className="px-2 py-1 rounded-md bg-emerald-700 text-white font-bold text-[10px]"
                >
                  Send
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}