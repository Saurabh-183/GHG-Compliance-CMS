'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { ComplianceType, ICalendarItem, IClientGroup, IFacility } from '@/types';
import type { CalendarViewRow } from '@/lib/complianceCalendarView';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Calendar as CalendarIcon,
  Clock,
  Building2,
  AlertCircle,
  CheckCircle2,
  Plus,
  RefreshCw,
  History,
  Search,
  RotateCcw,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { notify } from '@/lib/notify';
import { MOCK_CLIENT_GROUPS } from '@/lib/mockFallback';
import { CompanySelectMui } from '@/components/dashboard/CompanySelectMui';
import { MuiDatePicker } from '@/components/common/MuiDatePicker';
import { useAuth } from '@/context/AuthContext';
import {
  generateDeadlinesForFacilities,
  generateAllClientDeadlines,
} from '@/lib/statutoryCalendar';

export default function ComplianceCalendarPage() {
  const { currentRole, currentUser } = useAuth();
  const isAdmin = currentRole === 'ADMIN' || currentUser?.role === 'ADMIN';
  const isConsultant = currentRole === 'CONSULTANT' || currentUser?.role === 'CONSULTANT';

  const [items, setItems] = useState<ICalendarItem[]>([]);
  const [groups, setGroups] = useState<IClientGroup[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [filter, setFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [extendingItem, setExtendingItem] = useState<ICalendarItem | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [notificationRef, setNotificationRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [calRes, groupsRes] = await Promise.all([
        fetch('/api/calendar', { credentials: 'include', cache: 'no-store' }).catch(() => null),
        fetch('/api/client-groups', { credentials: 'include', cache: 'no-store' }).catch(() => null),
      ]);

      if (calRes && calRes.ok) {
        const json = (await calRes.json()) as { success?: boolean; data?: ICalendarItem[] };
        if (json.success !== false) {
          setItems(json.data || []);
        } else {
          notify.error('Could not load calendar from server');
          setItems([]);
        }
      } else if (calRes) {
        notify.error('Could not load compliance calendar');
        setItems([]);
      }

      if (groupsRes && groupsRes.ok) {
        const json = (await groupsRes.json()) as { data: IClientGroup[] };
        if (json.data && json.data.length > 0) {
          setGroups(json.data);
        } else {
          setGroups(MOCK_CLIENT_GROUPS);
        }
      } else {
        setGroups(MOCK_CLIENT_GROUPS);
      }
    } catch (e) {
      console.error(e);
      notify.error('Failed to load compliance calendar');
      setGroups(MOCK_CLIENT_GROUPS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const companyParam = params.get('company');
      const searchParam = params.get('search');
      if (companyParam) {
        setSelectedCompanyId(companyParam);
      } else if (searchParam) {
        setSearchQuery(searchParam);
      }
    }
  }, []);

  const handleExtendDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAdmin) {
      notify.error('Admins do not have permission to extend due dates.');
      setExtendingItem(null);
      return;
    }
    if (!extendingItem || !newDueDate || !extensionReason || !notificationRef) {
      notify.warning('Please fill in all extension fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          itemId: extendingItem._id,
          newDate: newDueDate,
          reason: extensionReason,
          notificationRef,
        }),
      });
      if (res.ok) {
        notify.success(`Due date updated — synced to data requests and client portal`);
        setExtendingItem(null);
        setNewDueDate('');
        setExtensionReason('');
        setNotificationRef('');
        await loadData();
      } else {
        const json = await res.json().catch(() => null);
        notify.error(json?.error || 'Failed to record deadline extension');
      }
    } catch (err) {
      notify.error('Network error updating deadline');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Identify currently selected group
  const activeGroups = groups.length > 0 ? groups : MOCK_CLIENT_GROUPS;
  const selectedGroup = activeGroups.find(
    (g) => g._id === selectedCompanyId || g.code === selectedCompanyId
  );

  // All facilities pool
  const allFacilities: IFacility[] = useMemo(
    () => activeGroups.flatMap((g) => g.facilities || []),
    [activeGroups]
  );

  // Filter facilities based on selected company
  const currentFacilities: IFacility[] = useMemo(() => {
    if (!selectedGroup) return allFacilities;
    if (selectedGroup.facilities && selectedGroup.facilities.length > 0) {
      return selectedGroup.facilities;
    }
    return allFacilities.filter((f) => f.clientGroupId === selectedGroup._id);
  }, [selectedGroup, allFacilities]);

  const companyItems: ICalendarItem[] = useMemo(() => {
    if (!selectedGroup) return items;
    const facilityIds = new Set(currentFacilities.map((f) => f.facilityId.toUpperCase()));
    return items.filter((item) => facilityIds.has(item.facilityId.toUpperCase()));
  }, [selectedGroup, currentFacilities, items]);

  // Apply compliance framework filter ('ALL', 'RCO', 'PAT', 'CCTS', 'CEA') and text search
  const filteredItems = useMemo(() => {
    return companyItems.filter((item) => {
      const row = item as CalendarViewRow;
      const frameworks =
        row.linkedFrameworks?.length ? row.linkedFrameworks : ([item.complianceType] as ComplianceType[]);
      const matchesFilter = filter === 'ALL' || frameworks.includes(filter as ComplianceType);
      const titleNeedle = row.requestTitle?.toLowerCase() || '';
      const matchesSearch =
        !searchQuery ||
        (item.facilityName && item.facilityName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.facilityId && item.facilityId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.reportingPeriod && item.reportingPeriod.toLowerCase().includes(searchQuery.toLowerCase())) ||
        titleNeedle.includes(searchQuery.toLowerCase()) ||
        (row.requestCode && row.requestCode.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [companyItems, filter, searchQuery]);

  if (loading) {
    return <CarbonCrunchLoader message="Loading statutory compliance calendar..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header with Title and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 shrink-0">
              <CalendarIcon className="w-5 h-5" />
            </span>
            Centralized Statutory Compliance Calendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            One row per consultant data request with a due date (financial year = reporting period). Extend updates the same request for clients.
            {selectedGroup && (
              <span className="ml-2 inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                · Company View: <strong>{selectedGroup.name}</strong> ({currentFacilities.length} Operating Units)
              </span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* MUI Company Filter Dropdown */}
          <CompanySelectMui
            groups={activeGroups}
            selectedCompanyId={selectedCompanyId}
            onCompanyChange={(id) => {
              setSelectedCompanyId(id);
              setSearchQuery('');
            }}
          />

          {/* Compliance Framework Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
            {['ALL', 'RCO', 'PAT', 'CCTS', 'CEA'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  filter === cat
                    ? 'bg-emerald-700 text-white !text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
                style={filter === cat ? { color: '#FFFFFF' } : undefined}
              >
                <span
                  className={filter === cat ? 'text-white !text-white font-bold' : ''}
                  style={filter === cat ? { color: '#FFFFFF' } : undefined}
                >
                  {cat}
                </span>
              </button>
            ))}
          </div>

          {/* Quick Facility Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search facility..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-44 sm:w-52 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Deadlines Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-md space-y-4">
        {/* Table Subheader showing filter status & count */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <span>
              {selectedGroup
                ? `${selectedGroup.name} Compliance Filings`
                : 'All Client Companies Compliance Filings'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold">
              {filteredItems.length} Obligations
            </span>
          </div>

          {selectedCompanyId !== 'ALL' && (
            <button
              onClick={() => {
                setSelectedCompanyId('ALL');
                setFilter('ALL');
                setSearchQuery('');
              }}
              className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 hover:underline font-semibold"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to All Companies</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-4">Facility / Unit</th>
                <th className="py-3 px-4">Compliance Framework</th>
                <th className="py-3 px-4">Reporting Period</th>
                <th className="py-3 px-4">Client Data Cut-off</th>
                <th className="py-3 px-4">Internal Deadline</th>
                <th className="py-3 px-4">Regulatory Due Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70 text-xs">
              {filteredItems.map((item) => {
                const row = item as CalendarViewRow;
                const extraFrameworks = (row.linkedFrameworks || []).filter((c) => c !== item.complianceType);
                return (
                <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{item.facilityName}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{item.facilityId}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-emerald-800 border border-slate-300 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700">
                      {item.complianceType}
                    </span>
                    {extraFrameworks.map((c) => (
                      <span
                        key={c}
                        className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-50 text-slate-600 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700"
                      >
                        {c}
                      </span>
                    ))}
                    {item.isRecurringCEA && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        Monthly Recurring
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                    <div className="font-mono text-xs">{item.reportingPeriod}</div>
                    {row.requestTitle && (
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2" title={row.requestTitle}>
                        {row.requestCode ? `${row.requestCode} · ` : ''}
                        {row.requestTitle}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono">
                    {row.hasDueDate ? formatDate(item.clientDataSubmissionDeadline) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono">
                    {row.hasDueDate ? formatDate(item.internalDeadline) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                    {row.hasDueDate ? formatDate(item.regulatoryDueDate) : (
                      <span className="text-rose-600 dark:text-rose-400 text-[11px] font-sans">Set due date</span>
                    )}
                    {item.extensionHistory && item.extensionHistory.length > 0 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                        <History className="w-3 h-3" />
                        <span>Extended ({item.extensionHistory.length}x)</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge
                      status={row.requestWorkflowStatus || row.requestSubmissionStatus || 'REQUESTED'}
                      type="verification"
                      size="sm"
                    />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {(() => {
                      const isAccepted = row.requestWorkflowStatus === 'ACCEPTED' || row.requestWorkflowStatus === 'CLOSED';
                      const canExtend = !isAdmin && isConsultant && !isAccepted;

                      if (canExtend) {
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setExtendingItem(item);
                              setNewDueDate(
                                row.hasDueDate && item.regulatoryDueDate
                                  ? item.regulatoryDueDate.split('T')[0]
                                  : ''
                              );
                            }}
                            className="px-2.5 py-1 text-[11px] rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-transparent transition-colors shadow-2xs font-medium cursor-pointer"
                          >
                            {row.hasDueDate ? 'Extend due date' : 'Set due date'}
                          </button>
                        );
                      }

                      if (isAccepted) {
                        return (
                          <span className="text-[11px] text-slate-400 font-medium select-none" title="Submission accepted — due date locked">
                            —
                          </span>
                        );
                      }

                      if (isAdmin) {
                        return (
                          <span className="text-[11px] text-slate-400 font-medium select-none" title="Admin view only — extensions reserved for consultants">
                            —
                          </span>
                        );
                      }

                      return (
                        <span className="text-[11px] text-slate-400 font-medium select-none">
                          —
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 ">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CalendarIcon className="w-8 h-8 text-slate-400 dark:text-slate-500 " />
                      <p>
                        No compliance deadlines found
                        {selectedGroup ? ` for ${selectedGroup.name}` : ''}
                        {filter !== 'ALL' ? ` under ${filter}` : ''}
                        {searchQuery ? ` matching "${searchQuery}"` : ''}.
                      </p>
                      {(selectedCompanyId !== 'ALL' || filter !== 'ALL' || searchQuery) && (
                        <button
                          onClick={() => {
                            setSelectedCompanyId('ALL');
                            setFilter('ALL');
                            setSearchQuery('');
                          }}
                          className="mt-1 text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                        >
                          Clear all filters & search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deadline Extension Modal (PRD Section 9: Deadline extension tracking with revision log) */}
      {extendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Log Statutory Deadline Extension
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {extendingItem.facilityName} · {extendingItem.complianceType} ({extendingItem.reportingPeriod})
            </p>

            <form onSubmit={handleExtendDeadline} className="space-y-3">
              <div>
                <MuiDatePicker
                  label="New Statutory Due Date:"
                  value={newDueDate}
                  onChange={setNewDueDate}
                  placeholder="dd-mm-yyyy"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Notification Reference:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BEE/Circular/Extension/2025/44"
                  value={notificationRef}
                  onChange={(e) => setNotificationRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Extension Justification / Regulatory Reason:
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide statutory justification citing ministry circular..."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900  dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setExtendingItem(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Extension...' : 'Confirm Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
