'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ChecklistApplicabilityStatus, IFacilityApplicableRequirement } from '@/types';
import { Loader2, RefreshCw, Upload, Calendar, Factory, Filter, ChevronDown } from 'lucide-react';
import { Select, MenuItem, FormControl, SelectChangeEvent, Menu } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { COMPLIANCE_PERIODS } from '@/lib/complianceMatrixData';
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
      return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300';
    case 'NOT_APPLICABLE':
    case 'NOT_REQUIRED':
      return 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
    case 'NEEDS_VERIFICATION':
    case 'UNSELECTED':
      return 'bg-violet-100 dark:bg-violet-950/60 text-violet-900 dark:text-violet-300';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
  }
}

export default function AdminDataRequirementsPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
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
  const [cellMenuAnchor, setCellMenuAnchor] = useState<{
    el: HTMLElement;
    facilityId: string;
    itemKey: string;
    currentVal: ChecklistApplicabilityStatus;
  } | null>(null);

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
      <header className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-wrap items-start justify-between gap-4">
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

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 shadow-2xs">
        {/* Period Filter */}
        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
          <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold whitespace-nowrap">Period</span>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <Select
              value={period}
              onChange={(e: SelectChangeEvent) => setPeriod(e.target.value)}
              IconComponent={() => (
                <ChevronDown
                  className="w-4 h-4 pointer-events-none"
                  style={{ color: isDark ? '#94A3B8' : '#64748B', marginRight: 8 }}
                />
              )}
              sx={{
                height: 36,
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#0F172A',
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
                  py: '6px',
                  px: '12px',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      mt: 0.5,
                      borderRadius: '8px',
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      color: isDark ? '#FFFFFF' : '#0F172A',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                      boxShadow: isDark
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                        : '0 10px 25px -5px rgba(16, 185, 129, 0.12)',
                      '& .MuiList-root': { py: '4px' },
                    },
                  },
                },
              }}
            >
              {COMPLIANCE_PERIODS.map((fy) => (
                <MenuItem
                  key={fy}
                  value={fy}
                  sx={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: period === fy ? 600 : 400,
                    py: 0.75,
                    px: 1.5,
                    borderRadius: '6px',
                    mx: 0.5,
                    my: 0.25,
                    '&.Mui-selected': {
                      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                      color: isDark ? '#34D399' : '#059669',
                    },
                  }}
                >
                  {fy}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* Facility Filter */}
        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
          <Factory className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold whitespace-nowrap">Facility</span>
          <FormControl size="small" sx={{ minWidth: 220, maxWidth: 360 }}>
            <Select
              value={filterFacility}
              onChange={(e: SelectChangeEvent) => setFilterFacility(e.target.value)}
              displayEmpty
              IconComponent={() => (
                <ChevronDown
                  className="w-4 h-4 pointer-events-none"
                  style={{ color: isDark ? '#94A3B8' : '#64748B', marginRight: 8 }}
                />
              )}
              renderValue={(selected) => {
                if (!selected) {
                  return <span>All Facilities ({matrix?.facilities.length || 0})</span>;
                }
                const fac = matrix?.facilities.find((f) => f.facilityId === selected);
                return <span className="truncate">{fac ? `${fac.facilityName || fac.facilityId}` : selected}</span>;
              }}
              sx={{
                height: 36,
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#0F172A',
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
                  py: '6px',
                  px: '12px',
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      mt: 0.5,
                      maxHeight: 320,
                      borderRadius: '8px',
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      color: isDark ? '#FFFFFF' : '#0F172A',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                      boxShadow: isDark
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                        : '0 10px 25px -5px rgba(16, 185, 129, 0.12)',
                      '& .MuiList-root': { py: '4px' },
                    },
                  },
                },
              }}
            >
              <MenuItem
                value=""
                sx={{
                  fontSize: '12px',
                  fontWeight: filterFacility === '' ? 600 : 400,
                  py: 0.75,
                  px: 1.5,
                  borderRadius: '6px',
                  mx: 0.5,
                  my: 0.25,
                  '&.Mui-selected': {
                    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    color: isDark ? '#34D399' : '#059669',
                  },
                }}
              >
                All Facilities ({matrix?.facilities.length || 0})
              </MenuItem>
              {(matrix?.facilities || []).map((f) => (
                <MenuItem
                  key={f.facilityId}
                  value={f.facilityId}
                  sx={{
                    fontSize: '12px',
                    fontWeight: filterFacility === f.facilityId ? 600 : 400,
                    py: 0.75,
                    px: 1.5,
                    borderRadius: '6px',
                    mx: 0.5,
                    my: 0.25,
                    '&.Mui-selected': {
                      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                      color: isDark ? '#34D399' : '#059669',
                    },
                  }}
                >
                  {f.facilityName || f.facilityId} ({f.facilityId})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
          <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold whitespace-nowrap">Status filter</span>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={filterStatus}
              onChange={(e: SelectChangeEvent) => setFilterStatus(e.target.value)}
              IconComponent={() => (
                <ChevronDown
                  className="w-4 h-4 pointer-events-none"
                  style={{ color: isDark ? '#94A3B8' : '#64748B', marginRight: 8 }}
                />
              )}
              sx={{
                height: 36,
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#0F172A',
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
                  py: '6px',
                  px: '12px',
                },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      mt: 0.5,
                      maxHeight: 280,
                      borderRadius: '8px',
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      color: isDark ? '#FFFFFF' : '#0F172A',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                      boxShadow: isDark
                        ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                        : '0 10px 25px -5px rgba(16, 185, 129, 0.12)',
                      '& .MuiList-root': { py: '4px' },
                    },
                  },
                },
              }}
            >
              <MenuItem
                value="all"
                sx={{
                  fontSize: '12px',
                  fontWeight: filterStatus === 'all' ? 600 : 400,
                  py: 0.75,
                  px: 1.5,
                  borderRadius: '6px',
                  mx: 0.5,
                  my: 0.25,
                  '&.Mui-selected': {
                    backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                    color: isDark ? '#34D399' : '#059669',
                  },
                }}
              >
                All Statuses
              </MenuItem>
              {APPLICABILITY_OPTIONS.map((s) => (
                <MenuItem
                  key={s}
                  value={s}
                  sx={{
                    fontSize: '12px',
                    fontWeight: filterStatus === s ? 600 : 400,
                    py: 0.75,
                    px: 1.5,
                    borderRadius: '6px',
                    mx: 0.5,
                    my: 0.25,
                    '&.Mui-selected': {
                      backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                      color: isDark ? '#34D399' : '#059669',
                    },
                  }}
                >
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <table className="min-w-full text-left text-[10px]">
          <thead className="bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-950 p-2 font-semibold">Facility</th>
              {(matrix?.columns || []).map((col) => (
                <th key={col.itemKey} className="min-w-28 p-2 font-medium">
                  <div className="line-clamp-3">{col.label}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {facilities.map((facility) => (
              <tr key={facility.facilityId} className="border-t border-slate-200 dark:border-slate-800 align-top">
                <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 p-2 font-semibold text-slate-900 dark:text-white">
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
                      <button
                        type="button"
                        onClick={(e) =>
                          setCellMenuAnchor({
                            el: e.currentTarget,
                            facilityId: facility.facilityId,
                            itemKey: col.itemKey,
                            currentVal: applicability,
                          })
                        }
                        className={`w-full flex items-center justify-between gap-1 rounded px-1.5 py-1 text-[10px] font-semibold transition-all hover:ring-1 hover:ring-slate-400 dark:hover:ring-slate-500 cursor-pointer ${cellColor(applicability)}`}
                        title={`${facility.facilityName || facility.facilityId} - ${col.label}: ${applicability}`}
                      >
                        <span className="truncate">{applicability}</span>
                        <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* High-Performance Material-UI Menu for Table Cell Dropdown */}
      <Menu
        anchorEl={cellMenuAnchor?.el}
        open={Boolean(cellMenuAnchor)}
        onClose={() => setCellMenuAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              borderRadius: '8px',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              color: isDark ? '#FFFFFF' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
              boxShadow: isDark
                ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                : '0 10px 25px -5px rgba(16, 185, 129, 0.12)',
              '& .MuiList-root': { py: '4px' },
            },
          },
        }}
      >
        {APPLICABILITY_OPTIONS.map((opt) => {
          const isSelected = cellMenuAnchor?.currentVal === opt;
          return (
            <MenuItem
              key={opt}
              selected={isSelected}
              onClick={() => {
                if (cellMenuAnchor) {
                  void updateCell(cellMenuAnchor.facilityId, cellMenuAnchor.itemKey, opt);
                }
                setCellMenuAnchor(null);
              }}
              sx={{
                fontSize: '11px',
                fontWeight: isSelected ? 600 : 400,
                py: 0.75,
                px: 1.5,
                borderRadius: '6px',
                mx: 0.5,
                my: 0.25,
                '&.Mui-selected': {
                  backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                  color: isDark ? '#34D399' : '#059669',
                },
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                },
              }}
            >
              {opt}
            </MenuItem>
          );
        })}
      </Menu>
    </div>
  );
}