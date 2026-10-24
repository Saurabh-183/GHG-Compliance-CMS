'use client';

import React, { useEffect, useState } from 'react';
import { ICalendarItem } from '@/types';
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
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { notify } from '@/lib/notify';

export default function ComplianceCalendarPage() {
  const [items, setItems] = useState<ICalendarItem[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [extendingItem, setExtendingItem] = useState<ICalendarItem | null>(null);
  const [newDueDate, setNewDueDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [notificationRef, setNotificationRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCalendar = async () => {
    try {
      const res = await fetch('/api/calendar');
      if (res.ok) {
        const json = (await res.json()) as { data: ICalendarItem[] };
        setItems(json.data || []);
      }
    } catch (e) {
      console.error(e);
      notify.error('Failed to load compliance calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, []);

  const handleExtendDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extendingItem || !newDueDate || !extensionReason || !notificationRef) {
      notify.warning('Please fill in all extension fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: extendingItem._id,
          newDate: newDueDate,
          reason: extensionReason,
          notificationRef,
        }),
      });
      if (res.ok) {
        notify.success(`Statutory deadline extended to ${newDueDate}`);
        setExtendingItem(null);
        setNewDueDate('');
        setExtensionReason('');
        setNotificationRef('');
        await loadCalendar();
      } else {
        notify.error('Failed to record deadline extension');
      }
    } catch (err) {
      notify.error('Network error updating deadline');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <CarbonCrunchLoader message="Loading statutory compliance calendar..." />;
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'ALL') return true;
    return item.complianceType === filter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CalendarIcon className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
            Centralized Statutory Compliance Calendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracking statutory due dates, internal review milestones, client submission cut-offs, and CEA recurring returns.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
          {['ALL', 'RCO', 'PAT', 'CCTS', 'CEA'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                filter === cat
                  ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Deadlines Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-md space-y-4">
        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Facility</th>
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
              {filteredItems.map((item) => (
                <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-200">{item.facilityName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{item.facilityId}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-emerald-800 border border-slate-300 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700">
                      {item.complianceType}
                    </span>
                    {item.isRecurringCEA && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                        Monthly Recurring
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono">
                    {item.reportingPeriod}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono">
                    {formatDate(item.clientDataSubmissionDeadline)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono">
                    {formatDate(item.internalDeadline)}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                    {formatDate(item.regulatoryDueDate)}
                    {item.extensionHistory.length > 0 && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                        <History className="w-3 h-3" />
                        <span>Extended ({item.extensionHistory.length}x)</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={item.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => {
                        setExtendingItem(item);
                        setNewDueDate(item.regulatoryDueDate.split('T')[0]);
                      }}
                      className="px-2.5 py-1 text-[11px] rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-transparent transition-colors shadow-2xs"
                    >
                      Extend
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deadline Extension Modal (PRD Section 9: Deadline extension tracking with revision log) */}
      {extendingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              Log Statutory Deadline Extension
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {extendingItem.facilityName} · {extendingItem.complianceType} ({extendingItem.reportingPeriod})
            </p>

            <form onSubmit={handleExtendDeadline} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Statutory Due Date:
                </label>
                <input
                  type="date"
                  required
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
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
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Extension Justification / Regulatory Reason:
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Sector-wide extension notified by Ministry of Power for PAT Cycle data audits."
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExtendingItem(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Logging...' : 'Save Extension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
