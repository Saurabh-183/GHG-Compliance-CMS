'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ChecklistApplicabilityStatus, IFacilityApplicableRequirement } from '@/types';
import { Loader2, RefreshCw, Upload } from 'lucide-react';
import { notify } from '@/lib/notify';

const APPLICABILITY_OPTIONS: ChecklistApplicabilityStatus[] = [
  'APPLICABLE',
  'NOT_APPLICABLE',
  'NOT_REQUIRED',
  'NEEDS_VERIFICATION',
  'UNSELECTED',
];

function cellColor(status: ChecklistApplicabilityStatus) {
  switch (status) {
    case 'APPLICABLE':
      return 'bg-emerald-100 text-emerald-900';
    case 'NOT_APPLICABLE':
    case 'NOT_REQUIRED':
      return 'bg-slate-200 text-slate-700';
    case 'NEEDS_VERIFICATION':
    case 'UNSELECTED':
      return 'bg-violet-100 text-violet-900';
    default:
      return 'bg-slate-100';
  }
}

export default function AdminDataRequirementsPage() {
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [period, setPeriod] = useState('FY2025-26');
  const [matrix, setMatrix] = useState<{
    versionId: string;
    columns: Array<{ itemKey: string; label: string }>;
    facilities: Array<{ facilityId: string; facilityName?: string; items: IFacilityApplicableRequirement[] }>;
  } | null>(null);
  const [filterFacility, setFilterFacility] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/checklist-applicability?period=${encodeURIComponent(period)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load matrix');
      setMatrix(json.data);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Unable to load applicability matrix');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const importSnapshots = async () => {
    setImporting(true);
    try {
      const res = await fetch('/api/admin/checklist-applicability', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, source: 'local-files' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      notify.success(json.message || 'Imported');
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const updateCell = async (facilityId: string, itemKey: string, applicability: ChecklistApplicabilityStatus) => {
    try {
      const res = await fetch('/api/admin/checklist-applicability', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facilityId, period, itemKey, applicability }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Update failed');
      notify.success('Applicability updated');
      await load();
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Update failed');
    }
  };

  const facilities = useMemo(() => {
    const rows = matrix?.facilities || [];
    if (!filterFacility) return rows;
    return rows.filter((f) => f.facilityId === filterFacility);
  }, [matrix, filterFacility]);

  if (loading && !matrix) {
    return (
      <div className="mx-auto max-w-7xl p-8 text-center text-sm text-slate-500">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Loading configuration…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[95vw] space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Data Requirement Configuration</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">
            Master checklist version: <span className="font-mono">{matrix?.versionId}</span>. Edit client-wise applicability before consultants publish requests. Source: Data-Checklist-All-Clients PDF / imported snapshots.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            type="button"
            disabled={importing}
            onClick={() => void importSnapshots()}
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Import local checklist snapshots
          </button>
          <Link href="/data-requests" className="rounded-lg border px-3 py-2 text-xs font-semibold">
            Consultant requests
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-3 text-xs">
        <label>
          Period
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="ml-2 rounded border px-2 py-1">
            <option value="FY2025-26">FY2025-26</option>
          </select>
        </label>
        <label>
          Facility
          <select value={filterFacility} onChange={(e) => setFilterFacility(e.target.value)} className="ml-2 rounded border px-2 py-1">
            <option value="">All</option>
            {matrix?.facilities.map((f) => (
              <option key={f.facilityId} value={f.facilityId}>
                {f.facilityName || f.facilityId}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status filter
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="ml-2 rounded border px-2 py-1">
            <option value="all">All</option>
            {APPLICABILITY_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-left text-[10px]">
          <thead className="bg-slate-50">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 p-2">Facility</th>
              {(matrix?.columns || []).map((col) => (
                <th key={col.itemKey} className="min-w-28 p-2 font-medium">
                  <div className="line-clamp-3">{col.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilities.map((facility) => (
              <tr key={facility.facilityId} className="border-t align-top">
                <td className="sticky left-0 z-10 bg-white p-2 font-semibold">
                  {facility.facilityName || facility.facilityId}
                  <div className="font-mono text-[9px] text-slate-400">{facility.facilityId}</div>
                </td>
                {(matrix?.columns || []).map((col) => {
                  const cell = facility.items.find((i) => i.master.itemKey === col.itemKey);
                  const applicability = cell?.applicability || 'UNSELECTED';
                  if (filterStatus !== 'all' && applicability !== filterStatus) {
                    return (
                      <td key={col.itemKey} className="p-1 opacity-30">
                        <span className={`block rounded px-1 py-1 ${cellColor(applicability)}`}>{applicability[0]}</span>
                      </td>
                    );
                  }
                  return (
                    <td key={col.itemKey} className="p-1">
                      <select
                        value={applicability}
                        onChange={(e) =>
                          void updateCell(facility.facilityId, col.itemKey, e.target.value as ChecklistApplicabilityStatus)
                        }
                        className={`w-full rounded border-0 px-1 py-1 ${cellColor(applicability)}`}
                      >
                        {APPLICABILITY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}