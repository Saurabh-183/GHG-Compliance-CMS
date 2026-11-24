'use client';

import React from 'react';
import Link from 'next/link';
import type { IDataRequirement } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  getDueUrgency,
  PRIORITY_STYLES,
  requestCompletionPercent,
  resolveDataCategoryLabel,
} from '@/lib/dataRequestDisplay';
import { formatDate } from '@/lib/utils';
import { Building2, Calendar, ChevronRight, UserCircle } from 'lucide-react';

export function DataRequestCard({
  requirement,
  href,
  onPrimaryAction,
  primaryActionLabel,
}: {
  requirement: IDataRequirement;
  href: string;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
}) {
  const category = resolveDataCategoryLabel(requirement);
  const urgency = getDueUrgency(requirement.dueDate, requirement.workflowStatus);
  const progress = requestCompletionPercent(requirement);
  const status = requirement.workflowStatus || requirement.verificationStatus;

  const dueClass =
    urgency === 'overdue'
      ? 'text-rose-600 dark:text-rose-400 font-bold'
      : urgency === 'soon'
        ? 'text-amber-600 dark:text-amber-400 font-semibold'
        : 'text-slate-600 dark:text-slate-300';

  const cardBorderClass =
    urgency === 'overdue'
      ? 'border-rose-500/80 ring-2 ring-rose-500/20 bg-rose-50/15 dark:bg-rose-950/20 hover:border-rose-500'
      : urgency === 'soon'
        ? 'border-amber-400/80 dark:border-amber-600/60 ring-1 ring-amber-400/20 bg-amber-50/10 dark:bg-amber-950/10 hover:border-amber-500'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-emerald-300/60 dark:hover:border-emerald-800/60';

  return (
    <article className={`group rounded-xl border ${cardBorderClass} shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col`}>
      <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4 flex flex-col flex-1 gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-1">
              {category}
            </span>
            <Link href={href} className="block font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 line-clamp-2">
              {requirement.title}
            </Link>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">{requirement.requestId}</p>
          </div>
          {requirement.priority && (
            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[9px] font-bold border ${PRIORITY_STYLES[requirement.priority]}`}>
              {requirement.priority}
            </span>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{requirement.description}</p>

        <dl className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              <span className="font-semibold">{requirement.facilityName || requirement.facilityId}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            {requirement.period}
          </div>
          <div className={`flex items-center gap-1.5 ${dueClass}`}>
            <span className="text-slate-400">Due</span>
            {requirement.dueDate ? formatDate(requirement.dueDate) : '—'}
            {urgency === 'overdue' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-600 text-white shadow-2xs">
                Overdue
              </span>
            )}
            {urgency === 'soon' && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500 text-white shadow-2xs">
                Due Soon
              </span>
            )}
          </div>
          {requirement.requestedByName && (
            <div className="flex items-center gap-1.5 text-slate-500 truncate">
              <UserCircle className="w-3.5 h-3.5 shrink-0" />
              {requirement.requestedByName}
            </div>
          )}
        </dl>

        <div className="flex flex-wrap gap-1">
          {(requirement.linkedCompliances || []).map((c) => (
            <span
              key={c}
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              {c}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <StatusBadge status={status} type="verification" size="sm" />
          <div className="flex items-center gap-2">
            {onPrimaryAction && primaryActionLabel && (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold"
              >
                {primaryActionLabel}
              </button>
            )}
            <Link
              href={href}
              className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 group-hover:gap-1 transition-all"
            >
              Details <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {requirement.reviewNote && ['CHANGES_REQUESTED', 'REJECTED', 'CLARIFICATION_REQUIRED'].includes(status) && (
          <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/90 dark:bg-amber-950/30 px-3 py-2 text-[10px] text-amber-950 dark:text-amber-100">
            <strong>{requirement.reviewedByName || 'Consultant'}:</strong> {requirement.reviewNote}
          </div>
        )}
      </div>
    </article>
  );
}