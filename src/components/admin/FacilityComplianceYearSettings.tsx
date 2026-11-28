'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import type { ComplianceType } from '@/types';
import { notify } from '@/lib/notify';
import { getCurrentFinancialYear, getRollingFinancialYears, normalizeFinancialYearPeriod } from '@/lib/financialYears';
import { useAuth } from '@/context/AuthContext';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';

type Facility = {
  facilityId: string;
  name: string;
  clientGroupName?: string;
};

type Applicability = {
  facilityId: string;
  complianceType: ComplianceType;
  period: string;
  isApplicable: boolean;
};

type FrameworkOption = {
  type: ComplianceType;
  title: string;
  detail: string;
};

const FRAMEWORKS: FrameworkOption[] = [
  { type: 'RCO', title: 'RCO', detail: 'Renewable Consumption Obligation' },
  { type: 'RPO', title: 'RPO', detail: 'Renewable Purchase Obligation' },
  { type: 'PAT', title: 'PAT', detail: 'Perform, Achieve and Trade' },
  { type: 'CCTS', title: 'CCTS', detail: 'Carbon Credit Trading Scheme' },
];

const getMuiSelectSx = (isDark: boolean) => ({
  height: '48px',
  minHeight: '48px',
  maxHeight: '48px',
  fontSize: '13px',
  fontWeight: 500,
  borderRadius: '8px',
  backgroundColor: isDark ? '#020617' : '#FFFFFF',
  color: isDark ? '#FFFFFF' : '#0F172A',
  boxSizing: 'border-box',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: isDark ? '#34D399' : '#059669',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: isDark ? '#34D399' : '#059669',
    borderWidth: '1.5px',
  },
  '& .MuiSelect-select': {
    height: '48px !important',
    lineHeight: '48px !important',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    padding: '0 14px !important',
    fontSize: '13px',
  },
  '& .MuiSelect-icon': {
    color: isDark ? '#94A3B8' : '#64748B',
    right: '8px',
  },
});

const getMuiMenuProps = (isDark: boolean) => ({
  slotProps: {
    paper: {
      sx: {
        mt: 0.5,
        maxHeight: 280,
        borderRadius: '8px',
        backgroundColor: isDark ? '#0F172A !important' : '#FFFFFF !important',
        color: isDark ? '#FFFFFF' : '#0F172A',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
        boxShadow: isDark
          ? '0 10px 25px -5px rgba(0, 0, 0, 0.7)'
          : '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        '& .MuiMenuItem-root': {
          fontSize: '13px',
          color: isDark ? '#E2E8F0' : '#0F172A',
          '&:hover, &.Mui-focusVisible': {
            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
            color: isDark ? '#34D399' : '#059669',
          },
          '&.Mui-selected': {
            backgroundColor: isDark ? '#1E293B !important' : '#E2E8F0 !important',
            color: isDark ? '#34D399' : '#059669',
            fontWeight: 600,
          },
        },
      },
    },
  },
});

export default function FacilityComplianceYearSettings({ initialFacilityId, onSaved }: { initialFacilityId?: string; onSaved?: () => void } = {}) {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const years = useMemo(() => getRollingFinancialYears(), []);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [records, setRecords] = useState<Applicability[]>([]);
  const [facilityId, setFacilityId] = useState(initialFacilityId || '');
  const [bulkFacilityIds, setBulkFacilityIds] = useState<string[]>([]);
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [period, setPeriod] = useState(getCurrentFinancialYear());
  const [selected, setSelected] = useState<ComplianceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [facilityResponse, applicabilityResponse] = await Promise.all([
        fetch('/api/facilities', { cache: 'no-store', credentials: 'include' }),
        fetch('/api/compliance-applicability', { cache: 'no-store', credentials: 'include' }),
      ]);
      const facilityJson = await facilityResponse.json();
      const applicabilityJson = await applicabilityResponse.json();

      if (!facilityResponse.ok) {
        throw new Error(facilityJson.error || 'Unable to load facilities.');
      }
      if (!applicabilityResponse.ok) {
        throw new Error(applicabilityJson.error || 'Unable to load compliance settings.');
      }

      const facilityList: Facility[] = Array.isArray(facilityJson.data) ? facilityJson.data : [];
      setFacilities(facilityList);
      setRecords(Array.isArray(applicabilityJson.data) ? applicabilityJson.data : []);
      setFacilityId((current) => current || facilityList[0]?.facilityId || '');
      setBulkFacilityIds((current) =>
        current.filter((id) => facilityList.some((facility) => facility.facilityId === id))
      );
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to load compliance settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const normalizedPeriod = period.toUpperCase();
    const activeForFacility = records
      .filter(
        (record) =>
          record.facilityId.toUpperCase() === facilityId.toUpperCase() &&
          normalizeFinancialYearPeriod(record.period) === normalizedPeriod &&
          record.isApplicable
      )
      .map((record) => record.complianceType);
    setSelected(activeForFacility);
  }, [facilityId, period, records]);

  const toggleBulkFacility = (id: string) => {
    setBulkFacilityIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const toggleFramework = (framework: ComplianceType) => {
    setSelected((current) =>
      current.includes(framework)
        ? current.filter((item) => item !== framework)
        : [...current, framework]
    );
  };

  async function save() {
    const targetFacilityIds = mode === 'single' ? [facilityId] : bulkFacilityIds;
    if (!targetFacilityIds.length || targetFacilityIds.some((id) => !id)) {
      notify.error(mode === 'single' ? 'Select a facility first.' : 'Select at least one facility.');
      return;
    }

    if (mode === 'bulk') {
      const confirmed = window.confirm(
        `Apply the selected frameworks for ${period} to ${targetFacilityIds.length} facilities? Existing settings for these facilities and this financial year will be updated. Other financial years will not change.`
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/compliance-applicability', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilityIds: targetFacilityIds,
          period,
          frameworks: FRAMEWORKS.map((framework) => ({
            complianceType: framework.type,
            isApplicable: selected.includes(framework.type),
          })),
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to save compliance settings.');

      notify.success(
        `Compliance settings saved for ${targetFacilityIds.length} ${targetFacilityIds.length === 1 ? 'facility' : 'facilities'} — ${period}.`
      );
      await load();
      onSaved?.();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to save compliance settings.');
    } finally {
      setSaving(false);
    }
  }

  const facility = facilities.find((item) => item.facilityId === facilityId);
  const selectedCount = mode === 'single' ? (facilityId ? 1 : 0) : bulkFacilityIds.length;

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Facility compliance by financial year
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Configure existing or newly registered facilities. Settings are stored separately for each financial year; changing one year does not change another.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-600" /> Loading compliance settings…
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                mode === 'single'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              One facility
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkFacilityIds((current) => current.length ? current : facilityId ? [facilityId] : []);
                setMode('bulk');
              }}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                mode === 'bulk'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-2xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              Multiple facilities
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {mode === 'single' ? (
              <div className="space-y-1.5">
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Facility
                </span>
                <FormControl fullWidth size="small">
                  <Select
                    value={facilityId}
                    onChange={(event: SelectChangeEvent) => setFacilityId(event.target.value)}
                    displayEmpty
                    sx={getMuiSelectSx(isDark)}
                    MenuProps={getMuiMenuProps(isDark)}
                  >
                    {facilities.map((item) => (
                      <MenuItem key={item.facilityId} value={item.facilityId}>
                        {item.name} ({item.facilityId})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span>Choose facilities / companies</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{bulkFacilityIds.length} selected</span>
                </div>
                <div className="flex gap-3 text-[11px]">
                  <button type="button" onClick={() => setBulkFacilityIds(facilities.map((item) => item.facilityId))} className="font-bold text-emerald-700 hover:underline dark:text-emerald-400 cursor-pointer">Select all</button>
                  <button type="button" onClick={() => setBulkFacilityIds([])} className="font-semibold text-slate-500 hover:underline cursor-pointer">Clear</button>
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 dark:border-slate-700 bg-white dark:bg-slate-950">
                  {facilities.map((item) => (
                    <label key={item.facilityId} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">
                      <input
                        type="checkbox"
                        checked={bulkFacilityIds.includes(item.facilityId)}
                        onChange={() => toggleBulkFacility(item.facilityId)}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <span className="min-w-0">
                        <span className="block font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                        <span className="text-[11px] text-slate-500">{item.clientGroupName || 'Organization'} · <span className="font-mono">{item.facilityId}</span></span>
                      </span>
                    </label>
                  ))}
                  {!facilities.length && <p className="p-2 text-xs text-slate-500">No facilities found.</p>}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Financial year
              </span>
              <FormControl fullWidth size="small">
                <Select
                  value={period}
                  onChange={(event: SelectChangeEvent) => setPeriod(event.target.value)}
                  displayEmpty
                  sx={getMuiSelectSx(isDark)}
                  MenuProps={getMuiMenuProps(isDark)}
                >
                  {years.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <span className="block font-normal text-[11px] text-slate-500 dark:text-slate-400">
                Only the previous, current and upcoming financial years are shown.
              </span>
            </div>
          </div>

          {mode === 'single' && facility && (
            <div className="mt-4 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 p-3 text-xs flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white">{facility.name}</span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500 dark:text-slate-400">{facility.clientGroupName || 'Organization'}</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                {period}
              </span>
            </div>
          )}
          {mode === 'bulk' && (
            <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 text-xs text-amber-900 dark:text-amber-200">
              The same framework selection will be applied to all <strong className="font-bold">{bulkFacilityIds.length}</strong> selected facilities for <strong className="font-bold font-mono">{period}</strong>. Other financial years are not modified.
            </div>
          )}

          {!facilities.length && <p className="py-4 text-xs font-medium text-slate-500">Create a facility first to configure compliance.</p>}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {FRAMEWORKS.map((framework) => {
              const checked = selected.includes(framework.type);
              return (
                <button
                  key={framework.type}
                  type="button"
                  disabled={!selectedCount}
                  onClick={() => toggleFramework(framework.type)}
                  className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                    checked
                      ? 'border-emerald-500 bg-emerald-50/70 dark:border-emerald-600 dark:bg-emerald-950/40 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="space-y-0.5">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white tracking-wide">
                      {framework.title}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 font-normal">
                      {framework.detail}
                    </span>
                  </span>
                  {checked ? (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/50 px-2.5 py-1 rounded-full border border-emerald-300 dark:border-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      Applicable
                    </span>
                  ) : (
                    <span className="rounded-md border border-slate-200 bg-slate-100/80 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                      Not applicable
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              <strong className="text-slate-900 dark:text-white font-bold">{selected.length}</strong> framework(s) enabled ·{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{selectedCount}</strong> facility/facilities targeted
            </p>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !selectedCount}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : mode === 'single' ? 'Save financial-year compliance' : `Apply to ${bulkFacilityIds.length} facilities`}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
