'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IClientGroup, IFacility } from '@/types';
import {
  Building2,
  MapPin,
  Users,
  ArrowRight,
  ChevronRight,
  Search,
  Factory,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function ClientGroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [group, setGroup] = useState<(IClientGroup & { facilities?: IFacility[] }) | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGroup() {
      try {
        const res = await fetch(`/api/client-groups/${groupId}`);
        if (res.ok) {
          const data = (await res.json()) as { data: IClientGroup & { facilities?: IFacility[] } };
          setGroup(data.data);
        }
      } catch (e) {
        console.error('Error fetching group:', e);
      } finally {
        setLoading(false);
      }
    }
    if (groupId) loadGroup();
  }, [groupId]);

  if (loading) {
    return <CarbonCrunchLoader message="Loading Company & Operating Facilities..." />;
  }

  if (!group) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-500">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Client Group Not Found</h2>
        <Link href="/clients" className="mt-4 inline-block text-[#17365D] dark:text-emerald-400 hover:underline text-xs">
          Return to Clients list
        </Link>
      </div>
    );
  }

  const allFacilities = group.facilities || [];
  const filteredFacilities = allFacilities.filter((f) => {
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.facilityId.toLowerCase().includes(q) ||
      f.location.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/clients" className="hover:text-[#17365D] dark:hover:text-emerald-400">
          Clients & Units
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 dark:text-slate-200 font-semibold">{group.name}</span>
      </div>

      {/* Group Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-[#EAF1F8] dark:bg-emerald-900/60 border border-[#D5DCE5] dark:border-emerald-700/60 flex items-center justify-center font-bold text-[#17365D] dark:text-emerald-300 text-xl shadow-2xs shrink-0">
              {group.code}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAF1F8] dark:bg-emerald-500/10 text-[#17365D] dark:text-emerald-400 border border-[#D5DCE5] dark:border-emerald-500/20">
                  Client Conglomerate
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{group.industry}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-3">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {group.headquarters}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  Compliance Lead: <strong className="text-slate-700 dark:text-slate-300">{group.contactPerson?.name}</strong> ({group.contactPerson?.email})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-[#F7F9FB] dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <div className="text-center px-2">
              <div className="text-2xl font-bold text-[#17365D] dark:text-white">{allFacilities.length}</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Facilities</div>
            </div>
            <div className="h-8 w-px bg-slate-300 dark:bg-slate-800"></div>
            <div className="text-center px-2">
              <div className="text-2xl font-bold text-[#237347] dark:text-emerald-400">4 Active</div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Frameworks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Facilities Section Header & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Factory className="w-5 h-5 text-[#17365D] dark:text-emerald-400" />
              Operating Facilities & Designated Consumers ({allFacilities.length} Units)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select any operating facility to inspect its statutory compliance matrix, GHG returns, and evidence vault.
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${allFacilities.length} facilities...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-[#17365D] dark:focus:border-emerald-500 w-64 shadow-2xs"
            />
          </div>
        </div>

        {/* Facilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFacilities.map((facility) => (
            <div
              key={facility._id || facility.facilityId}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm hover:shadow-md hover:border-[#17365D]/40 dark:hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EAF1F8] dark:bg-slate-800 text-[#17365D] dark:text-slate-300 border border-[#D5DCE5] dark:border-slate-700">
                    {facility.facilityId}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E7F3EB] dark:bg-emerald-500/10 text-[#237347] dark:text-emerald-400 border border-[#237347]/20">
                    Active Facility
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{facility.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{facility.category}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{facility.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-[#237347] dark:text-emerald-400 shrink-0" />
                    <span>Assigned: <strong className="text-slate-700 dark:text-slate-300">Priya Sharma</strong> (Consultant)</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href={`/facilities/${facility.facilityId}`}
                  className="w-full inline-flex items-center justify-between px-3 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-[#A56F63] dark:hover:bg-[#8C594E] !text-white text-xs font-semibold shadow-xs transition-colors group"
                  style={{ color: '#FFFFFF' }}
                >
                  <span className="flex items-center gap-1.5 !text-white font-medium" style={{ color: '#FFFFFF' }}>
                    <FileSpreadsheet className="w-3.5 h-3.5 !text-white shrink-0" style={{ color: '#FFFFFF' }} />
                    <span className="!text-white font-semibold" style={{ color: '#FFFFFF' }}>Open Compliance Matrix</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 !text-white group-hover:translate-x-1 transition-transform shrink-0" style={{ color: '#FFFFFF' }} />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filteredFacilities.length === 0 && (
          <div className="text-center py-12 text-xs text-slate-400">
            No facilities match &quot;{search}&quot;. Try a different search term.
          </div>
        )}
      </div>
    </div>
  );
}
