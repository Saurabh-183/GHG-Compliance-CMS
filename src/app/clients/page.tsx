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
} from 'lucide-react';
import { IClientGroup } from '@/types';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

type ClientGroupWithFacilities = IClientGroup & {
  totalFacilitiesCount?: number;
  facilities?: Array<{
    name: string;
    facilityId: string;
    location: string;
  }>;
};

export default function ClientsPage() {
  const [groups, setGroups] = useState<ClientGroupWithFacilities[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch('/api/client-groups');

        if (!res.ok) {
          throw new Error('Failed to fetch client companies');
        }

        const result = (await res.json()) as {
          success?: boolean;
          data?: ClientGroupWithFacilities[];
        };

        setGroups(result.data ?? []);
      } catch (error) {
        console.error('Error fetching client groups:', error);
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
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 dark:border-slate-800 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <Building2 className="h-6 w-6 text-[#17365D] dark:text-emerald-400" />
              Client Companies
            </h1>

            <span className="rounded-full border border-[#D5DCE5] bg-[#EAF1F8] px-2.5 py-1 text-xs font-semibold text-[#17365D] dark:border-slate-700 dark:bg-slate-800 dark:   dark:text-white">
              {groups.length} Companies
            </span>

            <span className="rounded-full border border-emerald-700/20 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300">
              {totalFacilities} Facilities
            </span>
          </div>

          <p className="mt-2 text-sm    dark: ">
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
        <div className="rounded-xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <Building2 className="mx-auto h-10 w-10  " />
          <h2 className="mt-4 font-semibold text-slate-900 dark:text-white">
            No companies found
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark: ">
            Try another company name, industry, or facility search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((company) => {
            const facilityCount =
              company.totalFacilitiesCount ??
              company.facilities?.length ??
              0;

            return (
              <article
                key={company._id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#17365D]/40 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-500/40"
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

                  <p className="mt-1 line-clamp-2 text-sm    dark: ">
                    {company.industry || 'Industry not specified'}
                  </p>

                  <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 text-sm dark:border-slate-800">
                    <div className="flex items-start gap-2    dark: ">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{company.headquarters || 'Location not specified'}</span>
                    </div>

                    <div className="flex items-start gap-2    dark: ">
                      <Users className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Contact:{' '}
                        <strong className="font-medium text-slate-800 dark:   dark:text-white">
                          {company.contactPerson?.name || 'Not specified'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href={`/clients/${company._id}`}
                  className="mt-5 inline-flex w-full items-center justify-between rounded-lg bg-[#17365D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#102947] dark:bg-[#A56F63] dark:hover:bg-[#8C594E]"
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
      )}
    </main>
  );
}
