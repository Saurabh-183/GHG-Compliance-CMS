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

export default function ClientRequestsPage() {
  const searchParams = useSearchParams();
  const [facilities, setFacilities] = useState<IFacility[]>([]);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [selectedReq, setSelectedReq] = useState<IDataRequirement | null>(null);
  const [loading, setLoading] = useState(true);
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
      const rows = Array.isArray(payload?.data) ? payload.data : [];
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

      <div className="sticky top-16 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by request ID, title, facility or category…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded-xl border px-3 py-2.5 text-xs max-w-[160px] dark:bg-slate-950"
            >
              <option value="ALL">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border px-3 py-2.5 text-xs dark:bg-slate-950"
            >
              <option value="ALL">All statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="CHANGES_REQUESTED">Changes requested</option>
              <option value="RESUBMITTED">Resubmitted</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="REJECTED">Rejected</option>
            </select>
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
    <div className="inline-flex border rounded-xl overflow-hidden h-[42px]">
      <button
        type="button"
        onClick={() => onChange('cards')}
        className={`px-3 ${view === 'cards' ? 'bg-emerald-700 text-white' : ''}`}
        title="Cards"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        className={`px-3 ${view === 'table' ? 'bg-emerald-700 text-white' : ''}`}
        title="Table"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}