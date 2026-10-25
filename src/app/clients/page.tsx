'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IClientGroup } from '@/types';
import { Building2, Search, ArrowRight, MapPin, Users, Factory, Layers } from 'lucide-react';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function ClientsPage() {
  const [groups, setGroups] = useState<IClientGroup[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchGroups() {
      try {
        const res = await fetch('/api/client-groups');
        if (res.ok) {
          const data = (await res.json()) as { data: IClientGroup[] };
          setGroups(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching client groups:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchGroups();
  }, []);

  if (loading) {
    return <CarbonCrunchLoader message="Loading registered client conglomerates and operating facilities..." />;
  }

  const filteredGroups = groups.filter((g) => {
    const q = search.toLowerCase();
    const matchesGroup =
      g.name.toLowerCase().includes(q) ||
      g.code.toLowerCase().includes(q) ||
      g.industry.toLowerCase().includes(q) ||
      g.headquarters.toLowerCase().includes(q);
    const matchesUnit =
      g.facilities &&
      g.facilities.some(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.facilityId.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q)
      );
    return matchesGroup || matchesUnit;
  });

  const totalFacilities = groups.reduce(
    (acc, g) => acc + (g.totalFacilitiesCount || g.facilities?.length || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-[#17365D] dark:text-emerald-400" />
              Client Companies & Designated Facilities
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF1F8] dark:bg-slate-800 text-[#17365D] dark:text-slate-200 border border-[#D5DCE5] dark:border-slate-700">
              {groups.length} Companies
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E7F3EB] dark:bg-emerald-950/60 text-[#237347] dark:text-emerald-300 border border-[#237347]/20 dark:border-emerald-500/30">
              {totalFacilities} Operating Units
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Browse registered statutory client conglomerates (UltraTech Cement, Trident, Hero MotoCorp, etc.) and explore their assigned industrial operating facilities.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search companies, units, sectors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#17365D] dark:focus:border-emerald-500 w-72 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => {
          const count = group.totalFacilitiesCount || group.facilities?.length || 0;
          return (
            <div
              key={group._id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm hover:shadow-md hover:border-[#17365D]/40 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-lg bg-[#EAF1F8] dark:bg-emerald-950/60 border border-[#D5DCE5] dark:border-emerald-500/30 flex items-center justify-center font-bold text-[#17365D] dark:text-emerald-400 text-sm tracking-wide">
                    {group.code}
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E7F3EB] dark:bg-emerald-500/10 text-[#237347] dark:text-emerald-300 border border-[#237347]/20 dark:border-emerald-500/20 flex items-center gap-1.5">
                    <Factory className="w-3 h-3" />
                    <span>{count} {count === 1 ? 'Unit' : 'Facilities'} Linked</span>
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{group.name}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{group.industry}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{group.headquarters}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      Lead: <strong className="text-slate-700 dark:text-slate-300">{group.contactPerson?.name || 'Authorized Lead'}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/clients/${group._id}`}
                  className="w-full inline-flex items-center justify-between px-4 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] text-white text-xs font-semibold shadow-xs transition-colors group"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>View Group Facilities ({count})</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
