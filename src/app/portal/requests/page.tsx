'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { IDataRequirement, IFacility } from '@/types';
import { PortalScopeSelectors } from '@/components/portal/PortalScopeSelectors';
import { dedupeFacilitiesById, readPortalPeriod, writePortalScope } from '@/lib/portalScope';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataRequestCard } from '@/components/requests/DataRequestCard';
import { DataRequestStatsBar } from '@/components/requests/DataRequestStatsBar';
import { resolveDataCategoryLabel, matchesQuickFilter } from '@/lib/dataRequestDisplay';
import { computeRequestStats } from '@/lib/requestStats';
import { clientPortalPrimaryLabel } from '@/lib/clientPortalSubmission';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { notify } from '@/lib/notify';
import { ClientRequirementSubmissionModal } from '@/components/portal/ClientRequirementSubmissionModal';
import { LayoutGrid, List, RefreshCw, Search } from 'lucide-react';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

export default function ClientRequestsPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const searchParams = useSearchParams();
  const [facilities, setFacilities] = useState<IFacility[]>([]);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [selectedReq, setSelectedReq] = useState<IDataRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [facilityFilter, setFacilityFilter] = useState(() => {
    const fromUrl = searchParams.get('facilityId')?.toUpperCase();
    if (fromUrl) return fromUrl;
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('portalSelectedFacilityId');
      if (stored) return stored;
    }
    return '';
  });
  const [periodFilter, setPeriodFilter] = useState(() => {
    const fromUrl = searchParams.get('period')?.trim();
    if (fromUrl) return fromUrl;
    return readPortalPeriod();
  });
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [quickFilter, setQuickFilter] = useState('all');
  const [view, setView] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/facilities?portalScope=authorized', {
          credentials: 'include',
          cache: 'no-store',
        });
        const json = await res.json();
        if (res.ok && Array.isArray(json.data)) {
          setFacilities(dedupeFacilitiesById(json.data));
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  useEffect(() => {
    if (!facilities.length) return;
    const known = facilities.some((f) => f.facilityId === facilityFilter);
    if (!facilityFilter || !known) {
      setFacilityFilter(facilities[0].facilityId);
    }
  }, [facilities, facilityFilter]);

  const loadRequests = useCallback(async () => {
    if (!facilityFilter || !periodFilter) return;
    setLoading(true);
    setLoadError('');
    try {
      const params = new URLSearchParams({
        facilityId: facilityFilter,
        period: periodFilter,
      });
      const response = await fetch(`/api/requirements?${params.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Failed to load compliance requests.');
      const rows: IDataRequirement[] = Array.isArray(payload?.data) ? payload.data : [];
      const scoped = rows.filter(
        (r) =>
          r.facilityId?.toUpperCase() === facilityFilter.toUpperCase() &&
          r.period === periodFilter
      );
      setRequirements(scoped);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load compliance requests.';
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }, [facilityFilter, periodFilter]);

  useEffect(() => {
    if (!facilityFilter || !periodFilter) return;
    writePortalScope(facilityFilter, periodFilter);
    void loadRequests();
  }, [facilityFilter, periodFilter, loadRequests]);

  const categoryOptions = useMemo(
    () => [...new Set(requirements.map((item) => resolveDataCategoryLabel(item)))].sort(),
    [requirements]
  );

  const filteredForStats = useMemo(
    () =>
      requirements.filter((item) => {
        const category = resolveDataCategoryLabel(item);
        const haystack =
          `${item.requestId || ''} ${item.title} ${item.facilityId} ${item.facilityName || ''} ${category}`.toLowerCase();
        const workflow = item.workflowStatus || item.verificationStatus;
        return (
          (!search.trim() || haystack.includes(search.trim().toLowerCase())) &&
          (statusFilter === 'ALL' || workflow === statusFilter) &&
          (categoryFilter === 'ALL' || category === categoryFilter)
        );
      }),
    [requirements, search, statusFilter, categoryFilter]
  );

  const stats = useMemo(() => computeRequestStats(filteredForStats), [filteredForStats]);

  const visibleRequirements = useMemo(
    () =>
      filteredForStats.filter(
        (item) => quickFilter === 'all' || matchesQuickFilter(item, quickFilter)
      ),
    [filteredForStats, quickFilter]
  );

  if (loading && !requirements.length) return <CarbonCrunchLoader message="Loading your data requests…" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <PageHeader onRefresh={() => void loadRequests()} count={visibleRequirements.length} />

      <PortalScopeSelectors
        facilities={dedupeFacilitiesById(
          facilities.length
            ? facilities
            : requirements.map((r) => ({ facilityId: r.facilityId, name: r.facilityName || r.facilityId }))
        )}
        facilityId={facilityFilter}
        period={periodFilter}
        onFacilityChange={setFacilityFilter}
        onPeriodChange={setPeriodFilter}
      />

      <DataRequestStatsBar
        stats={stats}
        totalFallback={filteredForStats.length}
        activeQuickFilter={quickFilter}
        onQuickFilter={(key) => setQuickFilter(key)}
      />

      <div className="sticky top-16 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 flex-wrap flex-1">
            {/* Search bar: small about w-72, aligned with the left */}
            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by ID, title, facility..."
                className="w-full pl-9 pr-3 h-[38px] rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 dark:focus:border-emerald-400 transition-all shadow-2xs"
              />
            </div>

            {/* MUI Category Dropdown */}
            <FormControl size="small" sx={{ minWidth: 160, maxWidth: 220 }}>
              <Select
                value={categoryFilter}
                onChange={(e: SelectChangeEvent) => setCategoryFilter(e.target.value)}
                sx={{
                  height: 38,
                  fontSize: '12px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#020617' : '#FFFFFF',
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
                <MenuItem value="ALL" sx={{ fontSize: '12px' }}>All categories</MenuItem>
                {categoryOptions.map((c) => (
                  <MenuItem key={c} value={c} sx={{ fontSize: '12px' }}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* MUI Status Dropdown */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={statusFilter}
                onChange={(e: SelectChangeEvent) => setStatusFilter(e.target.value)}
                sx={{
                  height: 38,
                  fontSize: '12px',
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#020617' : '#FFFFFF',
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
                <MenuItem value="ALL" sx={{ fontSize: '12px' }}>All statuses</MenuItem>
                <MenuItem value="REQUESTED" sx={{ fontSize: '12px' }}>Requested</MenuItem>
                <MenuItem value="IN_PROGRESS" sx={{ fontSize: '12px' }}>In progress</MenuItem>
                <MenuItem value="SUBMITTED" sx={{ fontSize: '12px' }}>Submitted</MenuItem>
                <MenuItem value="UNDER_REVIEW" sx={{ fontSize: '12px' }}>Under review</MenuItem>
                <MenuItem value="CHANGES_REQUESTED" sx={{ fontSize: '12px' }}>Changes requested</MenuItem>
                <MenuItem value="RESUBMITTED" sx={{ fontSize: '12px' }}>Resubmitted</MenuItem>
                <MenuItem value="ACCEPTED" sx={{ fontSize: '12px' }}>Accepted</MenuItem>
                <MenuItem value="REJECTED" sx={{ fontSize: '12px' }}>Rejected</MenuItem>
              </Select>
            </FormControl>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            <ViewToggle view={view} onChange={setView} />
          </div>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30">
          {loadError}
        </div>
      )}

      {view === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {visibleRequirements.map((requirement) => (
            <DataRequestCard
              key={requirement._id}
              requirement={requirement}
              href={`/portal/requests/${requirement._id}`}
              primaryActionLabel={clientPortalPrimaryLabel(requirement)}
              onPrimaryAction={() => setSelectedReq(requirement)}
            />
          ))}
          {visibleRequirements.length === 0 && (
            <p className="col-span-full py-16 text-center text-sm text-slate-500 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              {requirements.length === 0
                ? 'No data requests are assigned to your facilities yet.'
                : 'No requests match your filters. Try clearing filters or refresh.'}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-sm">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500">
                <th className="p-3">Request</th>
                <th className="p-3">Facility</th>
                <th className="p-3">Category</th>
                <th className="p-3">Period</th>
                <th className="p-3">Due</th>
                <th className="p-3">Consultant</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleRequirements.map((requirement) => (
                <tr key={requirement._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="p-3">
                    <div className="font-semibold text-slate-900 dark:text-white">{requirement.title}</div>
                    <div className="font-mono text-[10px] text-emerald-700">{requirement.requestId}</div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium">{requirement.facilityName || requirement.facilityId}</div>
                    <div className="font-mono text-[10px] text-slate-500">{requirement.facilityId}</div>
                  </td>
                  <td className="p-3">{resolveDataCategoryLabel(requirement)}</td>
                  <td className="p-3 font-mono">{requirement.period}</td>
                  <td className="p-3">{requirement.dueDate ? formatDate(requirement.dueDate) : '—'}</td>
                  <td className="p-3">{requirement.requestedByName || '—'}</td>
                  <td className="p-3">
                    <StatusBadge
                      status={requirement.workflowStatus || requirement.verificationStatus}
                      type="verification"
                      size="sm"
                    />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedReq(requirement)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-[10px]"
                    >
                      {clientPortalPrimaryLabel(requirement)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClientRequirementSubmissionModal
        requirement={selectedReq}
        scopeFacilityId={facilityFilter}
        scopeFacilityName={
          facilities.find((f) => f.facilityId.toUpperCase() === facilityFilter.toUpperCase())?.name
        }
        scopePeriod={periodFilter}
        onClose={() => setSelectedReq(null)}
        onSubmitted={loadRequests}
      />
    </div>
  );
}

function PageHeader({ onRefresh, count }: { onRefresh: () => void; count: number }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Data Requests</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {count} request{count === 1 ? '' : 's'} shown · submit data and Google Drive evidence for your consultant review.
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Refresh
      </button>
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: 'cards' | 'table'; onChange: (v: 'cards' | 'table') => void }) {
  return (
    <div className="inline-flex border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden h-[38px] bg-white dark:bg-slate-900 shadow-2xs">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`px-3 flex items-center justify-center transition-colors ${view === 'cards' ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        title="Cards"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`px-3 flex items-center justify-center transition-colors ${view === 'table' ? 'bg-emerald-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        title="Table"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}