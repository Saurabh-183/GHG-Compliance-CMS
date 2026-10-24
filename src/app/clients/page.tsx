'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IClientGroup } from '@/types';
import { Building2, Search, ArrowRight, ShieldCheck, MapPin, Users, Plus } from 'lucide-react';
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
    return <CarbonCrunchLoader message="Loading registered client conglomerates..." />;
  }

  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.code.toLowerCase().includes(search.toLowerCase()) ||
      g.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-emerald-400" />
            Client Groups & Industrial Facilities
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse registered client industrial conglomerates, divisions, and designated consumers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search groups, industry..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Group Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div
            key={group._id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
                  {group.code}
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  {group.totalFacilitiesCount || 3} Facilities Linked
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{group.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{group.industry}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{group.headquarters}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    Contact: <strong className="text-slate-300">{group.contactPerson.name}</strong> ({group.contactPerson.email})
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
              <Link
                href={`/clients/${group._id}`}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
              >
                <span>View Group Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/facilities/TRIDENT_PAPER"
                className="px-2.5 py-1 text-[11px] rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Trident Paper Matrix
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
