'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ExcelImportModal } from '@/components/compliance/ExcelImportModal';
import {
  Building2,
  FileSpreadsheet,
  AlertTriangle,
  Folder,
  ArrowRight,
  ExternalLink,
  Download,
  TrendingUp,
  CheckCheck,
  CalendarRange,
} from 'lucide-react';
import { FormControl, Select, MenuItem, SelectChangeEvent } from '@mui/material';
import { IDataRequirement, IFacility, IClarification } from '@/types';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { computePortalDataRequestPercentages } from '@/lib/requestStats';
import {
  type ClientSubmittedDriveFileCard,
  listClientSubmittedDriveFiles,
} from '@/lib/clientMonthlyEvidenceRows';
import {
  buildPortalScopeQuery,
  dedupeFacilitiesById,
  portalAllowListFromUser,
  readPortalPeriod,
  writePortalScope,
  PORTAL_PERIOD_OPTIONS,
} from '@/lib/portalScope';
import {
  formatClientGroupDisplayName,
  pickClientGroupNameFromFacilities,
} from '@/lib/clientGroupDisplay';
import {
  extractPortalDeadlineAlerts,
  type DeadlineAlertItem,
} from '@/lib/deadlineAlertsShared';

export default function ClientPortalDashboard() {
  const { currentUser, currentRole, theme } = useAuth();
  const isDark = theme === 'dark';
  const [data, setData] = useState<{
    facilities: IFacility[];
    openClarifications: IClarification[];
    deadlineAlerts?: DeadlineAlertItem[];
  } | null>(null);
  const [portalAlerts, setPortalAlerts] = useState<DeadlineAlertItem[]>([]);
  const [submissionFiles, setSubmissionFiles] = useState<ClientSubmittedDriveFileCard[]>([]);
  const [requestProgress, setRequestProgress] = useState(
    computePortalDataRequestPercentages([])
  );
  const [loading, setLoading] = useState(true);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState(() => {
    if (typeof window === 'undefined') return '';
    return sessionStorage.getItem('portalSelectedFacilityId') || '';
  });
  const [selectedPeriod, setSelectedPeriod] = useState(() => readPortalPeriod());
  const hasLoadedOnceRef = useRef(false);

  const loadPortal = useCallback(async (period?: string) => {
    try {
      if (!hasLoadedOnceRef.current) setLoading(true);
      const periodQs = period?.trim()
        ? `?period=${encodeURIComponent(period.trim())}`
        : '';
      const reqQs = period?.trim()
        ? `?period=${encodeURIComponent(period.trim())}`
        : '';
      const [res, reqRes] = await Promise.all([
        fetch(`/api/portal/dashboard${periodQs}`, { cache: 'no-store', credentials: 'include' }).catch(() => null),
        fetch(`/api/requirements${reqQs}`, { cache: 'no-store', credentials: 'include' }).catch(() => null),
      ]);

      if (res && res.ok) {
        const json = (await res.json()) as { data: typeof data };
        setData(json.data);
        if (json.data?.deadlineAlerts && json.data.deadlineAlerts.length > 0) {
          setPortalAlerts(json.data.deadlineAlerts);
        }
      }

      const allowed = new Set(portalAllowListFromUser(currentUser));
      if (reqRes && reqRes.ok) {
        const reqJson = (await reqRes.json()) as { data?: IDataRequirement[] };
        const scoped = (reqJson.data || []).filter(
          (r) =>
            allowed.has(r.facilityId?.toUpperCase()) &&
            (!period?.trim() || r.period === period.trim()) &&
            r.isApplicable !== false
        );
        setRequestProgress(computePortalDataRequestPercentages(scoped));
        setSubmissionFiles(listClientSubmittedDriveFiles(scoped));
        const directAlerts = extractPortalDeadlineAlerts(scoped);
        setPortalAlerts((prev) => (directAlerts.length > 0 ? directAlerts : prev));
      } else {
        setRequestProgress(computePortalDataRequestPercentages([]));
        setSubmissionFiles([]);
        setPortalAlerts([]);
      }
    } catch (e) {
      console.error('Error fetching portal dashboard:', e);
    } finally {
      hasLoadedOnceRef.current = true;
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadPortal(selectedPeriod);
  }, [loadPortal, selectedPeriod]);

  useEffect(() => {
    if (!data?.facilities?.length) return;
    const known = data.facilities.some((f) => f.facilityId === selectedFacilityId);
    if (!known) {
      setSelectedFacilityId(data.facilities[0].facilityId);
    }
  }, [data?.facilities, selectedFacilityId]);

  useEffect(() => {
    if (selectedFacilityId && selectedPeriod) {
      writePortalScope(selectedFacilityId, selectedPeriod);
    }
  }, [selectedFacilityId, selectedPeriod]);

  const facilities = useMemo(() => {
    const allowed = new Set(portalAllowListFromUser(currentUser));
    return dedupeFacilitiesById(
      (data?.facilities || []).filter((f) => allowed.has(f.facilityId.toUpperCase()))
    );
  }, [data?.facilities, currentUser]);

  const facilityLineSummary = useMemo(() => {
    if (!facilities.length) return '—';
    const labels = facilities.map((f) => {
      const cat = f.category?.trim();
      if (cat) return cat.split(/[·,]/)[0]?.trim() || cat;
      return f.name;
    });
    return [...new Set(labels)].slice(0, 4).join(', ');
  }, [facilities]);

  if (loading && !data) {
    return <CarbonCrunchLoader message="Loading Client Compliance Portal..." />;
  }

  // Strict RBAC: Consultants cannot enter the external Client Portal
  if (currentRole !== 'CLIENT' && currentRole !== 'ADMIN') {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-slate-900 border border-emerald-200 dark:border-slate-700 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-md">
          <Building2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Client Portal Area</h2>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Your active account role is <strong className="text-emerald-700 dark:text-emerald-400">{currentRole}</strong>.
          The Client Portal is reserved exclusively for external industrial client representatives (e.g., Trident Group) to upload Google Drive evidence and answer clarification queries.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs text-white font-semibold shadow-sm transition-colors"
          >
            <span>Return to Internal Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const openClarifications = data?.openClarifications || [];
  const openActionClarifications = openClarifications.filter((c) => c.status === 'OPEN');
  const primaryOpenClarification = openActionClarifications[0] || openClarifications[0];
  const {
    dataGivenPercentage,
    dataMatchedPercentage,
    givenCount,
    matchedCount,
    auditedCount,
    total: requestTotal,
  } = requestProgress;
  const primaryFacilityId = selectedFacilityId || facilities[0]?.facilityId || 'TRIDENT_PAPER';
  const clientOrgName = formatClientGroupDisplayName({
    clientGroupName:
      pickClientGroupNameFromFacilities(facilities) || currentUser?.clientGroupName,
    clientGroupId: currentUser?.clientGroupId,
  });

  return (
    <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Client Group Overview Hero */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 dark:shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-2">
              Authorized Client Organization
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {clientOrgName} — Compliance Portal
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed max-w-3xl">
              Welcome, <strong className="text-emerald-700 dark:text-emerald-400">{currentUser?.name || 'Vikram Singh'}</strong> ({currentUser?.designation || 'Head of Regulatory Affairs'}).
              Direct visibility into authorized facilities, outstanding data submissions, submitted evidence, and verified historical reports.
            </p>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
            <Link
              href="/portal/regulatory"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white !text-white font-semibold text-xs shadow-sm transition-colors whitespace-nowrap"
              style={{ color: '#FFFFFF' }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white !text-white" style={{ stroke: '#FFFFFF', color: '#FFFFFF' }} />
              <span className="text-white !text-white font-semibold" style={{ color: '#FFFFFF' }}>Regulatory Requests</span>
            </Link>
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Compliance Excel Templates</span>
            </button>

          </div>
        </div>

        {/* PRD Highlights: Data Given % & Data Matched % */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Given</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">{dataGivenPercentage}%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {requestTotal > 0
                ? `${givenCount} of ${requestTotal} consultant requests submitted (${selectedPeriod}) across ${facilities.length} unit(s)`
                : `No data requests for ${selectedPeriod} yet`}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Matched</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">{dataMatchedPercentage}%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {auditedCount > 0
                ? `${matchedCount} of ${auditedCount} submitted requests accepted by consultant`
                : requestTotal > 0
                  ? 'No submissions under consultant review yet'
                  : '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Operating Facilities</span>
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {facilities.length} Unit{facilities.length === 1 ? '' : 's'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={facilityLineSummary}>
              {facilityLineSummary}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Action Items</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
            </div>
            <div
              className={`text-xl font-bold ${
                openActionClarifications.length > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-slate-900 dark:text-white'
              }`}
            >
              {openActionClarifications.length}{' '}
              {openActionClarifications.length === 1 ? 'Query' : 'Queries'}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
              {primaryOpenClarification
                ? `${primaryOpenClarification.month || ''} ${primaryOpenClarification.parameter || 'Clarification'}`.trim()
                : openClarifications.length > 0
                  ? 'Awaiting consultant review on your responses'
                  : 'No open clarification queries'}
            </p>
          </div>
        </div>
      </div>

      {/* Critical Deadline Alert Banner (<= 5 Days or Overdue) */}
      {portalAlerts.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-500 bg-rose-50 dark:bg-rose-950/60 p-5 sm:p-6 shadow-xl space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-rose-600 text-white shadow-md shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-rose-950 dark:text-rose-100 tracking-tight">
                    Urgent Compliance Deadlines ({portalAlerts.length})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-2xs">
                    Due in &le; 5 Days or Past Due
                  </span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5 font-medium">
                  The following requirements require immediate submission. Please upload your Google Drive evidence and complete submissions to prevent statutory compliance penalties.
                </p>
              </div>
            </div>
            <Link
              href={`/portal/requests${buildPortalScopeQuery(selectedFacilityId, selectedPeriod)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-colors whitespace-nowrap self-start sm:self-center"
            >
              <span>View Data Requests</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {portalAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className="rounded-xl border border-rose-200 dark:border-rose-900/70 bg-white dark:bg-slate-900/90 p-4 shadow-sm space-y-2.5 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                      {alert.facilityId}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                        alert.isOverdue
                          ? 'bg-rose-600 text-white animate-pulse'
                          : alert.isToday
                            ? 'bg-rose-600 text-white'
                            : 'bg-amber-600 text-white'
                      }`}
                    >
                      {alert.isOverdue
                        ? `${Math.abs(alert.daysRemaining)}d Overdue`
                        : alert.isToday
                          ? 'Due Today'
                          : `Due in ${alert.daysRemaining} day${alert.daysRemaining === 1 ? '' : 's'}`}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2" title={alert.title}>
                    {alert.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Due Date: <strong className="text-slate-700 dark:text-slate-200">{new Date(alert.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                  </p>
                </div>
                <Link
                  href={alert.linkUrl}
                  className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors border border-rose-200 dark:border-rose-800"
                >
                  <span>Submit Required Evidence</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorized Facilities Grid */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Your Authorized Operating Facilities
          </h2>
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <CalendarRange className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold whitespace-nowrap">Financial year</span>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <Select
                  value={selectedPeriod}
                  onChange={(e: SelectChangeEvent) => setSelectedPeriod(e.target.value)}
                  sx={{
                    height: 36,
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    borderRadius: '8px',
                    backgroundColor: isDark ? '#020617' : '#FFFFFF',
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? '#34D399' : '#059669',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: isDark ? '#34D399' : '#059669',
                      borderWidth: '1.5px',
                    },
                    '& .MuiSelect-select': {
                      py: '6px',
                      px: '12px',
                    },
                  }}
                  MenuProps={{
                    slotProps: {
                      paper: {
                        sx: {
                          mt: 0.5,
                          maxHeight: 280,
                          borderRadius: '8px',
                          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                          color: isDark ? '#FFFFFF' : '#0F172A',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                          boxShadow: isDark
                            ? '0 10px 25px -5px rgba(0, 0, 0, 0.6)'
                            : '0 10px 25px -5px rgba(16, 185, 129, 0.12)',
                          '& .MuiList-root': { py: '4px' },
                        },
                      },
                    },
                  }}
                >
                  {PORTAL_PERIOD_OPTIONS.map((fy) => (
                    <MenuItem key={fy} value={fy} sx={{ fontSize: '12px', fontFamily: 'monospace' }}>
                      {fy}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </div>
            <Link
              href={`/portal/requests${buildPortalScopeQuery(selectedFacilityId, selectedPeriod)}`}
              className="inline-flex items-center gap-1.5 h-[36px] rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3.5 font-semibold text-white transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Data Requests
            </Link>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Select a facility card below, then open <strong>Data Requests</strong> for that unit and year. Approved filings
          are on <Link href="/portal/history" className="text-emerald-700 dark:text-emerald-400 hover:underline">Approved History</Link>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <div
              key={facility._id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedFacilityId(facility.facilityId)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSelectedFacilityId(facility.facilityId);
              }}
              className={`rounded-md border bg-white dark:bg-slate-900/60 p-5 shadow-sm flex flex-col justify-between transition-all cursor-pointer ${
                selectedFacilityId === facility.facilityId
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 border border-slate-200 dark:border-slate-700">
                    {facility.facilityId}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{facility.location}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{facility.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{facility.category}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Obligations: <strong>RCO, PAT, CCTS, CEA</strong>
                </span>
                <Link
                  href={`/portal/facilities/${facility.facilityId}`}
                  className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>View Overview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {submissionFiles.length > 0 && (
        <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Submitted evidence across your units ({submissionFiles.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Documents submitted through this portal for {selectedPeriod}. Click a card to open the file.
              </p>
            </div>
            <Link
              href={`/portal/requests${buildPortalScopeQuery(selectedFacilityId, selectedPeriod)}`}
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors self-start sm:self-center"
            >
              <span>Data Requests</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {submissionFiles.map((f) => (
              <a
                key={f.id}
                href={f.url}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3 text-xs cursor-pointer"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-[55%]">
                      {f.category.replace(/_/g, ' ')}
                    </span>
                    {f.month && (
                      <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                        {f.month}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={f.name}>
                    {f.name}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2" title={f.requestTitle}>
                    {f.requestTitle}
                    {f.requestId ? ` · ${f.requestId}` : ''}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {f.submittedBy || 'Client upload'}
                  </span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center gap-1 text-[11px] shrink-0">
                    <span>Open file</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Standardized Excel Import & Templates Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        facilityId={primaryFacilityId}
      />

    </div>
  );
}
