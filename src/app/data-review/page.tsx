'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ClipboardCheck, ExternalLink, ChevronDown, Search, X, Filter } from 'lucide-react';
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { RequirementsReviewTable, WORKFLOW_FILTER_OPTIONS } from '@/components/requests/RequirementsReviewTable';
import { CompanySelectMui } from '@/components/dashboard/CompanySelectMui';
import { FacilitySelectMui } from '@/components/dashboard/FacilitySelectMui';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { MOCK_CLIENT_GROUPS } from '@/lib/mockFallback';
import { COMPLIANCE_PERIODS } from '@/lib/complianceMatrixData';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { useAuth } from '@/context/AuthContext';
import type { IClientGroup, IFacility, IDataRequirement } from '@/types';

const ALL_FACILITIES_VALUE = '__ALL_FACILITIES__';

export default function DataReviewPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const [groups, setGroups] = useState<IClientGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState('ALL');
  const [selectedFacilityId, setSelectedFacilityId] = useState(ALL_FACILITIES_VALUE);
  const [selectedPeriod, setSelectedPeriod] = useState(DEFAULT_CHECKLIST_PERIOD);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState('ALL');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/client-groups', { credentials: 'include', cache: 'no-store' });
        if (res.ok) {
          const json = (await res.json()) as { data?: IClientGroup[] };
          const dbGroups = json.data || [];
          const dbNames = new Set(dbGroups.map((g) => g.name.trim().toLowerCase()));
          const dbCodes = new Set(dbGroups.map((g) => (g.code || '').trim().toLowerCase()));
          const dbIds = new Set(dbGroups.map((g) => String(g._id)));

          const filteredMocks = MOCK_CLIENT_GROUPS.filter(
            (m) =>
              !dbIds.has(String(m._id)) &&
              !dbNames.has(m.name.trim().toLowerCase()) &&
              !dbCodes.has((m.code || '').trim().toLowerCase())
          );

          setGroups([...dbGroups, ...filteredMocks]);
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

  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [loadingRequirements, setLoadingRequirements] = useState(true);

  const loadRequirements = useCallback(async () => {
    setLoadingRequirements(true);
    try {
      const params = new URLSearchParams();
      if (selectedPeriod) {
        params.set('period', selectedPeriod);
      }
      if (facilityIdForApi) {
        params.set('facilityId', facilityIdForApi);
      } else if (clientGroupIdForApi) {
        params.set('clientGroupId', clientGroupIdForApi);
      }
      const res = await fetch(`/api/requirements?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as { data?: IDataRequirement[] };
        setRequirements(Array.isArray(json.data) ? json.data : []);
      } else {
        setRequirements([]);
      }
    } catch (err) {
      console.error('Failed to load data review requirements:', err);
      setRequirements([]);
    } finally {
      setLoadingRequirements(false);
    }
  }, [selectedPeriod, facilityIdForApi, clientGroupIdForApi]);

  useEffect(() => {
    void loadRequirements();
  }, [loadRequirements]);

  if (loading) {
    return <CarbonCrunchLoader message="Loading data review workspace…" />;
  }

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm space-y-4">
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          Filter by organization, facility, and financial year — same scope as the consultant dashboard and client
          portal.
        </p>

        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          {/* Left Column: Organization & Facility Scope */}
          <div className="flex flex-wrap items-center gap-3">
            <CompanySelectMui
              groups={groups}
              selectedCompanyId={selectedCompanyId}
              onCompanyChange={(id) => {
                setSelectedCompanyId(id);
                setSearchInput('');
                setSearchQuery('');
              }}
            />
            {currentFacilities.length > 0 && (
              <FacilitySelectMui
                facilities={currentFacilities}
                selectedFacilityId={selectedFacilityId}
                onFacilityChange={setSelectedFacilityId}
                allowAll={currentFacilities.length > 1}
              />
            )}
          </div>

          {/* Right Column: Search upper side, All Review Status and Financial Year aligned below */}
          <div className="flex flex-col gap-2.5 items-start lg:items-end w-full lg:w-auto">
            {/* Upper side: Search input */}
            <div className="flex items-center justify-start lg:justify-end w-full">
              <div className="relative w-full sm:w-72 md:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search Request ID, title, category, date..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-[38px] pl-8 pr-8 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full shadow-2xs"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchQuery('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Below Search: "All review status" and "Financial year" aligned side-by-side */}
            <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2.5 sm:gap-3 w-full">
              {/* All review status dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <Filter className="w-4 h-4 text-emerald-600 shrink-0" />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <Select
                    value={workflowFilter}
                    onChange={(e: SelectChangeEvent) => setWorkflowFilter(e.target.value)}
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
                    {WORKFLOW_FILTER_OPTIONS.map((opt) => (
                      <MenuItem
                        key={opt.value}
                        value={opt.value}
                        sx={{
                          fontSize: '12px',
                          fontWeight: workflowFilter === opt.value ? 600 : 400,
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
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>

              {/* Financial year dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold whitespace-nowrap text-xs">Financial year</span>
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
          </div>
        </div>

        <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
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
          {workflowFilter !== 'ALL' && (
            <>
              {' · Status: '}
              <strong className="text-slate-700 dark:text-slate-200">
                {WORKFLOW_FILTER_OPTIONS.find((o) => o.value === workflowFilter)?.label || workflowFilter}
              </strong>
            </>
          )}
        </p>
      </div>

      {loadingRequirements ? (
        <CarbonCrunchLoader message="Loading data review requests…" />
      ) : (
        <RequirementsReviewTable
          requirements={requirements}
          showWorkflowFilter={false}
          hideTopFilterBar={true}
          searchQuery={searchQuery}
          workflowFilter={workflowFilter}
          onWorkflowFilterChange={setWorkflowFilter}
          emptyMessage="No client submissions or data requests to review yet."
          onReviewed={() => void loadRequirements()}
        />
      )}
    </div>
  );
}