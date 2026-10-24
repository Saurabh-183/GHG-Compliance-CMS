'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IFacility, IComplianceApplicability } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Building2,
  Calendar,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Clock,
  Layers,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function ClientFacilityOverviewPage() {
  const params = useParams();
  const facilityId = (params.facilityId as string) || 'TRIDENT_PAPER';
  const [facility, setFacility] = useState<IFacility | null>(null);
  const [applicabilities, setApplicabilities] = useState<IComplianceApplicability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [facRes, appRes] = await Promise.all([
          fetch(`/api/facilities/${facilityId}`),
          fetch(`/api/compliance-applicability?facilityId=${facilityId}`),
        ]);

        if (facRes.ok) {
          const facData = (await facRes.json()) as { data: IFacility };
          setFacility(facData.data);
        }
        if (appRes.ok) {
          const appData = (await appRes.json()) as { data: IComplianceApplicability[] };
          setApplicabilities(appData.data || []);
        }
      } catch (err) {
        console.error('Error fetching facility data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [facilityId]);

  if (loading) {
    return <CarbonCrunchLoader message="Loading facility compliance overview..." />;
  }

  if (!facility) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <h2 className="text-lg font-bold text-white">Facility Not Found</h2>
        <Link href="/portal" className="mt-4 inline-block text-emerald-400 text-xs">
          Return to Portal
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/portal" className="hover:text-emerald-400">Client Portal</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-semibold">{facility.name}</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-slate-300 border border-slate-700">
                {facility.facilityId}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {facility.name}
              </h1>
            </div>
            <p className="text-xs text-slate-300">
              {facility.category} · {facility.location}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal/requests"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
            >
              View Open Requests
            </Link>
          </div>
        </div>
      </div>

      {/* Read-Only Applicable Compliances Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Applicable Compliance Obligations
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Registered frameworks, statutory authorities, and verified outcomes for this unit.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Framework</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Regulator / Authority</th>
                <th className="py-3 px-4">Mandate Target</th>
                <th className="py-3 px-4">Filing Deadline</th>
                <th className="py-3 px-4 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {applicabilities.map((app) => (
                <tr key={app._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-200">
                    {app.complianceType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {app.period}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {app.authority}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold">
                    {app.targetValue !== null ? `${app.targetValue} ${app.targetUnit}` : 'Monthly Returns'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {formatDate(app.deadline)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={app.complianceOutcome} type="outcome" size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
