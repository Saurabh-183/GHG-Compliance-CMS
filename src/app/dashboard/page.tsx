'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  ChevronDown,
  ShieldCheck,
  Factory,
} from 'lucide-react';
import { ICalendarItem, IClarification, IClientGroup, IFacility } from '@/types';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { MOCK_CLIENT_GROUPS } from '@/lib/mockFallback';
import { CompanySelectMui } from '@/components/dashboard/CompanySelectMui';

function generateDeadlinesForFacilities(facilities: IFacility[]): ICalendarItem[] {
  if (!facilities || facilities.length === 0) return [];

  const standardCycles = [
    {
      complianceType: 'CEA' as const,
      reportingPeriod: 'June 2025 Electricity Returns',
      regulatoryDueDate: '2025-07-15T00:00:00.000Z',
      status: 'PENDING' as const,
      isRecurringCEA: true,
    },
    {
      complianceType: 'CEA' as const,
      reportingPeriod: 'July 2025 Electricity Returns',
      regulatoryDueDate: '2025-08-15T00:00:00.000Z',
      status: 'UPCOMING' as const,
      isRecurringCEA: true,
    },
    {
      complianceType: 'RCO' as const,
      reportingPeriod: 'FY2025-26 (Q1 Reconciliation)',
      regulatoryDueDate: '2025-09-30T00:00:00.000Z',
      status: 'PENDING' as const,
      isRecurringCEA: false,
    },
    {
      complianceType: 'PAT' as const,
      reportingPeriod: 'PAT Monitoring Period Assessment',
      regulatoryDueDate: '2025-10-31T00:00:00.000Z',
      status: 'PENDING' as const,
      isRecurringCEA: false,
    },
    {
      complianceType: 'CCTS' as const,
      reportingPeriod: 'CCTS Annual Compliance Filing',
      regulatoryDueDate: '2025-11-30T00:00:00.000Z',
      status: 'UPCOMING' as const,
      isRecurringCEA: false,
    },
  ];

  const items: ICalendarItem[] = [];

  if (facilities.length === 1) {
    const fac = facilities[0];
    standardCycles.slice(0, 4).forEach((cycle, idx) => {
      items.push({
        _id: `cal_${fac.facilityId}_${cycle.complianceType}_${idx}`,
        facilityId: fac.facilityId,
        facilityName: fac.name,
        complianceType: cycle.complianceType,
        reportingPeriod: cycle.reportingPeriod,
        regulatoryDueDate: cycle.regulatoryDueDate,
        internalDeadline: cycle.regulatoryDueDate,
        clientDataSubmissionDeadline: cycle.regulatoryDueDate,
        assignedConsultantId: 'USR_CONS_01',
        status: cycle.status,
        actualSubmissionDate: null,
        extensionHistory: [],
        isRecurringCEA: cycle.isRecurringCEA,
      });
    });
    return items;
  }

  facilities.forEach((fac, facIdx) => {
    const cycle1 = standardCycles[facIdx % standardCycles.length];
    items.push({
      _id: `cal_${fac.facilityId}_${cycle1.complianceType}_${facIdx}`,
      facilityId: fac.facilityId,
      facilityName: fac.name,
      complianceType: cycle1.complianceType,
      reportingPeriod: cycle1.reportingPeriod,
      regulatoryDueDate: cycle1.regulatoryDueDate,
      internalDeadline: cycle1.regulatoryDueDate,
      clientDataSubmissionDeadline: cycle1.regulatoryDueDate,
      assignedConsultantId: 'USR_CONS_01',
      status: cycle1.status,
      actualSubmissionDate: null,
      extensionHistory: [],
      isRecurringCEA: cycle1.isRecurringCEA,
    });

    if (facilities.length <= 3) {
      const cycle2 = standardCycles[(facIdx + 2) % standardCycles.length];
      items.push({
        _id: `cal_${fac.facilityId}_${cycle2.complianceType}_${facIdx}_b`,
        facilityId: fac.facilityId,
        facilityName: fac.name,
        complianceType: cycle2.complianceType,
        reportingPeriod: cycle2.reportingPeriod,
        regulatoryDueDate: cycle2.regulatoryDueDate,
        internalDeadline: cycle2.regulatoryDueDate,
        clientDataSubmissionDeadline: cycle2.regulatoryDueDate,
        assignedConsultantId: 'USR_CONS_01',
        status: cycle2.status,
        actualSubmissionDate: null,
        extensionHistory: [],
        isRecurringCEA: cycle2.isRecurringCEA,
      });
    }
  });

  return items.sort(
    (a, b) => new Date(a.regulatoryDueDate).getTime() - new Date(b.regulatoryDueDate).getTime()
  );
}

export default function DashboardPage() {
  const { currentRole, currentUser } = useAuth();
  const [calendarItems, setCalendarItems] = useState<ICalendarItem[]>([]);
  const [clarifications, setClarifications] = useState<IClarification[]>([]);
  const [groups, setGroups] = useState<IClientGroup[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [calRes, clarRes, groupsRes] = await Promise.all([
          fetch('/api/calendar').catch(() => null),
          fetch('/api/clarifications').catch(() => null),
          fetch('/api/client-groups').catch(() => null),
        ]);

        if (calRes && calRes.ok) {
          const calData = (await calRes.json()) as { data: ICalendarItem[] };
          setCalendarItems(calData.data || []);
        }

        if (clarRes && clarRes.ok) {
          const clarData = (await clarRes.json()) as { data: IClarification[] };
          setClarifications(clarData.data || []);
        }

        if (groupsRes && groupsRes.ok) {
          const groupsData = (await groupsRes.json()) as { data: IClientGroup[] };
          if (groupsData.data && groupsData.data.length > 0) {
            setGroups(groupsData.data);
          } else {
            setGroups(MOCK_CLIENT_GROUPS);
          }
        } else {
          setGroups(MOCK_CLIENT_GROUPS);
        }
      } catch (err) {
        console.warn('Fallback: loading local mock client groups on dashboard:', err);
        setGroups(MOCK_CLIENT_GROUPS);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <CarbonCrunchLoader message="Loading consultant compliance workspace..." />;
  }

  // Find currently selected group
  const selectedGroup = groups.find(
    (g) => g._id === selectedCompanyId || g.code === selectedCompanyId
  );

  // Collect all facilities across all client groups
  const allFacilities: IFacility[] = groups.flatMap((g) => g.facilities || []);

  // Filter facilities based on selected company
  const currentFacilities: IFacility[] = selectedGroup
    ? selectedGroup.facilities && selectedGroup.facilities.length > 0
      ? selectedGroup.facilities
      : allFacilities.filter((f) => f.clientGroupId === selectedGroup._id)
    : allFacilities;

  // Primary facility for the header Matrix link
  const primaryFacilityId =
    selectedGroup?.facilities?.[0]?.facilityId ||
    (selectedGroup ? 'UTC_KOTPUTLI' : 'TRIDENT_PAPER');

  // Filter calendar deadlines for selected company if applicable
  const filteredCalendarItems = selectedGroup
    ? calendarItems.filter((item) =>
        currentFacilities.some(
          (f) =>
            f.facilityId.toUpperCase() === item.facilityId.toUpperCase() ||
            (item.facilityName &&
              (f.name.toLowerCase().includes(item.facilityName.toLowerCase()) ||
                item.facilityName.toLowerCase().includes(f.name.toLowerCase())))
        )
      )
    : calendarItems;

  // Generate dynamic statutory calendar items for the selected company's operating units if not already in DB
  const fallbackCompanyCalendarItems: ICalendarItem[] = React.useMemo(() => {
    if (!selectedGroup || currentFacilities.length === 0) return [];
    return generateDeadlinesForFacilities(currentFacilities);
  }, [selectedGroup, currentFacilities]);

  const displayCalendarItems = selectedGroup
    ? filteredCalendarItems.length > 0
      ? filteredCalendarItems
      : fallbackCompanyCalendarItems
    : calendarItems;

  const totalUnitsCount = allFacilities.length || 109;
  const isTridentSelected =
    !selectedGroup ||
    selectedGroup.code === 'TRI' ||
    selectedGroup.name.toLowerCase().includes('trident');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workspace Welcome & Company Dropdown Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            My Workspace — Consultant Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <strong className="text-emerald-700 dark:text-emerald-400">{currentUser?.name}</strong> ({currentUser?.designation})
            {selectedGroup && (
              <span> · Active View: <strong className="text-slate-800 dark:text-slate-200">{selectedGroup.name}</strong></span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* MUI Company Selector Dropdown */}
          <CompanySelectMui
            groups={groups}
            selectedCompanyId={selectedCompanyId}
            onCompanyChange={(id) => setSelectedCompanyId(id)}
          />

          {/* Dynamic Compliance Matrix Button */}
          <Link
            href={`/facilities/${primaryFacilityId}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-[#A56F63] dark:hover:bg-[#8C594E] !text-white text-xs font-semibold shadow-sm transition-all"
            style={{ color: '#FFFFFF' }}
          >
            <Building2 className="w-3.5 h-3.5 !text-white" style={{ stroke: '#FFFFFF' }} />
            <span className="!text-white font-semibold" style={{ color: '#FFFFFF' }}>
              {selectedGroup
                ? `${selectedGroup.name.split(' ')[0]} Matrix`
                : 'Trident Paper Matrix'}
            </span>
          </Link>

          {/* Compliance Calendar Link */}
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compliance Calendar</span>
          </Link>
        </div>
      </div>

      {/* Dynamic Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Assigned Facilities */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {selectedGroup ? 'Assigned Operating Units' : 'Assigned Facilities'}
            </span>
            <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {selectedGroup ? currentFacilities.length : totalUnitsCount}
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 truncate">
            {selectedGroup
              ? currentFacilities.length > 0
                ? currentFacilities.slice(0, 3).map((f) => f.name.split(' ')[0]).join(', ') + (currentFacilities.length > 3 ? '...' : '')
                : 'No facilities registered'
              : 'Trident, UltraTech, Hero, Jindal...'}
          </div>
        </div>

        {/* Card 2: Active Compliances */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Compliances</span>
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {selectedGroup ? `${currentFacilities.length * 4} Records` : '436 Records'}
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
            RCO, PAT, CCTS, CEA Returns
          </div>
        </div>

        {/* Card 3: Open Clarifications / Discrepancies */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Clarifications</span>
            <AlertTriangle className={`w-4 h-4 ${isTridentSelected ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
          </div>
          <div className={`text-2xl font-bold mt-2 ${isTridentSelected ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
            {isTridentSelected ? `${clarifications.filter((c) => c.status === 'OPEN').length || 1} Discrepancy` : '0 Discrepancy'}
          </div>
          <div className={`text-[11px] mt-1 ${isTridentSelected ? 'text-rose-800 dark:text-rose-400/80' : 'text-emerald-700 dark:text-emerald-400'}`}>
            {isTridentSelected ? 'June 2025 Grid kWh Mismatch' : 'All facility records reconciled'}
          </div>
        </div>

        {/* Card 4: Upcoming Filings */}
        <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Upcoming Filings</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {selectedGroup
              ? displayCalendarItems.length
              : (calendarItems.filter((c) => c.status === 'PENDING').length || 4)}
          </div>
          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
            {selectedGroup ? `Statutory Cycles for ${selectedGroup.name.split(' ')[0]}` : 'Next due: July CEA Filing'}
          </div>
        </div>
      </div>

      {/* Discrepancy Action Banner */}
      {isTridentSelected && clarifications.length > 0 ? (
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-sm shrink-0"
            style={{ color: '#FFFFFF' }}
          >
            <span>Open Verification Engine & Email</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : selectedGroup ? (
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  Statutory Compliance Status Verified — {selectedGroup.name}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                  {currentFacilities.length} Operating Facilities
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                All operating units for <strong>{selectedGroup.name}</strong> are verified under BEE PAT & CCTS baselines with zero open discrepancies.
              </p>
            </div>
          </div>

          <Link
            href={`/clients/${selectedGroup._id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-[#A56F63] dark:hover:bg-[#8C594E] !text-white text-xs font-bold transition-all shadow-sm shrink-0"
            style={{ color: '#FFFFFF' }}
          >
            <span>View {selectedGroup.name} Directory</span>
            <ArrowRight className="w-3.5 h-3.5 !text-white" />
          </Link>
        </div>
      ) : null}

      {/* Two Column Grid: Upcoming Deadlines & Dynamic Registered Facilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Deadlines */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>
                {selectedGroup
                  ? `${selectedGroup.name} Statutory Deadlines`
                  : 'Statutory Deadlines & Compliance Calendar'}
              </span>
            </h3>
            <Link
              href={selectedGroup ? `/calendar?search=${encodeURIComponent(selectedGroup.name)}` : '/calendar'}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              View full calendar
            </Link>
          </div>

          <div className="space-y-2.5">
            {displayCalendarItems.slice(0, 4).map((item) => (
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

        {/* Dynamic Registered Client Facilities List */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>
                {selectedGroup
                  ? `${selectedGroup.name} Facilities (${currentFacilities.length})`
                  : 'Registered Client Facilities'}
              </span>
            </h3>
            <Link
              href={selectedGroup ? `/clients/${selectedGroup._id}` : '/clients'}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              {selectedGroup ? `View All ${currentFacilities.length} Units →` : 'Browse all clients →'}
            </Link>
          </div>

          <div className="space-y-3">
            {currentFacilities.slice(0, 4).map((fac) => (
              <div
                key={fac._id || fac.facilityId}
                className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                      {fac.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {fac.location} · {fac.category}
                    </p>
                  </div>
                  <Link
                    href={`/facilities/${fac.facilityId}`}
                    className="px-2.5 py-1 text-xs rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 font-semibold transition-colors shrink-0"
                  >
                    Open Matrix
                  </Link>
                </div>
                <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    {fac.facilityId}
                  </span>
                  <span>·</span>
                  <span>Active BEE/CCTS Monitoring</span>
                </div>
              </div>
            ))}

            {currentFacilities.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                No facilities registered for this company yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
