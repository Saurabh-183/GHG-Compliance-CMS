'use client';

import React, { useMemo } from 'react';
import type { IFacility } from '@/types';
import { CalendarRange, Building2 } from 'lucide-react';
import { PORTAL_PERIOD_OPTIONS, dedupeFacilitiesById } from '@/lib/portalScope';

export interface PortalScopeSelectorsProps {
  facilities: Array<Pick<IFacility, 'facilityId' | 'name'>>;
  facilityId: string;
  period: string;
  onFacilityChange: (facilityId: string) => void;
  onPeriodChange: (period: string) => void;
  className?: string;
  compact?: boolean;
}

export function PortalScopeSelectors({
  facilities,
  facilityId,
  period,
  onFacilityChange,
  onPeriodChange,
  className = '',
  compact = false,
}: PortalScopeSelectorsProps) {
  const uniqueFacilities = useMemo(() => dedupeFacilitiesById(facilities), [facilities]);

  return (
    <div
      className={`flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 rounded-xl border border-emerald-200/80 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 px-4 py-3 ${className}`}
    >
      {!compact && (
        <p className="text-[11px] text-slate-600 dark:text-slate-300 w-full sm:w-auto sm:flex-1 min-w-0">
          Select <strong>facility</strong> and <strong>financial year</strong> — same as consultant workspace. Data
          requests load for that scope only.
        </p>
      )}
      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
        <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="font-semibold whitespace-nowrap">Facility</span>
        <select
          value={facilityId}
          onChange={(e) => onFacilityChange(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-medium min-w-[11rem]"
        >
          {uniqueFacilities.length === 0 ? (
            <option value="">—</option>
          ) : (
            uniqueFacilities.map((f) => (
              <option key={f.facilityId.toUpperCase()} value={f.facilityId}>
                {f.name || f.facilityId}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200">
        <CalendarRange className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="font-semibold whitespace-nowrap">Financial year</span>
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-mono min-w-[8rem]"
        >
          {PORTAL_PERIOD_OPTIONS.map((fy) => (
            <option key={fy} value={fy}>
              {fy}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}