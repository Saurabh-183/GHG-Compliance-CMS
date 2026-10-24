'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  Folder,
  ArrowRight,
  Send,
  ExternalLink,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { IFacility, IDataRequirement, IClarification } from '@/types';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function ClientPortalDashboard() {
  const { currentUser, currentRole } = useAuth();
  const [data, setData] = useState<{
    facilities: IFacility[];
    pendingRequests: IDataRequirement[];
    openClarifications: IClarification[];
    approvedHistory: Array<{
      _id: string;
      facilityId: string;
      complianceType: string;
      period: string;
      complianceOutcome: string;
      documentLinks: { finalReportUrl?: string; submissionAckUrl?: string };
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPortal() {
      try {
        const res = await fetch('/api/portal/dashboard');
        if (res.ok) {
          const json = (await res.json()) as { data: typeof data };
          setData(json.data);
        }
      } catch (e) {
        console.error('Error fetching portal dashboard:', e);
      } finally {
        setLoading(false);
      }
    }
    loadPortal();
  }, []);

  if (loading) {
    return <CarbonCrunchLoader message="Loading Client Compliance Portal..." />;
  }

  // Strict RBAC: Consultants and Reviewers cannot enter the external Client Portal
  if (currentRole !== 'CLIENT' && currentRole !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-emerald-400 shadow-md">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-white">Client Portal Area</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Your active account role is <strong className="text-emerald-400">{currentRole}</strong>.
          The Client Portal is reserved exclusively for external industrial client representatives (e.g., Trident Group) to upload Google Drive evidence and answer clarification queries.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs text-white font-semibold shadow-sm transition-colors"
          >
            <span>Return to Internal Consultant Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const facilities = data?.facilities || [];
  const pendingRequests = data?.pendingRequests || [];
  const openClarifications = data?.openClarifications || [];
  const history = data?.approvedHistory || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Client Group Overview Hero */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              Authorized Client Organization
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Trident Group — Compliance Portal
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Welcome, <strong className="text-emerald-400">{currentUser?.name || 'Vikram Singh'}</strong> (Head of Regulatory Affairs).
              Direct visibility into authorized facilities, outstanding data submissions, and verified historical reports.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800 shrink-0">
            <div className="text-center">
              <div className="text-xl font-bold text-white">{facilities.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Authorized Units</div>
            </div>
            <div className="h-8 w-px bg-slate-800"></div>
            <div className="text-center">
              <div className="text-xl font-bold text-rose-400">{openClarifications.length}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Action Needed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Required: Discrepancy & Clarification Response */}
      {openClarifications.length > 0 && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-300">
                  Regulatory Query / Clarification Raised by Carbon Crunch
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Consultant flagged a 15,000 kWh variance between your June 2025 Excel and electricity bill. Please provide explanation or revised bill.
              </p>
            </div>
          </div>

          <Link
            href="/portal/submissions"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
          >
            <span>Respond with Revised Link</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Authorized Facilities Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-400" />
          Your Authorized Operating Facilities
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div
              key={facility._id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-md flex flex-col justify-between hover:border-slate-700 transition-all"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                    {facility.facilityId}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Compliant Status
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white">{facility.name}</h3>
                <p className="text-xs text-slate-400">{facility.category}</p>
                <p className="text-[11px] text-slate-500">{facility.location}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <Link
                  href={`/portal/facilities/${facility.facilityId}`}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 group"
                >
                  <span>Facility Overview</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Pending Data Requests & Approved History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Outstanding Data Requests */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Outstanding Data Requests
            </h3>
            <Link href="/portal/requests" className="text-xs text-emerald-400 hover:underline">
              Submit links
            </Link>
          </div>

          <div className="space-y-3">
            {pendingRequests.slice(0, 3).map((req) => (
              <div
                key={req._id}
                className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200">{req.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Due: {formatDate(req.dueDate)} · {req.linkedCompliances.join(', ')}
                  </div>
                </div>
                <Link
                  href="/portal/requests"
                  className="px-2.5 py-1 text-xs rounded bg-slate-800 text-emerald-400 hover:bg-slate-700 border border-slate-700 font-medium"
                >
                  Paste Drive Link
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Approved Historical Reports */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Approved Historical Compliance Records
            </h3>
            <Link href="/portal/history" className="text-xs text-emerald-400 hover:underline">
              Browse archive
            </Link>
          </div>

          <div className="space-y-3">
            {history.slice(0, 3).map((item) => (
              <div
                key={item._id}
                className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200 flex items-center gap-2">
                    <span>{item.facilityId}</span>
                    <span className="font-mono text-emerald-400">
                      {item.complianceType} ({item.period})
                    </span>
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={item.complianceOutcome} type="outcome" size="sm" />
                  </div>
                </div>
                <DriveLinkBadge url={item.documentLinks?.finalReportUrl} label="Final Report" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
