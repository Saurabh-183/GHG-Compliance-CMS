'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  ArrowRight,
  MapPin,
  Users,
  Factory,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
} from 'lucide-react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { ComplianceType, IClientGroup } from '@/types';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } from '@/lib/mockFallback';
import { useAuth } from '@/context/AuthContext';
import { notify } from '@/lib/notify';

type ClientGroupWithFacilities = IClientGroup & {
  totalFacilitiesCount?: number;
  facilities?: Array<{
    name: string;
    facilityId: string;
    location: string;
    enabledFrameworks?: ComplianceType[];
  }>;
};

const MOCK_FRAMEWORK_DISTRIBUTION: ComplianceType[][] = [
  ['RCO', 'PAT', 'CCTS'],
  ['RCO'],
  ['PAT'],
  ['CCTS'],
  ['RCO', 'PAT'],
  ['RCO', 'CCTS'],
  ['PAT', 'CCTS'],
];

function buildMockGroupsWithFacilities(): ClientGroupWithFacilities[] {
  return MOCK_CLIENT_GROUPS.map((group, idx) => {
    const facilities = MOCK_FACILITIES.filter((f) => f.clientGroupId === group._id);
    const assignedFrameworks: ComplianceType[] =
      Array.isArray(group.enabledFrameworks) && group.enabledFrameworks.length > 0
        ? group.enabledFrameworks
        : MOCK_FRAMEWORK_DISTRIBUTION[idx % MOCK_FRAMEWORK_DISTRIBUTION.length];

    return {
      ...group,
      enabledFrameworks: assignedFrameworks,
      totalFacilitiesCount: facilities.length,
      facilities: facilities.map((facility) => ({
        name: facility.name,
        facilityId: facility.facilityId,
        location: facility.location || facility.state || 'India',
        enabledFrameworks:
          Array.isArray(facility.enabledFrameworks) && facility.enabledFrameworks.length > 0
            ? facility.enabledFrameworks
            : assignedFrameworks,
      })),
    };
  });
}

function getEffectiveFrameworks(group: ClientGroupWithFacilities): ('RCO' | 'PAT' | 'CCTS')[] {
  if (Array.isArray(group.facilities) && group.facilities.length > 0) {
    const facFws = Array.from(
      new Set(
        group.facilities.flatMap((f: any) =>
          Array.isArray(f.enabledFrameworks) && f.enabledFrameworks.length > 0
            ? f.enabledFrameworks
            : []
        )
      )
    ) as ('RCO' | 'PAT' | 'CCTS')[];
    if (facFws.length > 0) return facFws;
  }
  if (Array.isArray(group.enabledFrameworks) && group.enabledFrameworks.length > 0) {
    return group.enabledFrameworks as ('RCO' | 'PAT' | 'CCTS')[];
  }
  return ['RCO', 'PAT', 'CCTS'];
}

type FrameworkFilter = 'ALL' | 'RCO' | 'PAT' | 'CCTS';

const FILTER_TABS: Array<{ id: FrameworkFilter; label: string; badgeLabel: string; description: string }> = [
  { id: 'ALL', label: 'All Frameworks', badgeLabel: 'All', description: 'All registered client companies' },
  { id: 'RCO', label: 'RCO / RPO', badgeLabel: 'RCO', description: 'Renewable purchase obligations' },
  { id: 'PAT', label: 'PAT Scheme', badgeLabel: 'PAT', description: 'Perform, Achieve & Trade cycles' },
  { id: 'CCTS', label: 'CCTS Carbon', badgeLabel: 'CCTS', description: 'Carbon Credit Trading Scheme' },
];

const ITEMS_PER_PAGE = 12;

export default function ClientsPage() {
  const { currentRole, theme } = useAuth();
  const isDark = theme === 'dark';
  const [groups, setGroups] = useState<ClientGroupWithFacilities[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<FrameworkFilter>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<ClientGroupWithFacilities | null>(null);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  async function handleDeleteGroup() {
    if (!deleteConfirmGroup) return;
    setIsDeletingGroup(true);
    try {
      const res = await fetch(`/api/client-groups/${deleteConfirmGroup._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete client company');
      notify.success(`Company "${deleteConfirmGroup.name}" deleted successfully.`);
      setGroups((prev) => prev.filter((g) => String(g._id) !== String(deleteConfirmGroup._id)));
      setDeleteConfirmGroup(null);
    } catch (err: any) {
      notify.error(err.message || 'Error deleting company');
    } finally {
      setIsDeletingGroup(false);
    }
  }

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch('/api/client-groups', {
          credentials: 'include',
          cache: 'no-store',
        });

        if (!res.ok) {
          console.warn('API returned non-ok status, loading fallback client directory.');
          setGroups(buildMockGroupsWithFacilities());
          return;
        }

        const result = (await res.json()) as {
          success?: boolean;
          data?: ClientGroupWithFacilities[];
        };

        const dbGroups = result.data || [];
        const mockGroups = buildMockGroupsWithFacilities();
        const dbNames = new Set(dbGroups.map((g) => g.name.trim().toLowerCase()));
        const dbCodes = new Set(dbGroups.map((g) => (g.code || '').trim().toLowerCase()));
        const dbIds = new Set(dbGroups.map((g) => String(g._id)));

        const filteredMocks = mockGroups.filter(
          (m) =>
            !dbIds.has(String(m._id)) &&
            !dbNames.has(m.name.trim().toLowerCase()) &&
            !dbCodes.has((m.code || '').trim().toLowerCase())
        );

        setGroups([...dbGroups, ...filteredMocks]);
      } catch (error) {
        console.warn('Could not fetch client groups from API, using fallback data:', error);
        setGroups(buildMockGroupsWithFacilities());
      } finally {
        setLoading(false);
      }
    }

    fetchGroups();
  }, []);

  const filteredGroups = useMemo(() => {
    let list = groups;

    if (selectedFramework !== 'ALL') {
      list = list.filter((group) => {
        const frameworks = getEffectiveFrameworks(group);
        return frameworks.includes(selectedFramework);
      });
    }

    const query = search.trim().toLowerCase();
    if (!query) return list;

    return list.filter((group) => {
      const companyMatches = [
        group.name,
        group.code,
        group.industry,
        group.headquarters,
      ].some((value) => String(value ?? '').toLowerCase().includes(query));

      const facilityMatches = (group.facilities ?? []).some((facility) =>
        [facility.name, facility.facilityId, facility.location].some(
          (value) => String(value ?? '').toLowerCase().includes(query),
        ),
      );

      return companyMatches || facilityMatches;
    });
  }, [groups, search, selectedFramework]);

  // Reset to page 1 whenever search query or framework filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedFramework]);

  const frameworkCounts = useMemo(() => {
    return {
      ALL: groups.length,
      RCO: groups.filter((g) => getEffectiveFrameworks(g).includes('RCO')).length,
      PAT: groups.filter((g) => getEffectiveFrameworks(g).includes('PAT')).length,
      CCTS: groups.filter((g) => getEffectiveFrameworks(g).includes('CCTS')).length,
    };
  }, [groups]);

  const totalItems = filteredGroups.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedGroups = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGroups.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredGroups, currentPage]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const totalFacilities = groups.reduce(
    (total, group) =>
      total + (group.totalFacilitiesCount ?? group.facilities?.length ?? 0),
    0,
  );

  if (loading) {
    return (
      <CarbonCrunchLoader message="Loading client companies and facilities..." />
    );
  }

  return (
    <main className="mx-auto max-w-8xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="p-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <Building2 className="h-6 w-6 text-[#17365D] dark:text-emerald-400" />
              Client Companies
            </h1>

            <span className="rounded-full border border-[#D5DCE5] bg-[#EAF1F8] px-2.5 py-1 text-xs font-semibold text-[#17365D] dark:border-slate-700 dark:bg-slate-800 dark:text-white">
              {groups.length} Companies
            </span>

            <span className="rounded-full border border-emerald-700/20 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300">
              {totalFacilities} Facilities
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 ">
            Select a company to view its assigned facilities and operating
            units.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4  " />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search companies or facilities..."
            aria-label="Search companies or facilities"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 shadow-sm outline-none focus:border-[#17365D] dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </header>

      {/* Statutory Framework Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 pl-1 mr-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-[#17365D] dark:text-emerald-400" />
            Framework:
          </span>
          {FILTER_TABS.map((tab) => {
            const isActive = selectedFramework === tab.id;
            const count = frameworkCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFramework(tab.id)}
                title={tab.description}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#17365D] !text-white shadow-xs dark:bg-emerald-700'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {selectedFramework !== 'ALL' && (
          <button
            type="button"
            onClick={() => setSelectedFramework('ALL')}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline cursor-pointer self-start sm:self-auto px-1"
          >
            Clear Filter (Show All)
          </button>
        )}
      </div>

      {filteredGroups.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <Building2 className="mx-auto h-10 w-10  " />
          <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
            No companies found
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 ">
            {selectedFramework !== 'ALL'
              ? `No client companies with applicable ${selectedFramework} framework matching "${search}".`
              : 'Try another company name, industry, or facility search.'}
          </p>
          {selectedFramework !== 'ALL' && (
            <button
              type="button"
              onClick={() => setSelectedFramework('ALL')}
              className="mt-3 inline-flex items-center text-xs font-semibold text-[#17365D] dark:text-emerald-400 hover:underline cursor-pointer"
            >
              Reset framework filter to All
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {paginatedGroups.map((company) => {
              const facilityCount =
                company.totalFacilitiesCount ??
                company.facilities?.length ??
                0;

              return (
                <article
                  key={company._id}
                  className="flex flex-col justify-between rounded-md border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#17365D]/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-500/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#D5DCE5] bg-[#EAF1F8] text-[#17365D] dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400">
                        <Building2 className="h-5 w-5" />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          <Factory className="h-3.5 w-3.5" />
                          {facilityCount}{' '}
                          {facilityCount === 1 ? 'Facility' : 'Facilities'}
                        </span>
                        {currentRole === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDeleteConfirmGroup(company);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                            title={`Delete company ${company.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">
                      {company.name}
                    </h2>

                    <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400 ">
                      {company.industry || 'Industry not specified'}
                    </p>

                    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                      <div className="flex items-start gap-2    dark:text-slate-400 ">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{company.headquarters || 'Location not specified'}</span>
                      </div>

                      <div className="flex items-start gap-2    dark:text-slate-400 ">
                        <Users className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          Contact:{' '}
                          <strong className="font-medium text-slate-800 dark:text-white">
                            {company.contactPerson?.name || 'Not specified'}
                          </strong>
                        </span>
                      </div>

                      {/* Active Compliance Frameworks for this client */}
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Frameworks:</span>
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const activeFws = getEffectiveFrameworks(company);
                            return activeFws.map((fw) => (
                              <span
                                key={fw}
                                title={`${fw}: Active statutory compliance obligation for this client`}
                                className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs"
                              >
                                {fw}
                              </span>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/clients/${company._id}`}
                    className="mt-5 inline-flex w-full items-center justify-between rounded-lg bg-[#17365D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#102947] dark:bg-emerald-700 dark:hover:bg-emerald-800"
                  >
                    <span className="flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      View Facilities ({facilityCount})
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </article>
              );
            })}
          </div>

          {/* Pagination Footer (12 records per page) */}
          {totalItems > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400 shadow-xs">
              <div>
                Showing <strong className="text-slate-700 dark:text-slate-200 font-semibold">{startIndex}</strong> to{' '}
                <strong className="text-slate-700 dark:text-slate-200 font-semibold">{endIndex}</strong> of{' '}
                <strong className="text-slate-700 dark:text-slate-200 font-semibold">{totalItems}</strong> companies
                {search.trim() && (
                  <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    (search filtered)
                  </span>
                )}
                {selectedFramework !== 'ALL' && (
                  <span className="ml-1 text-slate-500 dark:text-slate-400">
                    · Framework:{' '}
                    <strong className="text-[#17365D] dark:text-emerald-400 font-semibold">
                      {selectedFramework}
                    </strong>
                  </span>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        if (totalPages <= 7) return true;
                        return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                      })
                      .map((p, idx, arr) => {
                        const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentPage(p);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                                currentPage === p
                                  ? 'bg-[#17365D] text-white dark:bg-emerald-700 dark:text-white font-bold shadow-2xs'
                                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Client Company Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteConfirmGroup)}
        onClose={() => setDeleteConfirmGroup(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
              color: isDark ? '#FFFFFF' : '#0F172A',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: isDark ? '#FFFFFF' : '#0F172A' }}>
          Delete Client Company
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Are you sure you want to delete <strong>{deleteConfirmGroup?.name}</strong>?
          </p>
          <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
            This action will permanently delete the company profile, its operating units/facilities, and any associated client accounts.
          </p>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteConfirmGroup(null)}
            color="inherit"
            disabled={isDeletingGroup}
            sx={{ textTransform: 'none', borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteGroup}
            variant="contained"
            color="error"
            disabled={isDeletingGroup}
            sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
          >
            {isDeletingGroup ? 'Deleting...' : 'Delete Company'}
          </Button>
        </DialogActions>
      </Dialog>
    </main>
  );
}
