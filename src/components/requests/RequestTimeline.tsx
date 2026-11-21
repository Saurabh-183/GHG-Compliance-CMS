'use client';

import React from 'react';
import type { IDataRequirement, IRequestHistoryEntry } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Clock3 } from 'lucide-react';

export function RequestTimeline({ requirement }: { requirement: IDataRequirement }) {
  const rawHistory: Array<IRequestHistoryEntry & { version?: number }> = [
    ...(requirement.history || []),
  ];

  const submissionEvents =
    requirement.submissionHistory?.map((entry) => ({
      status: (entry.version > 1 ? 'RESUBMITTED' : 'SUBMITTED') as IRequestHistoryEntry['status'],
      changedAt: entry.submittedAt,
      changedBy: entry.submittedBy,
      comment: entry.comment
        ? `v${entry.version}: ${entry.comment}`
        : `Submission version ${entry.version}`,
      version: entry.version,
    })) || [];

  // Match submissionEvents with existing history entries so they aren't shown twice
  const matchedSubIndexes = new Set<number>();
  const enrichedHistory = rawHistory.map((h) => {
    if (h.status === 'SUBMITTED' || h.status === 'RESUBMITTED') {
      const hTime = new Date(String(h.changedAt)).getTime();
      let bestIdx = -1;
      let minDiff = 10000; // within 10 seconds
      submissionEvents.forEach((sub, idx) => {
        if (!matchedSubIndexes.has(idx) && sub.status === h.status) {
          const sTime = new Date(String(sub.changedAt)).getTime();
          const diff = Math.abs(hTime - sTime);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = idx;
          }
        }
      });
      if (bestIdx !== -1) {
        matchedSubIndexes.add(bestIdx);
        const sub = submissionEvents[bestIdx];
        return {
          ...h,
          version: sub.version,
          comment: h.comment || sub.comment,
        };
      }
    }
    return h;
  });

  const remainingSubmissions = submissionEvents.filter(
    (_, idx) => !matchedSubIndexes.has(idx)
  );

  const merged: Array<IRequestHistoryEntry & { version?: number }> = [
    ...enrichedHistory,
    ...remainingSubmissions,
  ].sort(
    (a, b) =>
      new Date(String(b.changedAt)).getTime() - new Date(String(a.changedAt)).getTime()
  );

  if (merged.length === 0) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400 py-2">No timeline events yet.</p>
    );
  }

  return (
    <ol className="space-y-3">
      {merged.map((entry, index) => (
        <li
          key={`${entry.status}-${String(entry.changedAt)}-${index}`}
          className="flex gap-3 items-start text-xs"
        >
          <Clock3 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={entry.status} type="verification" size="sm" />
              <span className="text-slate-700 dark:text-slate-200 font-semibold">{entry.changedBy}</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                {formatDateTime(entry.changedAt)}
              </span>
            </div>
            {entry.comment && (
              <p className="mt-1 text-slate-600 dark:text-slate-400 leading-relaxed">{entry.comment}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}