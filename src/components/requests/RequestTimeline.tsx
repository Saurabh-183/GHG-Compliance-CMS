'use client';

import React from 'react';
import type { IDataRequirement, IRequestHistoryEntry } from '@/types';
import { formatDate } from '@/lib/utils';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Clock3 } from 'lucide-react';

export function RequestTimeline({ requirement }: { requirement: IDataRequirement }) {
  const history = [...(requirement.history || [])].sort(
    (a, b) =>
      new Date(String(b.changedAt)).getTime() - new Date(String(a.changedAt)).getTime()
  );

  const submissionEvents =
    requirement.submissionHistory?.map((entry) => ({
      status: entry.version > 1 ? ('RESUBMITTED' as const) : ('SUBMITTED' as const),
      changedAt: entry.submittedAt,
      changedBy: entry.submittedBy,
      comment: entry.comment,
      version: entry.version,
    })) || [];

  const merged: Array<IRequestHistoryEntry & { version?: number }> = [
    ...history,
    ...submissionEvents.map((e) => ({
      status: e.status,
      changedAt: e.changedAt,
      changedBy: e.changedBy,
      comment: e.comment ? `v${e.version}: ${e.comment}` : `Submission version ${e.version}`,
      version: e.version,
    })),
  ].sort(
    (a, b) => new Date(String(b.changedAt)).getTime() - new Date(String(a.changedAt)).getTime()
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
              <span className="text-slate-600 dark:text-slate-300 font-medium">{entry.changedBy}</span>
              <span className="text-slate-400">{formatDate(String(entry.changedAt))}</span>
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