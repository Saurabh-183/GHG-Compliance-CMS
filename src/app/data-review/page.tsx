'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { IDataRequirement } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RequestReviewPanel } from '@/components/requests/RequestReviewPanel';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { ClipboardCheck, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function DataReviewPage() {
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<IDataRequirement | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requirements', { cache: 'no-store' });
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      setRequirements(
        rows.filter((r: IDataRequirement) =>
          ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED'].includes(
            r.workflowStatus || ''
          ) || (r.submittedDriveLinks?.length ?? 0) > 0
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = requirements.filter(
    (r) => statusFilter === 'ALL' || (r.workflowStatus || '') === statusFilter
  );

  if (loading) return <CarbonCrunchLoader message="Loading submissions for review…" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header className="pb-4 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-emerald-600" />
          Data Review
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Review client submissions, run field-level checks, request changes, or accept approved data.
        </p>
      </header>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs"
      >
        <option value="ALL">All review states</option>
        <option value="SUBMITTED">Submitted</option>
        <option value="RESUBMITTED">Resubmitted</option>
        <option value="UNDER_REVIEW">Under review</option>
        <option value="CHANGES_REQUESTED">Changes requested</option>
        <option value="ACCEPTED">Accepted</option>
      </select>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500">
              <th className="p-3">Request ID</th>
              <th className="p-3">Title</th>
              <th className="p-3">Facility</th>
              <th className="p-3">Category</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visible.map((req) => {
              const last = req.submissionHistory?.[req.submissionHistory.length - 1];
              return (
                <tr key={req._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="p-3 font-mono text-emerald-700">{req.requestId}</td>
                  <td className="p-3 font-semibold">{req.title}</td>
                  <td className="p-3 font-mono">{req.facilityId}</td>
                  <td className="p-3">{req.dataCategory || req.brsrSection || '—'}</td>
                  <td className="p-3">{last?.submittedAt ? formatDate(last.submittedAt) : '—'}</td>
                  <td className="p-3">
                    <StatusBadge status={req.workflowStatus || 'SUBMITTED'} type="verification" size="sm" />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      type="button"
                      onClick={() => setSelected(req)}
                      className="px-3 py-1.5 rounded-lg bg-[#17365D] dark:bg-[#A56F63] text-white font-bold"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold">{selected.title}</h2>
                <p className="text-[11px] font-mono text-emerald-700">{selected.requestId}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-2 text-slate-400 hover:text-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>
            <RequestReviewPanel
              requirement={selected}
              onReviewed={async () => {
                setSelected(null);
                await load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}