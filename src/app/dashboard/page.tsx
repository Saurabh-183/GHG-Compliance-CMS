'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  Building2,
  Calendar,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { ICalendarItem, IClarification } from '@/types';
import { formatDate, formatNumber } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function DashboardPage() {
  const { currentRole, currentUser } = useAuth();
  const [calendarItems, setCalendarItems] = useState<ICalendarItem[]>([]);
  const [clarifications, setClarifications] = useState<IClarification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [calRes, clarRes] = await Promise.all([
          fetch('/api/calendar'),
          fetch('/api/clarifications'),
        ]);

        if (calRes.ok) {
          const calData = (await calRes.json()) as { data: ICalendarItem[] };
          setCalendarItems(calData.data || []);
        }

        if (clarRes.ok) {
          const clarData = (await clarRes.json()) as { data: IClarification[] };
          setClarifications(clarData.data || []);
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <CarbonCrunchLoader message="Loading consultant compliance workspace..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workspace Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            My Workspace — Consultant Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <strong className="text-emerald-700 dark:text-emerald-400">{currentUser?.name}</strong> ({currentUser?.designation})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/facilities/TRIDENT_PAPER"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Trident Paper Matrix</span>
          </Link>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Compliance Calendar</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Assigned Facilities</span>
            <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">3</div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1">Trident Paper, Yarn, Textiles</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Compliances</span>
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">6 Records</div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">RCO, PAT, CCTS, CEA Returns</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Clarifications</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-700 dark:text-rose-400 mt-2">
            {clarifications.filter((c) => c.status === 'OPEN').length} Discrepancy
          </div>
          <div className="text-[11px] text-rose-800 dark:text-rose-400/80 mt-1">June 2025 Grid kWh Mismatch</div>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Upcoming Filings</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {calendarItems.filter((c) => c.status === 'PENDING').length}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">Next due: July CEA Filing</div>
        </div>
      </div>

      {/* Discrepancy Action Banner (Acceptance Step 8 Highlight!) */}
      {clarifications.length > 0 && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300">
                  Active Reconciliation Discrepancy Flagged — Trident Paper
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30">
                  June 2025
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                Client declared <strong>1,280,000 kWh</strong> in Excel while official PSPCL electricity bill records <strong>1,265,000 kWh</strong> (Variance: <strong>15,000 kWh / 1.186%</strong>).
              </p>
            </div>
          </div>

          <Link
            href="/datasets/6adb9175b32c50edab95461f/verify"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shrink-0"
          >
            <span>Open Verification Engine & Email</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Two Column Grid: Upcoming Deadlines & Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Deadlines */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Statutory Deadlines & Compliance Calendar
            </h3>
            <Link href="/calendar" className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline">
              View full calendar
            </Link>
          </div>

          <div className="space-y-2.5">
            {calendarItems.slice(0, 4).map((item) => (
              <div
                key={item._id}
                className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-2">
                    <span>{item.facilityName}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-transparent">
                      {item.complianceType}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {item.reportingPeriod}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                    Due: {formatDate(item.regulatoryDueDate)}
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Facility Access & Matrix Links */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Registered Client Facilities
            </h3>
            <Link href="/clients" className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline">
              Browse all clients
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Trident Paper Complex</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Dhaula, Barnala, Punjab · Designated Consumer (DC)</p>
                </div>
                <Link
                  href="/facilities/TRIDENT_PAPER"
                  className="px-2.5 py-1 text-xs rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 font-semibold transition-colors"
                >
                  Open Matrix
                </Link>
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span>RCO FY24-25 Shortfall: 5 MU</span>
                <span>·</span>
                <span>FY25-26 Target: 33.01%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Trident Yarn Spinning Division</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Budhni, Sehore, Madhya Pradesh · DC Textile</p>
                </div>
                <Link
                  href="/facilities/TRIDENT_YARN"
                  className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 font-semibold transition-colors"
                >
                  View Facility
                </Link>
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span>PAT Cycle VII Target: 0.142 toe/ton</span>
                <span>·</span>
                <span>Reporting FY25-26</span>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">Trident Home Textiles Division</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Barnala, Punjab · Commercial Industrial Unit</p>
                </div>
                <Link
                  href="/facilities/TRIDENT_TEXTILES"
                  className="px-2.5 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 font-semibold transition-colors"
                >
                  View Facility
                </Link>
              </div>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                <span>RCO Reporting: Active</span>
                <span>·</span>
                <span>CEA Monthly Filing Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
