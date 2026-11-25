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
} from 'lucide-react';
import { IClientGroup } from '@/types';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } from '@/lib/mockFallback';

type ClientGroupWithFacilities = IClientGroup & {
  totalFacilitiesCount?: number;
  facilities?: Array<{
    name: string;
    facilityId: string;
    location: string;
  }>;
};

function buildMockGroupsWithFacilities(): ClientGroupWithFacilities[] {
  return MOCK_CLIENT_GROUPS.map((group) => {
    const facilities = MOCK_FACILITIES.filter((f) => f.clientGroupId === group._id);
    return {
      ...group,
      totalFacilitiesCount: facilities.length,
      facilities: facilities.map((facility) => ({
        name: facility.name,
        facilityId: facility.facilityId,
        location: facility.location || facility.state || 'India',
      })),
    };
  });
}

const ITEMS_PER_PAGE = 12;

export default function ClientsPage() {
  const [groups, setGroups] = useState<ClientGroupWithFacilities[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch('/api/client-groups');

        if (!res.ok) {
          console.warn('API returned non-ok status, loading fallback client directory.');
          setGroups(buildMockGroupsWithFacilities());
          return;
        }

        const result = (await res.json()) as {
          success?: boolean;
          data?: ClientGroupWithFacilities[];
        };

        if (result.data && result.data.length > 0) {
          setGroups(result.data);
        } else {
          setGroups(buildMockGroupsWithFacilities());
        }
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
    const query = search.trim().toLowerCase();

    if (!query) return groups;

    return groups.filter((group) => {
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
  }, [groups, search]);

  // Reset to page 1 whenever the search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

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

      {filteredGroups.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <Building2 className="mx-auto h-10 w-10  " />
          <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
            No companies found
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 ">
            Try another company name, industry, or facility search.
          </p>
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

                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <Factory className="h-3.5 w-3.5" />
                        {facilityCount}{' '}
                        {facilityCount === 1 ? 'Facility' : 'Facilities'}
                      </span>
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
                    (filtered)
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
    </main>
  );
}
