'use client';

import React, { useMemo } from 'react';
import type { IFacility } from '@/types';
import { CalendarRange, Building2 } from 'lucide-react';
import { PORTAL_PERIOD_OPTIONS, dedupeFacilitiesById } from '@/lib/portalScope';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

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
  const { theme } = useAuth();
  const isDark = theme === 'dark';
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
      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 shrink-0">
        <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="font-semibold whitespace-nowrap">Facility</span>
        <FormControl size="small" sx={{ minWidth: 200, maxWidth: 320 }}>
          <Select
            value={facilityId}
            onChange={(e: SelectChangeEvent) => onFacilityChange(e.target.value)}
            displayEmpty
            sx={{
              height: 36,
              fontSize: '12px',
              fontWeight: 500,
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
            {uniqueFacilities.length === 0 ? (
              <MenuItem value="" sx={{ fontSize: '12px' }}>—</MenuItem>
            ) : (
              uniqueFacilities.map((f) => (
                <MenuItem key={f.facilityId.toUpperCase()} value={f.facilityId} sx={{ fontSize: '12px' }}>
                  {f.name || f.facilityId}
                </MenuItem>
              ))
            )}
          </Select>
        </FormControl>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-200 shrink-0">
        <CalendarRange className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="font-semibold whitespace-nowrap">Financial year</span>
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <Select
            value={period}
            onChange={(e: SelectChangeEvent) => onPeriodChange(e.target.value)}
            sx={{
              height: 36,
              fontSize: '12px',
              fontFamily: 'monospace',
              fontWeight: 600,
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
                    maxHeight: 280,
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                    '& .MuiList-root': { py: '4px' },
                  },
                },
              },
            }}
          >
            {PORTAL_PERIOD_OPTIONS.map((fy) => (
              <MenuItem key={fy} value={fy} sx={{ fontSize: '12px', fontFamily: 'monospace' }}>
                {fy}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>
    </div>
  );
}