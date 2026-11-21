'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Save, Send } from 'lucide-react';
import type { ComplianceType, IFacilityApplicableRequirement } from '@/types';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { masterRowsByCategory } from '@/lib/dataRequirementMaster';
import { notify } from '@/lib/notify';
import { generateMonthRange, financialYearOptions } from '@/lib/dataRequestCategories';

const COMPLIANCE_OPTIONS: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];

interface ChecklistDrivenRequestWizardProps {
  facilityId: string;
  facilityName?: string;
  period?: string;
  onSent?: () => void;
  onPeriodChange?: (period: string) => void;
}

function applicabilityBadge(row: IFacilityApplicableRequirement) {
  if (row.needsVerification) return 'bg-violet-100 text-violet-900 border-violet-300';
  if (row.applicability === 'NOT_APPLICABLE' || row.applicability === 'NOT_REQUIRED')
    return 'bg-slate-100 text-slate-600 border-slate-300';
  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
}

export function ChecklistDrivenRequestWizard({
  facilityId,
  facilityName,
  period: defaultPeriod = DEFAULT_CHECKLIST_PERIOD,
  onSent,
  onPeriodChange,
}: ChecklistDrivenRequestWizardProps) {
  const [period, setPeriod] = useState(defaultPeriod);

  useEffect(() => {
    setPeriod(defaultPeriod);
  }, [defaultPeriod]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requirements, setRequirements] = useState<IFacilityApplicableRequirement[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bundleTitle, setBundleTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [purpose, setPurpose] = useState('Operational data collection per published client checklist.');
  const [dueDate, setDueDate] = useState('');
  const [linkedCompliances, setLinkedCompliances] = useState<ComplianceType[]>(['RCO', 'PAT']);
  const [reportingPeriodStart, setReportingPeriodStart] = useState('2025-04');
  const [reportingPeriodEnd, setReportingPeriodEnd] = useState('2026-03');
  const [showPreview, setShowPreview] = useState(false);

  const monthOptions = useMemo(
    () => generateMonthRange(reportingPeriodStart, reportingPeriodEnd),
    [reportingPeriodStart, reportingPeriodEnd]
  );
  const [selectedMonths, setSelectedMonths] = useState<string[]>(monthOptions);

  useEffect(() => {
    setSelectedMonths(monthOptions);
  }, [monthOptions]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({ period });
      if (facilityName) q.set('facilityName', facilityName);
      const res = await fetch(`/api/facilities/${facilityId}/applicable-requirements?${q}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load checklist');
      const rows = (json.data?.requirements || []) as IFacilityApplicableRequirement[];
      setRequirements(rows);
      const preselect = rows.filter((r) => r.requestable && !r.needsVerification).map((r) => r.master.itemKey);
      setSelected(new Set(preselect));
      setBundleTitle((prev) =>
        prev.trim()
          ? prev
          : `Operational data request — ${facilityName || facilityId} (${period})`
      );
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Unable to load applicable requirements');
    } finally {
      setLoading(false);
    }
  }, [facilityId, facilityName, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = masterRowsByCategory();
    return Object.entries(map).map(([cat, masters]) => ({
      categoryKey: cat,
      categoryLabel: masters[0] ? requirements.find((r) => r.master.category === cat)?.master.categoryLabel || cat : cat,
      rows: requirements.filter((r) => r.master.category === cat),
    }));
  }, [requirements]);

  const toggleCategory = (keys: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        const row = requirements.find((r) => r.master.itemKey === key);
        if (!row?.requestable || row.needsVerification) continue;
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const submit = async (saveAsDraft: boolean) => {
    const itemKeys = [...selected];
    if (!itemKeys.length) {
      notify.error('Select at least one applicable requirement.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/requirements/bulk-checklist', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityId,
          period,
          itemKeys,
          bundleTitle,
          purpose,
          instructions,
          dueDate: dueDate || undefined,
          linkedCompliances,
          reportingPeriodStart,
          reportingPeriodEnd,
          selectedMonths,
          saveAsDraft,
          notifyClient: !saveAsDraft,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Send failed');
      notify.success(json.message || 'Request saved');
      onSent?.();
      if (!saveAsDraft) void load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Unable to send request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading checklist-driven requirements…
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900/60">
      <header>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Checklist-driven data request</h2>
        <p className="mt-1 text-xs text-slate-500">
          Requirements load from the Data Requirement Master for{' '}
          <span className="font-semibold">{facilityName || facilityId}</span>. Only applicable items can be sent;
          items needing verification are highlighted.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <label className="text-xs">
          <span className="mb-1 block font-semibold text-slate-600">Reporting year</span>
          <select
            value={period}
            onChange={(e) => {
              const next = e.target.value;
              setPeriod(next);
              onPeriodChange?.(next);
            }}
            className="w-full rounded-lg border px-2 py-1.5"
          >
            {financialYearOptions().map((fy) => (
              <option key={fy} value={`FY${fy}`}>{`FY${fy}`}</option>
            ))}
          </select>
        </label>
        <label className="text-xs md:col-span-2">
          <span className="mb-1 block font-semibold text-slate-600">Request title</span>
          <input
            value={bundleTitle}
            onChange={(e) => setBundleTitle(e.target.value)}
            className="w-full rounded-lg border px-2 py-1.5"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block font-semibold text-slate-600">Due date</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-lg border px-2 py-1.5" />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
          {grouped.map((group) => {
            const selectable = group.rows.filter((r) => r.requestable && !r.needsVerification);
            const allOn = selectable.length > 0 && selectable.every((r) => selected.has(r.master.itemKey));
            return (
              <div key={group.categoryKey} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{group.categoryLabel}</h3>
                  <button
                    type="button"
                    className="text-[10px] font-semibold text-emerald-700"
                    onClick={() => toggleCategory(selectable.map((r) => r.master.itemKey), !allOn)}
                  >
                    {allOn ? 'Clear category' : 'Select category'}
                  </button>
                </div>
                <ul className="space-y-2">
                  {group.rows.map((row) => {
                    const disabled = !row.requestable || row.needsVerification;
                    const checked = selected.has(row.master.itemKey);
                    return (
                      <li key={row.master.itemKey} className="rounded border p-2 text-xs">
                        <label className={`flex gap-2 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            disabled={disabled}
                            checked={checked}
                            onChange={() =>
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (next.has(row.master.itemKey)) next.delete(row.master.itemKey);
                                else next.add(row.master.itemKey);
                                return next;
                              })
                            }
                          />
                          <span className="flex-1">
                            <span className="font-semibold text-slate-900 dark:text-white">{row.master.name}</span>
                            <span className={`ml-2 rounded border px-1 py-0.5 text-[9px] ${applicabilityBadge(row)}`}>
                              {row.needsVerification ? 'Needs verification' : row.applicability.replaceAll('_', ' ')}
                            </span>
                            <div className="mt-0.5 text-[10px] text-slate-500">{row.master.requiredEvidence}</div>
                            {row.master.specialInstructions && (
                              <div className="mt-0.5 text-[10px] text-amber-800">{row.master.specialInstructions}</div>
                            )}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="space-y-3 text-xs">
          <label className="block">
            <span className="mb-1 block font-semibold">Purpose</span>
            <textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} rows={3} className="w-full rounded-lg border px-2 py-1.5" />
          </label>
          <label className="block">
            <span className="mb-1 block font-semibold">Instructions for client</span>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={4} className="w-full rounded-lg border px-2 py-1.5" />
          </label>
          <div>
            <span className="mb-1 block font-semibold">Linked frameworks</span>
            <div className="flex flex-wrap gap-2">
              {COMPLIANCE_OPTIONS.map((c) => (
                <label key={c} className="inline-flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={linkedCompliances.includes(c)}
                    onChange={(e) =>
                      setLinkedCompliances((prev) =>
                        e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)
                      )
                    }
                  />
                  {c}
                </label>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-500">{selected.size} requirement(s) selected</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-semibold"
            >
              <Eye className="h-3.5 w-3.5" /> Preview
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit(true)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-semibold"
            >
              <Save className="h-3.5 w-3.5" /> Save draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit(false)}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 font-semibold text-white"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send to client
            </button>
          </div>
        </div>
      </div>

      {showPreview && (
        <div className="rounded-lg border bg-slate-50 p-4 text-xs dark:bg-slate-950">
          <h4 className="font-bold">Client preview — {bundleTitle}</h4>
          <ul className="mt-2 list-disc pl-5">
            {[...selected].map((key) => {
              const row = requirements.find((r) => r.master.itemKey === key);
              return <li key={key}>{row?.master.name}</li>;
            })}
          </ul>
        </div>
      )}
    </section>
  );
}