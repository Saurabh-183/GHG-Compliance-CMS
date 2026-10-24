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
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  ChevronRight,
} from 'lucide-react';

export default function ClientGroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const [group, setGroup] = useState<IClientGroup & { facilities?: IFacility[] } | null>(null);
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
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 text-xs">
        Loading Client Group details...
      </div>
    );
  }

  if (!group) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <h2 className="text-lg font-bold text-white">Client Group Not Found</h2>
        <Link href="/clients" className="mt-4 inline-block text-emerald-400 hover:underline text-xs">
          Return to Clients list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/clients" className="hover:text-emerald-400">Clients</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-semibold">{group.name}</span>
      </div>

      {/* Group Header Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center font-bold text-emerald-300 text-xl shadow-sm">
              {group.code}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Client Group
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">{group.industry}</p>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  {group.headquarters}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  Lead: {group.contactPerson.name} ({group.contactPerson.email})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800 shrink-0">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{group.facilities?.length || 3}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Facilities</div>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-emerald-400">4 Active</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Frameworks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Facilities List (Entity Hierarchy: ClientGroup -> Facilities) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-400" />
          Operating Facilities & Designated Consumers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {group.facilities?.map((facility) => (
            <div
              key={facility._id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-md hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {facility.facilityId}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                    Active Facility
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{facility.name}</h3>
                <p className="text-xs text-slate-400">{facility.category}</p>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                  <div>Location: {facility.location}</div>
                  <div>
                    Assigned: <strong className="text-slate-300">Priya Sharma</strong> (Consultant)
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <Link
                  href={`/facilities/${facility.facilityId}`}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
                >
                  <span>Open Compliance Matrix</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
