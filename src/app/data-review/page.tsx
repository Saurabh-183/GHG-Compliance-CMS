'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ClipboardCheck, ExternalLink, ChevronDown } from 'lucide-react';
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { ClientSubmissionsReviewTable } from '@/components/uploads/ClientSubmissionsReviewTable';
import { CompanySelectMui } from '@/components/dashboard/CompanySelectMui';
import { FacilitySelectMui } from '@/components/dashboard/FacilitySelectMui';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { MOCK_CLIENT_GROUPS } from '@/lib/mockFallback';
import { COMPLIANCE_PERIODS } from '@/lib/complianceMatrixData';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { useAuth } from '@/context/AuthContext';
import type { IClientGroup, IFacility } from '@/types';

const ALL_FACILITIES_VALUE = '__ALL_FACILITIES__';

export default function DataReviewPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const [groups, setGroups] = useState<IClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedFacilityId, setSelectedFacilityId] = useState(ALL_FACILITIES_VALUE);
  const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_CHECKLIST_PERIOD);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/client-groups', { credentials: 'include' });
        if (res.ok) {
          const json = (await res.json()) as { data?: IClientGroup[] };
          setGroups(json.data?.length ? json.data : MOCK_CLIENT_GROUPS);
        } else {
          setGroups(MOCK_CLIENT_GROUPS);
        }
      } catch {
        setGroups(MOCK_CLIENT_GROUPS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedGroup = groups.find(
    (group) => group._id === selectedCompanyId || group.code === selectedCompanyId
  );

  const allFacilities: IFacility[] = useMemo(
    () => groups.flatMap((group) => group.facilities || []),
    [groups]
  );

  const currentFacilities: IFacility[] = useMemo(() => {
    if (!selectedGroup) return allFacilities;
    if (selectedGroup.facilities?.length) return selectedGroup.facilities;
    return allFacilities.filter((f) => f.clientGroupId === selectedGroup._id);
  }, [selectedGroup, allFacilities]);

  useEffect(() => {
    if (currentFacilities.length === 0) {
      setSelectedFacilityId(ALL_FACILITIES_VALUE);
      return;
    }
    if (currentFacilities.length === 1) {
      setSelectedFacilityId(currentFacilities[0].facilityId);
      return;
    }
    setSelectedFacilityId((prev) => {
      if (prev === ALL_FACILITIES_VALUE) return prev;
      if (currentFacilities.some((f) => f.facilityId === prev)) return prev;
      return ALL_FACILITIES_VALUE;
    });
  }, [selectedCompanyId, currentFacilities]);

  const facilityIdForApi =
    selectedFacilityId && selectedFacilityId !== ALL_FACILITIES_VALUE
      ? selectedFacilityId
      : undefined;

  const clientGroupIdForApi =
    selectedGroup?._id?.toString() && selectedCompanyId !== 'ALL'
      ? selectedGroup._id.toString()
      : undefined;

  const activeFacilityName = currentFacilities.find((f) => f.facilityId === selectedFacilityId)?.name;

  if (loading) {
    return <CarbonCrunchLoader message="Loading data review workspace…" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <header className="p-4 rounded-lg pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-emerald-600" />
            Data Review
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review client submissions, run field-level checks, request changes, or accept approved data.
            Same records as the dashboard — one row per request (latest client evidence).
          </p>
        </div>
        {/* <Link
          href="/client-uploads"
          className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0"
        >
          Drive vault mapping <ExternalLink className="w-3 h-3" />
        </Link> */}
      </header>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm space-y-3">
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Filter by organization, facility, and financial year — same scope as the consultant dashboard and client
          portal.
        </p>
        <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-3">
          <CompanySelectMui
            groups={groups}
            selectedCompanyId={selectedCompanyId}
            onCompanyChange={(id) => setSelectedCompanyId(id)}
          />
          {currentFacilities.length > 0 && (
            <FacilitySelectMui
              facilities={currentFacilities}
              selectedFacilityId={selectedFacilityId}
              onFacilityChange={setSelectedFacilityId}
              allowAll={currentFacilities.length > 1}
            />
          )}
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold whitespace-nowrap">Financial year</span>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <Select
                value={selectedPeriod}
                onChange={(e: SelectChangeEvent) => setSelectedPeriod(e.target.value)}
                IconComponent={() => (
                  <ChevronDown
                    className="w-4 h-4 pointer-events-none"
                    style={{
                      color: isDark ? '#94A3B8' : '#64748B',
                      marginRight: 8,
                    }}
                  />
                )}
                sx={{
                  height: 38,
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
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
                        boxShadow: isDark
                          ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                          : '0 10px 25px -5px rgba(16, 185, 129, 0.12)',
                        '& .MuiList-root': { py: '4px' },
                      },
                    },
                  },
                }}
              >
                {COMPLIANCE_PERIODS.map((fy) => (
                  <MenuItem
                    key={fy}
                    value={fy}
                    sx={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: selectedPeriod === fy ? 600 : 400,
                      py: 0.75,
                      px: 1.5,
                      borderRadius: '6px',
                      mx: 0.5,
                      my: 0.25,
                      '&.Mui-selected': {
                        backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                        color: isDark ? '#34D399' : '#059669',
                        '&:hover': {
                          backgroundColor: isDark ? 'rgba(52, 211, 153, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                        },
                      },
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    {fy}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Showing{' '}
          <strong className="text-slate-700 dark:text-slate-200">
            {selectedGroup?.name ?? 'All client companies'}
          </strong>
          {' · '}
          <strong className="text-slate-700 dark:text-slate-200">
            {facilityIdForApi ? activeFacilityName || facilityIdForApi : 'All units in scope'}
          </strong>
          {' · '}
          <strong className="text-slate-700 dark:text-slate-200 font-mono">{selectedPeriod}</strong>
        </p>
      </div>

      <ClientSubmissionsReviewTable
        showWorkflowFilter
        clientGroupId={clientGroupIdForApi}
        facilityId={facilityIdForApi}
        period={selectedPeriod}
      />
    </div>
  );
}