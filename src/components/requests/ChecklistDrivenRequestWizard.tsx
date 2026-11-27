'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Save, Send, X } from 'lucide-react';
import { Select, MenuItem, FormControl, TextField, Checkbox } from '@mui/material';
import { MuiDatePicker } from '@/components/common/MuiDatePicker';
import { useAuth } from '@/context/AuthContext';
import type { ComplianceType, IFacilityApplicableRequirement } from '@/types';
import { masterRowsByCategory, getMasterRequirement } from '@/lib/dataRequirementMaster';
import { notify } from '@/lib/notify';
import { generateMonthRange, financialYearOptions } from '@/lib/dataRequestCategories';
import { getCurrentFinancialYear, normalizeFinancialYearPeriod } from '@/lib/financialYears';

interface ChecklistDrivenRequestWizardProps {
  facilityId: string;
  facilityName?: string;
  period?: string;
  initialFrameworks?: ComplianceType[];
  onSent?: () => void;
  onPeriodChange?: (period: string) => void;
}

function applicabilityBadge(row: IFacilityApplicableRequirement) {
  if (row.needsVerification) return 'bg-violet-100 text-violet-900 border-violet-300';
  if (row.applicability === 'NOT_APPLICABLE' || row.applicability === 'NOT_REQUIRED')
    return 'bg-slate-100 text-slate-600 border-slate-300';
  return 'bg-emerald-50 text-emerald-800 border-emerald-200';
}

function getRowCompliances(row: IFacilityApplicableRequirement): ComplianceType[] {
  if (row.master.defaultCompliances && row.master.defaultCompliances.length > 0) {
    return row.master.defaultCompliances;
  }
  const master = getMasterRequirement(row.master.itemKey);
  return master?.defaultCompliances || [];
}

function financialYearMonthRange(period: string): { start: string; end: string } {
  const normalized = normalizeFinancialYearPeriod(period);
  const match = normalized?.match(/^FY(20\d{2})-(\d{2})$/);
  if (!match) return { start: '2026-04', end: '2027-03' };
  const startYear = Number(match[1]);
  return {
    start: `${startYear}-04`,
    end: `${startYear + 1}-03`,
  };
}

export function ChecklistDrivenRequestWizard({
  facilityId,
  facilityName,
  period: defaultPeriod = getCurrentFinancialYear(),
  onSent,
  onPeriodChange,
}: ChecklistDrivenRequestWizardProps) {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const [period, setPeriod] = useState(normalizeFinancialYearPeriod(defaultPeriod) || getCurrentFinancialYear());

  useEffect(() => {
    setPeriod(normalizeFinancialYearPeriod(defaultPeriod) || getCurrentFinancialYear());
  }, [defaultPeriod]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requirements, setRequirements] = useState<IFacilityApplicableRequirement[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bundleTitle, setBundleTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [purpose, setPurpose] = useState('Operational data collection per published client checklist.');
  const [dueDate, setDueDate] = useState('');
  const [linkedCompliances, setLinkedCompliances] = useState<ComplianceType[]>([]);
  const [applicabilityLoading, setApplicabilityLoading] = useState(false);
  const initialMonthRange = financialYearMonthRange(period);
  const [reportingPeriodStart, setReportingPeriodStart] = useState(initialMonthRange.start);
  const [reportingPeriodEnd, setReportingPeriodEnd] = useState(initialMonthRange.end);
  const [showPreview, setShowPreview] = useState(false);


  const monthOptions = useMemo(
    () => generateMonthRange(reportingPeriodStart, reportingPeriodEnd),
    [reportingPeriodStart, reportingPeriodEnd]
  );
  const [selectedMonths, setSelectedMonths] = useState<string[]>(monthOptions);

  useEffect(() => {
    setSelectedMonths(monthOptions);
  }, [monthOptions]);

  useEffect(() => {
    const range = financialYearMonthRange(period);
    setReportingPeriodStart(range.start);
    setReportingPeriodEnd(range.end);
  }, [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setApplicabilityLoading(true);
    try {
      const [applicabilityResponse, checklistResponse] = await Promise.all([
        fetch(`/api/compliance-applicability?facilityId=${encodeURIComponent(facilityId)}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(`/api/facilities/${facilityId}/applicable-requirements?period=${encodeURIComponent(period)}${facilityName ? `&facilityName=${encodeURIComponent(facilityName)}` : ''}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
      ]);
      const applicabilityJson = await applicabilityResponse.json();
      const checklistJson = await checklistResponse.json();
      if (!applicabilityResponse.ok) throw new Error(applicabilityJson.error || 'Unable to load facility compliance settings.');
      if (!checklistResponse.ok) throw new Error(checklistJson.error || 'Failed to load checklist');

      const normalizedPeriod = normalizeFinancialYearPeriod(period);
      const allowed = [...new Set((applicabilityJson.data || [])
        .filter((row: { period: string; isApplicable: boolean }) =>
          row.isApplicable && normalizeFinancialYearPeriod(row.period) === normalizedPeriod
        )
        .map((row: { complianceType: ComplianceType }) => row.complianceType))] as ComplianceType[];

      setLinkedCompliances(allowed);
      const allRows = (checklistJson.data?.requirements || []) as IFacilityApplicableRequirement[];
      const rows = allRows.filter((row) =>
        getRowCompliances(row).some((framework) => allowed.includes(framework))
      );
      setRequirements(rows);

      const preselect = rows
        .filter((row) => row.requestable && !row.needsVerification)
        .map((row) => row.master.itemKey);
      setSelected(new Set(preselect));
      setBundleTitle((prev) =>
        prev.trim() ? prev : `Operational data request — ${facilityName || facilityId} (${period})`
      );
    } catch (err) {
      setLinkedCompliances([]);
      setRequirements([]);
      setSelected(new Set());
      notify.error(err instanceof Error ? err.message : 'Unable to load applicable requirements');
    } finally {
      setApplicabilityLoading(false);
      setLoading(false);
    }
  }, [facilityId, facilityName, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRequirements = useMemo(() => {
    if (linkedCompliances.length === 0) return [];
    return requirements.filter((r) => {
      const compliances = getRowCompliances(r);
      return compliances.some((c) => linkedCompliances.includes(c));
    });
  }, [requirements, linkedCompliances]);

  const grouped = useMemo(() => {
    const map = masterRowsByCategory();
    return Object.entries(map)
      .map(([cat, masters]) => {
        const rows = filteredRequirements.filter((r) => r.master.category === cat);
        return {
          categoryKey: cat,
          categoryLabel: masters[0] ? requirements.find((r) => r.master.category === cat)?.master.categoryLabel || cat : cat,
          rows,
        };
      })
      .filter((g) => g.rows.length > 0);
  }, [filteredRequirements, requirements]);


  const selectedItems = useMemo(() => {
    return filteredRequirements.filter((r) => selected.has(r.master.itemKey));
  }, [filteredRequirements, selected]);

  useEffect(() => {
    if (!showPreview) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPreview(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPreview]);

  const toggleCategory = (keys: string[], on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        const row = filteredRequirements.find((r) => r.master.itemKey === key);
        if (!row?.requestable || row.needsVerification) continue;
        if (on) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const submit = async (saveAsDraft: boolean) => {
    const itemKeys = [...selected];
    if (!linkedCompliances.length) {
      notify.error('No Admin-approved frameworks are enabled for this facility and financial year.');
      return;
    }
    if (!itemKeys.length) {
      notify.error('Select at least one applicable requirement.');
      return;
    }
    if (!saveAsDraft && !dueDate.trim()) {
      notify.error('Client submission due date is required.');
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

  const muiFieldSx = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderRadius: '8px',
    '& .MuiOutlinedInput-root': {
      borderRadius: '8px',
      fontSize: '12px',
      color: isDark ? '#F8FAFC' : '#0F172A',
      '& fieldset': {
        borderColor: isDark ? '#334155' : '#CBD5E1',
      },
      '&:hover fieldset': {
        borderColor: isDark ? '#475569' : '#94A3B8',
      },
      '&.Mui-focused fieldset': {
        borderColor: isDark ? '#34D399' : '#059669',
        borderWidth: '1.5px',
      },
    },
    '& .MuiInputBase-input': {
      py: '7.5px',
      px: '12px',
      fontSize: '12px',
      color: isDark ? '#F8FAFC' : '#0F172A',
    },
  };

  const muiSelectSx = {
    width: '100%',
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    color: isDark ? '#F8FAFC' : '#0F172A',
    borderRadius: '8px',
    fontSize: '12px',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? '#334155' : '#CBD5E1',
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? '#475569' : '#94A3B8',
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: isDark ? '#34D399' : '#059669',
      borderWidth: '1.5px',
    },
    '& .MuiSelect-select': {
      py: '7.5px',
      px: '12px',
      display: 'flex',
      alignItems: 'center',
    },
    '& .MuiSvgIcon-root': {
      color: isDark ? '#94A3B8' : '#64748B',
    },
  };

  const muiMenuProps = {
    slotProps: {
      paper: {
        sx: {
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          color: isDark ? '#F8FAFC' : '#0F172A',
          border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
          borderRadius: '8px',
          maxHeight: 280,
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Loading checklist-driven requirements…
      </div>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900/60">
      <header>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Checklist-driven data request</h2>
        <p className="mt-1 text-xs text-slate-500">
          Requirements load from the Data Requirement Master for{' '}
          <span className="font-semibold text-slate-800 dark:text-slate-200">{facilityName || facilityId}</span>. Only applicable items can be sent;
          items needing verification are highlighted.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Reporting year
          </label>
          <FormControl size="small" fullWidth>
            <Select
              value={period}
              onChange={(e) => {
                const next = e.target.value;
                setPeriod(next);
                onPeriodChange?.(next);
              }}
              sx={muiSelectSx}
              MenuProps={muiMenuProps}
            >
              {financialYearOptions().map((fy) => (
                <MenuItem
                  key={fy}
                  value={`FY${fy}`}
                  sx={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: period === `FY${fy}` ? 600 : 400,
                    color: period === `FY${fy}` ? (isDark ? '#34D399' : '#059669') : undefined,
                  }}
                >
                  {`FY${fy}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Request title
          </label>
          <TextField
            size="small"
            fullWidth
            value={bundleTitle}
            onChange={(e) => setBundleTitle(e.target.value)}
            placeholder="e.g. Operational data request"
            sx={muiFieldSx}
          />
        </div>

        <div>
          <MuiDatePicker
            label="Due date*"
            value={dueDate}
            onChange={setDueDate}
            placeholder="dd-mm-yyyy"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
          {linkedCompliances.length === 0 ? (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20 p-8 text-center text-xs text-amber-800 dark:text-amber-300">
              No Admin-approved framework is enabled for this facility and financial year. Ask Admin to configure it first.
            </div>
          ) : grouped.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-xs text-slate-500">
              No applicable checklist requirements found for {linkedCompliances.join(', ')}.
            </div>
          ) : (
            grouped.map((group) => {
              const selectable = group.rows.filter((r) => r.requestable && !r.needsVerification);
              const allOn = selectable.length > 0 && selectable.every((r) => selected.has(r.master.itemKey));
              return (
                <div key={group.categoryKey} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-900/40">
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">{group.categoryLabel}</h3>
                    <button
                      type="button"
                      className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                      onClick={() => toggleCategory(selectable.map((r) => r.master.itemKey), !allOn)}
                    >
                      {allOn ? 'Clear category' : 'Select category'}
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {group.rows.map((row) => {
                      const disabled = !row.requestable || row.needsVerification;
                      const checked = selected.has(row.master.itemKey);
                      const compliances = getRowCompliances(row);
                      return (
                        <li key={row.master.itemKey} className="rounded-lg border border-slate-200 dark:border-slate-800 p-2.5 text-xs bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <label className={`flex items-start gap-2.5 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
                            <Checkbox
                              size="small"
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
                              sx={{
                                padding: '2px',
                                color: isDark ? '#64748B' : '#94A3B8',
                                '&.Mui-checked': {
                                  color: isDark ? '#34D399' : '#059669',
                                },
                                '&.Mui-disabled': {
                                  color: isDark ? '#334155' : '#CBD5E1',
                                },
                              }}
                            />
                            <span className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-semibold text-slate-900 dark:text-white">{row.master.name}</span>
                                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold ${applicabilityBadge(row)}`}>
                                  {row.needsVerification ? 'Needs verification' : row.applicability.replaceAll('_', ' ')}
                                </span>
                                {compliances.map((comp) => (
                                  <span
                                    key={comp}
                                    className={`rounded px-1.5 py-0.2 text-[8px] font-mono font-bold border ${
                                      linkedCompliances.includes(comp)
                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                                        : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                    }`}
                                  >
                                    {comp}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{row.master.requiredEvidence}</div>
                              {row.master.specialInstructions && (
                                <div className="mt-0.5 text-[10px] text-amber-800 dark:text-amber-400 font-medium">{row.master.specialInstructions}</div>
                              )}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })
          )}
        </div>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
              Purpose
            </label>
            <TextField
              size="small"
              fullWidth
              multiline
              rows={3}
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Operational data collection per published client checklist."
              sx={{
                ...muiFieldSx,
                '& .MuiInputBase-root': { p: 1.25 },
                '& .MuiInputBase-input': { py: 0, px: 0 },
              }}
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300">
              Instructions for client
            </label>
            <TextField
              size="small"
              fullWidth
              multiline
              rows={4}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Please provide signed copies and official utility bills..."
              sx={{
                ...muiFieldSx,
                '& .MuiInputBase-root': { p: 1.25 },
                '& .MuiInputBase-input': { py: 0, px: 0 },
              }}
            />
          </div>

          <div>
            <span className="mb-1.5 block font-semibold text-slate-700 dark:text-slate-300">
              Admin-approved frameworks
            </span>
            <div className="flex flex-wrap gap-2">
              {applicabilityLoading ? (
                <span className="text-xs text-slate-500">Loading facility compliance…</span>
              ) : linkedCompliances.length ? (
                linkedCompliances.map((framework) => (
                  <span key={framework} className="inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    {framework}
                  </span>
                ))
              ) : (
                <span className="text-xs text-amber-700">
                  No frameworks are enabled for this facility and financial year. Ask Admin to configure them first.
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{selected.size} requirement(s) selected</p>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            >
              <Eye className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" /> Preview
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
            >
              <Save className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" /> Save draft
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => void submit(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Send to client
            </button>
          </div>
        </div>
      </div>

      {/* Client Portal Preview Modal */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 bg-slate-50/70 dark:bg-slate-950/50">
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    <Eye className="w-3 h-3" />
                    Client Request Preview
                  </span>
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    {period}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white truncate" title={bundleTitle}>
                  {bundleTitle || `Operational data request — ${facilityName || facilityId}`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {facilityName || facilityId}
                  {dueDate && (
                    <span className="ml-2 inline-flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                      · Due: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{dueDate}</strong>
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope info cards */}
            <div className="p-4 bg-slate-100/60 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block mb-0.5">
                  Purpose
                </span>
                <p className="text-slate-700 dark:text-slate-300 line-clamp-2" title={purpose}>
                  {purpose || 'Operational data collection per published client checklist.'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block mb-0.5">
                  Client Instructions
                </span>
                <p className="text-slate-700 dark:text-slate-300 line-clamp-2" title={instructions || 'None'}>
                  {instructions || 'No specific instructions provided.'}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wide block mb-0.5">
                  Linked Frameworks
                </span>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  {linkedCompliances.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                    >
                      {c}
                    </span>
                  ))}
                  <span className="text-slate-500 font-medium text-[11px] ml-1">
                    · {selectedItems.length} items
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body: Structured Table of Requirements */}
            <div className="p-4 flex-1 overflow-y-auto">
              {selectedItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                  No requirements are currently selected.
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <th className="p-2.5 pl-3.5 w-10 text-center font-bold">#</th>
                        <th className="p-2.5 font-bold">Category</th>
                        <th className="p-2.5 font-bold">Requirement Title</th>
                        <th className="p-2.5 font-bold">Required Evidence</th>
                        <th className="p-2.5 font-bold text-center">Framework</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {selectedItems.map((item, idx) => {
                        const itemComps = getRowCompliances(item).filter((c) => linkedCompliances.includes(c));
                        return (
                          <tr
                            key={item.master.itemKey}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                          >
                            <td className="p-2.5 pl-3.5 font-mono text-center text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="p-2.5 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap font-medium">
                              {item.master.categoryLabel}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-900 dark:text-white">
                              <div>{item.master.name}</div>
                              {item.master.specialInstructions && (
                                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal mt-0.5">
                                  {item.master.specialInstructions}
                                </div>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-300 text-[11px]">
                              {item.master.requiredEvidence || '—'}
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <div className="flex flex-wrap items-center justify-center gap-1">
                                {itemComps.length > 0 ? (
                                  itemComps.map((c) => (
                                    <span
                                      key={c}
                                      className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                    >
                                      {c}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[10px] text-slate-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-950/50">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Total <strong className="text-slate-700 dark:text-slate-200">{selectedItems.length}</strong> requirement(s) selected
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={submitting || selectedItems.length === 0}
                  onClick={() => {
                    setShowPreview(false);
                    void submit(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-60 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send to client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}