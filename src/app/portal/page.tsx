'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ExcelImportModal } from '@/components/compliance/ExcelImportModal';
import { DriveConnectionModal } from '@/components/common/DriveConnectionModal';
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
} from 'lucide-react';
import { IDataRequirement, IFacility, IClarification } from '@/types';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { rewriteLegacyVaultUrlsInText } from '@/lib/gdrive';
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

export default function ClientPortalDashboard() {
  const { currentUser, currentRole } = useAuth();
  const [data, setData] = useState<{
    facilities: IFacility[];
    openClarifications: IClarification[];
  } | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<ClientSubmittedDriveFileCard[]>([]);
  const [requestProgress, setRequestProgress] = useState(
    computePortalDataRequestPercentages([])
  );
  const [loading, setLoading] = useState(true);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
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
      } else {
        setRequestProgress(computePortalDataRequestPercentages([]));
        setSubmissionFiles([]);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Client Group Overview Hero */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 sm:p-8 shadow-sm dark:shadow-xl">
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
              Direct visibility into authorized facilities, outstanding data submissions, Google Drive repository evidence, and verified historical reports.
            </p>
          </div>

          <div className="flex flex-row flex-wrap items-center gap-2.5 shrink-0 self-start md:self-center">
            <Link
              href="/portal/regulatory"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-sm transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Regulatory Requests</span>
            </Link>
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Compliance Excel Templates</span>
            </button>

            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 font-semibold text-xs shadow-xs transition-colors whitespace-nowrap"
            >
              <Folder className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Drive Evidence Vault</span>
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

      {/* Authorized Facilities Grid */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Your Authorized Operating Facilities
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              <span className="font-semibold">Financial year</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 font-mono"
              >
                {PORTAL_PERIOD_OPTIONS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </label>
            <Link
              href={`/portal/requests${buildPortalScopeQuery(selectedFacilityId, selectedPeriod)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-3 py-1.5 font-semibold text-white"
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
                Drive links your team attached on data requests for {selectedPeriod} (all authorized facilities).
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
            {submissionFiles.slice(0, 9).map((f) => (
              <div
                key={f.id}
                className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3 text-xs"
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
                  <a
                    href={rewriteLegacyVaultUrlsInText(f.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1 text-[11px] shrink-0"
                  >
                    <span>Open file</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google Drive Connection & Direct Sync Modal */}
      <DriveConnectionModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        facilityId={primaryFacilityId}
      />

      {/* Standardized Excel Import & Templates Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        facilityId={primaryFacilityId}
      />

    </div>
  );
}
