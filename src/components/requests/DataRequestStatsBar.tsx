'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileStack,
  Inbox,
  RefreshCw,
  Send,
} from 'lucide-react';
import type { RequestStats } from '@/lib/requestStats';

export type { RequestStats } from '@/lib/requestStats';

type StatKey = 'all' | 'pendingSubmission' | 'submitted' | 'underReview' | 'changesRequested' | 'accepted' | 'overdue';

const ITEMS: Array<{
  key: StatKey;
  label: string;
  statKey?: keyof RequestStats;
  icon: React.ElementType;
  accent: string;
}> = [
  { key: 'all', label: 'Total requests', statKey: 'total', icon: FileStack, accent: 'emerald' },
  { key: 'pendingSubmission', label: 'Pending submission', statKey: 'pendingSubmission', icon: Inbox, accent: 'sky' },
  { key: 'submitted', label: 'Submitted', statKey: 'submitted', icon: Send, accent: 'indigo' },
  { key: 'underReview', label: 'Under review', statKey: 'underReview', icon: Clock3, accent: 'amber' },
  { key: 'changesRequested', label: 'Changes needed', statKey: 'changesRequested', icon: RefreshCw, accent: 'rose' },
  { key: 'accepted', label: 'Accepted', statKey: 'accepted', icon: CheckCircle2, accent: 'green' },
  { key: 'overdue', label: 'Overdue', statKey: 'overdue', icon: AlertTriangle, accent: 'red' },
];

const accentMap: Record<string, { border: string; bg: string; icon: string; ring: string }> = {
  emerald: {
    border: 'border-emerald-200 dark:border-emerald-800/40',
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    icon: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500',
  },
  sky: {
    border: 'border-sky-200 dark:border-sky-800/40',
    bg: 'bg-sky-50/70 dark:bg-sky-950/20',
    icon: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-500',
  },
  indigo: {
    border: 'border-indigo-200 dark:border-indigo-800/40',
    bg: 'bg-indigo-50/70 dark:bg-indigo-950/20',
    icon: 'text-indigo-600 dark:text-indigo-400',
    ring: 'ring-indigo-500',
  },
  amber: {
    border: 'border-amber-200 dark:border-amber-800/40',
    bg: 'bg-amber-50/70 dark:bg-amber-950/20',
    icon: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500',
  },
  rose: {
    border: 'border-rose-200 dark:border-rose-800/40',
    bg: 'bg-rose-50/70 dark:bg-rose-950/20',
    icon: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500',
  },
  green: {
    border: 'border-green-200 dark:border-green-800/40',
    bg: 'bg-green-50/70 dark:bg-green-950/20',
    icon: 'text-green-600 dark:text-green-400',
    ring: 'ring-green-500',
  },
  red: {
    border: 'border-red-200 dark:border-red-800/40',
    bg: 'bg-red-50/70 dark:bg-red-950/20',
    icon: 'text-red-600 dark:text-red-400',
    ring: 'ring-red-500',
  },
};

export function DataRequestStatsBar({
  stats,
  totalFallback,
  activeQuickFilter,
  onQuickFilter,
}: {
  stats: RequestStats | null;
  totalFallback?: number;
  activeQuickFilter: string;
  onQuickFilter: (key: StatKey) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
      {ITEMS.map((item) => {
        const value =
          item.key === 'all'
            ? stats?.total ?? totalFallback ?? 0
            : item.statKey
              ? stats?.[item.statKey] ?? 0
              : 0;
        const active = activeQuickFilter === item.key;
        const style = accentMap[item.accent];
        const Icon = item.icon;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onQuickFilter(item.key)}
            className={`rounded-2xl border p-4 text-left transition-all hover:shadow-md ${style.border} ${style.bg} ${
              active
                ? `ring-2 ${style.ring} shadow-sm bg-white dark:bg-slate-900 border-transparent`
                : 'hover:bg-white dark:hover:bg-slate-900/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Icon className={`w-4 h-4 shrink-0 ${style.icon}`} />
              <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">{value}</span>
            </div>
            <p
              className={`mt-2 text-[10px] font-semibold uppercase tracking-wide leading-tight ${
                active
                  ? 'text-slate-900 dark:text-white font-bold'
                  : 'text-slate-500 dark:text-slate-300'
              }`}
            >
              {item.label}
            </p>
          </button>
        );
      })}
    </div>
  );
}