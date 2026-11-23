'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Loader2, Save, Send } from 'lucide-react';
import { Select, MenuItem, FormControl, TextField, Checkbox } from '@mui/material';
import { MuiDatePicker } from '@/components/common/MuiDatePicker';
import { useAuth } from '@/context/AuthContext';
import type { ComplianceType, IFacilityApplicableRequirement } from '@/types';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { masterRowsByCategory } from '@/lib/dataRequirementMaster';
import { notify } from '@/lib/notify';
import { generateMonthRange, financialYearOptions } from '@/lib/dataRequestCategories';

const COMPLIANCE_OPTIONS: ComplianceType[] = ['RCO', 'PAT', 'CCTS'];

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
  const { theme } = useAuth();
  const isDark = theme === 'dark';
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
      const preselect = rows
        .filter(
          (r) =>
            r.requestable &&
            !r.needsVerification &&
            r.master.category !== 'ELECTRICITY_POWER' &&
            !/electricity|cea/i.test(r.master.categoryLabel) &&
            !/electricity|cea/i.test(r.master.name)
        )
        .map((r) => r.master.itemKey);
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
    return Object.entries(map)
      .filter(([cat]) => cat !== 'ELECTRICITY_POWER')
      .map(([cat, masters]) => ({
        categoryKey: cat,
        categoryLabel: masters[0] ? requirements.find((r) => r.master.category === cat)?.master.categoryLabel || cat : cat,
        rows: requirements.filter((r) => r.master.category === cat),
      }))
      .filter((g) => !/electricity|cea/i.test(g.categoryLabel));
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
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-slate-900/60">
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
            label="Due date"
            value={dueDate}
            onChange={setDueDate}
            placeholder="dd-mm-yyyy"
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
          {grouped.map((group) => {
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
                            <span className="font-semibold text-slate-900 dark:text-white">{row.master.name}</span>
                            <span className={`ml-2 rounded border px-1.5 py-0.5 text-[9px] font-bold ${applicabilityBadge(row)}`}>
                              {row.needsVerification ? 'Needs verification' : row.applicability.replaceAll('_', ' ')}
                            </span>
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
          })}
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
              Linked frameworks
            </span>
            <div className="flex flex-wrap gap-2">
              {COMPLIANCE_OPTIONS.map((c) => {
                const isChecked = linkedCompliances.includes(c);
                return (
                  <label
                    key={c}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    <Checkbox
                      checked={isChecked}
                      onChange={(e) =>
                        setLinkedCompliances((prev) =>
                          e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)
                        )
                      }
                      size="small"
                      sx={{
                        padding: 0,
                        color: isDark ? '#64748B' : '#94A3B8',
                        '&.Mui-checked': {
                          color: isDark ? '#34D399' : '#059669',
                        },
                      }}
                    />
                    <span className="font-mono text-xs font-semibold">{c}</span>
                  </label>
                );
              })}
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