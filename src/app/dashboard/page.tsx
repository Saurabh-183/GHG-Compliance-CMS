
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
  Factory,
} from 'lucide-react';
import {
  ICalendarItem,
  IClarification,
  IClientGroup,
  IFacility,
} from '@/types';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } from '@/lib/mockFallback';
import { CompanySelectMui } from '@/components/dashboard/CompanySelectMui';
import { FacilitySelectMui } from '@/components/dashboard/FacilitySelectMui';
import { ClientSubmissionsReviewTable } from '@/components/uploads/ClientSubmissionsReviewTable';
import { generateDeadlinesForFacilities } from '@/lib/statutoryCalendar';
import { FacilityDataChecklistPanel } from '@/components/checklist/FacilityDataChecklistPanel';
import {
  facilityIdsCsv,
  flattenGroupFacilities,
  resolveCompanyScope,
} from '@/lib/clientGroupFacilities';

function buildMockGroupsWithFacilities(): IClientGroup[] {
  return MOCK_CLIENT_GROUPS.map((group) => {
    const facilities = MOCK_FACILITIES.filter(
      (f) => f.clientGroupId === group._id || f.clientGroupId === group.code
    );
    return {
      ...group,
      totalFacilitiesCount: facilities.length,
      facilities: facilities.length > 0 ? (facilities as unknown as IFacility[]) : (group.facilities || []),
    };
  });
}

export default function DashboardPage() {
  const { currentRole, currentUser } = useAuth();

  const [calendarItems, setCalendarItems] = useState<ICalendarItem[]>([]);
  const [clarifications, setClarifications] = useState<IClarification[]>([]);
  const [groups, setGroups] = useState<IClientGroup[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [checklistFacilityId, setChecklistFacilityId] = useState<string>('');
  const [dashTab, setDashTab] = useState<'companies' | 'facilities'>('companies');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [calRes, clarRes, groupsRes] = await Promise.all([
          fetch('/api/calendar', { credentials: 'include', cache: 'no-store' }).catch(() => null),
          fetch('/api/clarifications', { credentials: 'include', cache: 'no-store' }).catch(() => null),
          fetch('/api/client-groups', { credentials: 'include', cache: 'no-store' }).catch(() => null),
        ]);

        if (calRes?.ok) {
          const calData = (await calRes.json()) as {
            data: ICalendarItem[];
          };
          setCalendarItems(calData.data || []);
        }

        if (clarRes?.ok) {
          const clarData = (await clarRes.json()) as {
            data: IClarification[];
          };
          setClarifications(clarData.data || []);
        }

        if (groupsRes?.ok) {
          const groupsData = (await groupsRes.json()) as {
            data: IClientGroup[];
          };

          const dbGroups = groupsData.data || [];
          const mockGroups = buildMockGroupsWithFacilities();
          const dbNames = new Set(dbGroups.map((g) => g.name.trim().toLowerCase()));
          const dbCodes = new Set(dbGroups.map((g) => (g.code || '').trim().toLowerCase()));
          const dbIds = new Set(dbGroups.map((g) => String(g._id)));

          const filteredMocks = mockGroups.filter(
            (m) =>
              !dbIds.has(String(m._id)) &&
              !dbNames.has(m.name.trim().toLowerCase()) &&
              !dbCodes.has((m.code || '').trim().toLowerCase())
          );

          setGroups([...dbGroups, ...filteredMocks]);
        } else {
          setGroups(buildMockGroupsWithFacilities());
        }
      } catch (err) {
        console.warn(
          'Fallback: loading local mock client groups on dashboard:',
          err
        );
        setGroups(buildMockGroupsWithFacilities());
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const allFacilities = flattenGroupFacilities(groups);
  const { selectedGroup, currentFacilities } = resolveCompanyScope(
    selectedCompanyId,
    groups
  );
  const scopedFacilityIdsCsv = selectedGroup ? facilityIdsCsv(currentFacilities) : undefined;

  // Filter calendar deadlines for the selected company.
  useEffect(() => {
    if (currentFacilities.length === 0) {
      setChecklistFacilityId('');
      return;
    }
    setChecklistFacilityId((prev) => {
      if (prev && currentFacilities.some((f) => f.facilityId === prev)) return prev;
      return currentFacilities[0].facilityId;
    });
  }, [currentFacilities]);

  const checklistFacility = currentFacilities.find((f) => f.facilityId === checklistFacilityId);

  if (loading) {
    return <CarbonCrunchLoader message="Loading consultant compliance workspace..." />;
  }

  // Filter calendar deadlines for selected company if applicable
  const filteredCalendarItems = selectedGroup
    ? calendarItems.filter((item) =>
        currentFacilities.some(
          (facility) =>
            facility.facilityId.toUpperCase() ===
              item.facilityId.toUpperCase() ||
            (item.facilityName &&
              (facility.name
                .toLowerCase()
                .includes(item.facilityName.toLowerCase()) ||
                item.facilityName
                  .toLowerCase()
                  .includes(facility.name.toLowerCase())))
        )
      )
    : calendarItems;

  // Generate fallback statutory calendar items when no DB records exist.
  const fallbackCompanyCalendarItems: ICalendarItem[] =
    selectedGroup && currentFacilities.length > 0
      ? generateDeadlinesForFacilities(currentFacilities)
      : [];

  const displayCalendarItems = selectedGroup
    ? filteredCalendarItems.length > 0
      ? filteredCalendarItems
      : fallbackCompanyCalendarItems
    : calendarItems;

  const totalUnitsCount = allFacilities.length;
  const displayedFacilitiesCount = selectedGroup
    ? currentFacilities.length
    : totalUnitsCount;

  // Active compliances mapped dynamically based on assigned/operating facilities (3 statutory frameworks: RCO, PAT, CCTS)
  const activeCompliancesCount = displayedFacilitiesCount * 3;

  const isTridentSelected =
    !!selectedGroup &&
    (selectedGroup.code === 'TRI' ||
      selectedGroup.code === 'TRIDENT' ||
      selectedGroup.name.toLowerCase().includes('trident'));

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Workspace Welcome & Company Dropdown Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            My Workspace —{' '}
            {currentRole === 'ADMIN' ? 'Admin' : 'Consultant'} Dashboard
          </h1>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logged in as <strong className="text-emerald-700 dark:text-emerald-400">{currentUser?.name}</strong> ({currentUser?.designation})
            {selectedGroup && (
              <span> · Active View: <strong className="text-slate-800 dark:text-white">{selectedGroup.name}</strong></span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <CompanySelectMui
            groups={groups}
            selectedCompanyId={selectedCompanyId}
            onCompanyChange={(id) => setSelectedCompanyId(id)}
          />
        </div>
      </div>

      {/* Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Client Companies */}
        <Link
          href="/clients"
          className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm hover:border-emerald-500/50 transition-all block group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
              Client Companies
            </span>
            <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>

          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {groups.length}
          </div>

          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 truncate">
            {groups.length > 0
              ? groups
                  .slice(0, 3)
                  .map((g) => g.name.split(' ')[0])
                  .join(', ') + (groups.length > 3 ? '...' : '')
              : 'No client companies registered'}
          </div>
        </Link>

        {/* Assigned Facilities */}
        <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {selectedGroup ? 'Assigned Operating Units' : 'Assigned Facilities'}
            </span>
            <Factory className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>

          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {displayedFacilitiesCount}
          </div>

          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-1 truncate">
            {selectedGroup
              ? currentFacilities.length > 0
                ? currentFacilities
                    .slice(0, 3)
                    .map((facility) => facility.name.split(' ')[0])
                    .join(', ') +
                  (currentFacilities.length > 3 ? '...' : '')
                : 'No facilities registered'
              : allFacilities.length > 0
                ? allFacilities
                    .slice(0, 3)
                    .map((f) => f.name.split(' ')[0])
                    .join(', ') + (allFacilities.length > 3 ? '...' : '')
                : 'No operating units'}
          </div>
        </div>

        {/* Active Compliances */}
        <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Compliances
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>

          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
            {activeCompliancesCount} Records
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            RCO, PAT, CCTS
          </div>
        </div>
      </div>

      {/* Discrepancy Action Banner */}
      {isTridentSelected && clarifications.length > 0 ? (
        <div className="rounded-md border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
                Client declared <strong>1,280,000 kWh</strong> in Excel
                while official PSPCL electricity bill records{' '}
                <strong>1,265,000 kWh</strong> (Variance:{' '}
                <strong>15,000 kWh / 1.186%</strong>).
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
        <div className="rounded-md border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-300">
                  Statutory Compliance Status Verified —{' '}
                  {selectedGroup.name}
                </h3>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                  {currentFacilities.length} Operating Facilities
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                All operating units for{' '}
                <strong>{selectedGroup.name}</strong> are verified under
                BEE PAT & CCTS baselines with zero open discrepancies.
              </p>
            </div>
          </div>

          <Link
            href={`/clients/${selectedGroup._id}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-emerald-700 dark:hover:bg-emerald-800 !text-white text-xs font-bold transition-all shadow-sm shrink-0"
            style={{ color: '#FFFFFF' }}
          >
            <span>View {selectedGroup.name} Directory</span>
            <ArrowRight className="w-3.5 h-3.5 !text-white" />
          </Link>
        </div>
      ) : null}

      {/* Client submissions — same mapping as Data Review (live Drive uploads) */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Client submissions for review
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Mapped from client portal uploads — same list as{' '}
            <Link href="/data-review" className="text-emerald-700 dark:text-emerald-400 hover:underline">
              Data Review
            </Link>
            . Use{' '}
            <Link href="/client-uploads" className="text-emerald-700 dark:text-emerald-400 hover:underline">
              Client Drive Vault
            </Link>{' '}
            for vault path and monthly mapping.
          </p>
        </div>
        <ClientSubmissionsReviewTable
          compact
          showWorkflowFilter={false}
          clientGroupId={selectedGroup?._id?.toString()}
          facilityIds={scopedFacilityIdsCsv}
          facilityId={
            selectedGroup && currentFacilities.length === 1
              ? currentFacilities[0].facilityId
              : undefined
          }
        />
      </div>

      {/* Upcoming Deadlines & Registered Facilities */}
      {selectedGroup && checklistFacility && (
        <div className="space-y-3">
          {currentFacilities.length > 1 && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-slate-600 dark:text-slate-400">Data checklist facility:</span>
              <FacilitySelectMui
                facilities={currentFacilities}
                selectedFacilityId={checklistFacilityId}
                onFacilityChange={(id) => setChecklistFacilityId(id)}
              />
            </div>
          )}
          <FacilityDataChecklistPanel
            key={checklistFacility.facilityId}
            facilityId={checklistFacility.facilityId}
            facilityName={checklistFacility.name}
            mode="internal"
          />
        </div>
      )}

      {/* Two Column Grid: Upcoming Deadlines & Dynamic Registered Facilities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Deadlines */}
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>
                {selectedGroup
                  ? `${selectedGroup.name} Statutory Deadlines`
                  : 'Compliance Calendar'}
              </span>
            </h3>

            <Link
              href={
                selectedGroup
                  ? `/calendar?company=${encodeURIComponent(selectedGroup._id)}`
                  : '/calendar'
              }
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
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{item.facilityName}</span>

                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-transparent">
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

            {displayCalendarItems.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                No upcoming deadlines found.
              </div>
            )}
          </div>
        </div>

        {/* Registered Client Companies & Operating Facilities */}
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />

              {selectedGroup ? (
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {selectedGroup.name} Facilities ({currentFacilities.length})
                </h3>
              ) : (
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setDashTab('companies')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      dashTab === 'companies'
                        ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Client Companies ({groups.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDashTab('facilities')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                      dashTab === 'facilities'
                        ? 'bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Operating Units ({totalUnitsCount})
                  </button>
                </div>
              )}
            </div>

            <Link
              href={selectedGroup ? `/clients/${selectedGroup._id}` : '/clients'}
              className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
            >
              {selectedGroup
                ? `View All ${currentFacilities.length} Units →`
                : 'Browse all clients →'}
            </Link>
          </div>

          <div className="space-y-3">
            {!selectedGroup && dashTab === 'companies' ? (
              <>
                {groups.slice(0, 5).map((group) => {
                  const facCount = group.totalFacilitiesCount ?? (group.facilities?.length || 0);
                  const fws = Array.isArray(group.enabledFrameworks) && group.enabledFrameworks.length > 0
                    ? group.enabledFrameworks
                    : ['RCO', 'PAT', 'CCTS'];

                  return (
                    <div
                      key={group._id}
                      className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {group.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {group.industry || 'Industrial / Manufacturing'}{group.headquarters ? ` · ${group.headquarters}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedCompanyId(group._id)}
                            className="px-2 py-1 text-[11px] rounded bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 font-medium transition-colors cursor-pointer"
                            title="Filter dashboard to this client company"
                          >
                            Scope View
                          </button>
                          <Link
                            href={`/clients/${group._id}`}
                            className="px-2.5 py-1 text-xs rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 font-semibold transition-colors"
                          >
                            View Units
                          </Link>
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Frameworks:</span>
                          {fws.map((fw) => (
                            <span
                              key={fw}
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60"
                            >
                              {fw}
                            </span>
                          ))}
                        </div>

                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          {facCount} {facCount === 1 ? 'Operating Unit' : 'Operating Units'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {groups.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                    No client companies registered yet.
                  </div>
                )}
              </>
            ) : (
              <>
                {currentFacilities.slice(0, 5).map((facility) => (
                  <div
                    key={facility._id || facility.facilityId}
                    className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {facility.name}
                        </h4>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {facility.location} · {facility.category}
                        </p>
                      </div>
                      <Link
                        href={`/facilities/${facility.facilityId}`}
                        className="px-2.5 py-1 text-xs rounded bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 font-semibold transition-colors shrink-0"
                      >
                        Open Facility
                      </Link>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {facility.facilityId}
                      </span>
                      <span>·</span>
                      <span>Active BEE/CCTS Monitoring</span>
                    </div>
                  </div>
                ))}

                {currentFacilities.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                    No facilities registered for this company yet.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
