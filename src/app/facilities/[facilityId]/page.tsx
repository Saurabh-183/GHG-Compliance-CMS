'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IDataRequirement, IFacilityComplianceMatrix, IComplianceApplicability } from '@/types';
import { computePortalDataRequestPercentages } from '@/lib/requestStats';
import { PORTAL_PERIOD_OPTIONS, readPortalPeriod, writePortalScope } from '@/lib/portalScope';
import { ComplianceMatrixTable } from '@/components/compliance/ComplianceMatrixTable';
import { ExcelImportModal } from '@/components/compliance/ExcelImportModal';
import { DriveConnectionModal } from '@/components/common/DriveConnectionModal';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Folder,
  RefreshCw,
  TrendingUp,
  CheckCheck,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';
import { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } from '@/lib/mockFallback';

function resolveClientGroup(facility: {
  facilityId: string;
  name: string;
  clientGroupId?: string;
  clientGroupName?: string;
  clientGroupCode?: string;
  _id?: string;
}): { name: string; id: string } {
  // 1. Direct facility.clientGroupName if valid
  if (facility.clientGroupName && facility.clientGroupName !== 'Client Group') {
    return {
      name: facility.clientGroupName,
      id: facility.clientGroupId || facility.clientGroupCode || '',
    };
  }

  // 2. Lookup in MOCK_FACILITIES & MOCK_CLIENT_GROUPS
  const mockFac = MOCK_FACILITIES.find(
    (f) =>
      f.facilityId.toUpperCase() === facility.facilityId.toUpperCase() ||
      f._id === facility._id
  );
  if (mockFac) {
    const g = MOCK_CLIENT_GROUPS.find(
      (cg) => cg._id === mockFac.clientGroupId || cg.code === mockFac.clientGroupId
    );
    if (g) {
      return { name: g.name, id: g._id || g.code };
    }
    if (mockFac.clientGroupName) {
      return { name: mockFac.clientGroupName, id: mockFac.clientGroupId };
    }
  }

  // 3. Match from facility.clientGroupId in MOCK_CLIENT_GROUPS
  if (facility.clientGroupId) {
    const g = MOCK_CLIENT_GROUPS.find(
      (cg) => cg._id === facility.clientGroupId || cg.code === facility.clientGroupId
    );
    if (g) {
      return { name: g.name, id: g._id || g.code };
    }
  }

  // 4. Match company prefix from facility name (e.g. "N R Agarwal Unit 1" -> "N R Agarwal", "Chiripal Nandan Piplaj" -> "Chiripal Group")
  for (const g of MOCK_CLIENT_GROUPS) {
    if (
      facility.name.toLowerCase().includes(g.name.toLowerCase()) ||
      g.name.toLowerCase().includes(facility.name.split(' ')[0].toLowerCase())
    ) {
      return { name: g.name, id: g._id || g.code };
    }
  }

  return {
    name: facility.clientGroupName || 'Client Group',
    id: facility.clientGroupId || '',
  };
}

export default function FacilityDashboardPage() {
  const params = useParams();
  const facilityId = (params.facilityId as string) || 'TRIDENT_PAPER';
  const [matrixData, setMatrixData] = useState<IFacilityComplianceMatrix | null>(null);
  const [rawApplicability, setRawApplicability] = useState<IComplianceApplicability[]>([]);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(() => readPortalPeriod());
  const [requestProgress, setRequestProgress] = useState(
    computePortalDataRequestPercentages([])
  );

  const [stats, setStats] = useState({
    driveFolderUrl: process.env.NEXT_PUBLIC_GDRIVE_FOLDER_URL || GOOGLE_DRIVE_FOLDER_URL,
    driveFolderName: 'Carbon Crunch · Compliance Documents & Evidence Vault',
    isDriveConnected: true,
  });

  const loadMatrix = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const reqParams = new URLSearchParams({
        facilityId: facilityId.toUpperCase(),
        period: selectedPeriod,
      });
      const [res, driveRes, reqRes, filesRes] = await Promise.all([
        fetch(`/api/facilities/${encodeURIComponent(facilityId)}/compliance-matrix`, {
          cache: 'no-store',
        }).catch(() => null),
        fetch(`/api/drive/connect?facilityId=${encodeURIComponent(facilityId)}`, {
          cache: 'no-store',
        }).catch(() => null),
        fetch(`/api/requirements?${reqParams.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        }).catch(() => null),
        fetch(`/api/drive/files?facilityId=${encodeURIComponent(facilityId)}`, {
          cache: 'no-store',
        }).catch(() => null),
      ]);

      if (!res) {
        throw new Error('Could not reach the facility compliance API. Check that the development server is running.');
      }

      if (!res.ok) {
        let message = `Facility API request failed (${res.status}).`;

        try {
          const errorBody = await res.json();
          if (typeof errorBody?.error === 'string') {
            message = errorBody.error;
          } else if (typeof errorBody?.message === 'string') {
            message = errorBody.message;
          }
        } catch {
          // Keep the HTTP status message when the response is not JSON.
        }

        throw new Error(message);
      }

      const json = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: IFacilityComplianceMatrix & {
          rawApplicability?: IComplianceApplicability[];
        };
      };

      if (!json.data?.facility) {
        throw new Error(json.error || 'The API response did not include facility data.');
      }

      setMatrixData(json.data);
      setRawApplicability(json.data.rawApplicability || []);

      // Check Drive connection status.
      if (driveRes?.ok) {
        const driveJson = await driveRes.json();
        if (driveJson.data) {
          setStats((prev) => ({
            ...prev,
            isDriveConnected: driveJson.data.isConnected ?? true,
            driveFolderUrl: driveJson.data.folderUrl || prev.driveFolderUrl,
            driveFolderName: driveJson.data.folderName || prev.driveFolderName,
          }));
        }
      }

      if (reqRes?.ok) {
        const reqJson = (await reqRes.json()) as { data?: IDataRequirement[] };
        const scoped = (reqJson.data || []).filter(
          (r) =>
            r.facilityId?.toUpperCase() === facilityId.toUpperCase() &&
            r.period === selectedPeriod &&
            r.isApplicable !== false
        );
        setRequestProgress(computePortalDataRequestPercentages(scoped));
      } else {
        setRequestProgress(computePortalDataRequestPercentages([]));
      }

      // Load Drive evidence files.
      if (filesRes?.ok) {
        const fJson = await filesRes.json();
        if (Array.isArray(fJson.data?.files)) {
          setDriveFiles(fJson.data.files);
        }
      }
    } catch (error) {
      console.error('Error loading facility dashboard:', error);
      setMatrixData(null);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while loading this facility.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    writePortalScope(facilityId, selectedPeriod);
  }, [facilityId, selectedPeriod]);

  useEffect(() => {
    loadMatrix();
  }, [facilityId, selectedPeriod]);

  if (loading) {
    return <CarbonCrunchLoader message={`Loading Facility Compliance Matrix (${facilityId})...`} />;
  }

  if (!matrixData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {loadError?.toLowerCase().includes('not found')
            ? 'Facility Not Found'
            : 'Unable to Load Facility'}
        </h2>

        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          {loadError || 'The facility data could not be loaded.'}
        </p>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={loadMatrix}
            className="rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Try Again
          </button>

          <Link
            href="/clients"
            className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Return to Clients
          </Link>
        </div>
      </div>
    );
  }

  const { facility } = matrixData;
  const resolvedGroup = resolveClientGroup(facility);
  const {
    dataGivenPercentage,
    dataMatchedPercentage,
    givenCount,
    matchedCount,
    auditedCount,
    total: requestTotal,
  } = requestProgress;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ">
        <Link href="/clients" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
          Clients
        </Link>
        <ChevronRight className="w-3 h-3   dark:text-slate-400 " />
        <Link
          href={resolvedGroup.id ? `/clients/${resolvedGroup.id}` : '/clients'}
          className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors font-medium"
        >
          {resolvedGroup.name}
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="text-slate-900 dark:text-white font-semibold">{facility.name}</span>
      </div>

      {/* Facility Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-emerald-800 border border-slate-300 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700">
                {facility.facilityId}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {facility.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                Active DC
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {facility.category} · {facility.location}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
              <span>
                Assigned Lead: <strong className="text-slate-800 dark:text-white">Priya Sharma</strong> (Senior Energy & Carbon Compliance Lead)
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <Folder className="w-3.5 h-3.5" />
                <span>Google Drive Vault Connected</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="font-semibold">FY</span>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 font-mono text-xs"
              >
                {PORTAL_PERIOD_OPTIONS.map((fy) => (
                  <option key={fy} value={fy}>
                    {fy}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-[#A56F63] dark:hover:bg-[#8C594E] text-white! text-xs font-semibold shadow-sm transition-colors"
              style={{ color: '#FFFFFF' }}
            >
              <RefreshCw className="w-3.5 h-3.5 text-white!" style={{ stroke: '#FFFFFF' }} />
              <span className="text-white! font-semibold" style={{ color: '#FFFFFF' }}>Connect & Sync Drive</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-800 dark:bg-[#464858] dark:hover:bg-slate-700 dark:text-white text-xs font-semibold border border-slate-300 dark:border-slate-600 transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-700 dark:text-[#D99B7F]" />
              <span className="font-semibold text-slate-800 dark:text-white">Import Excel / Templates</span>
            </button>

            <Link
              href={`/datasets/${facilityId}/verify`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-[#A56F63] dark:hover:bg-[#8C594E] text-white! text-xs font-semibold transition-colors shadow-sm"
              style={{ color: '#FFFFFF' }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white!" style={{ stroke: '#FFFFFF' }} />
              <span className="text-white! font-semibold" style={{ color: '#FFFFFF' }}>Reconciliation Engine</span>
            </Link>
          </div>
        </div>

        {/* PRD Highlights: Data Given % & Data Matched % KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Given Percentage</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {dataGivenPercentage}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {requestTotal > 0
                ? `${givenCount} of ${requestTotal} data requests submitted for ${selectedPeriod}`
                : `No applicable data requests for ${selectedPeriod}`}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Matched Percentage</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {dataMatchedPercentage}%
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {auditedCount > 0
                ? `${matchedCount} of ${auditedCount} submitted requests accepted (${selectedPeriod})`
                : requestTotal > 0
                  ? 'No submitted requests under review yet'
                  : '—'}
            </p>
          </div>

          <div className="p-3.5 rounded-md bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Google Drive Evidence Vault</span>
              <Folder className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 truncate">
              {stats.driveFolderName}
            </div>
            <a
              href={stats.driveFolderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-slate-500 hover:text-emerald-700 dark:hover:text-emerald-400 inline-flex items-center gap-1"
            >
              <span>Browse Drive Repository</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Module 1: Multi-Year Compliance Matrix (Section 5.2) */}
      <ComplianceMatrixTable data={matrixData} />

      {/* Registered Compliance Applicabilities Detail Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              Statutory Compliance Applicability Register
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configured authorities, legal notifications, target values, and statutory submission deadlines.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-4">Framework</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Implementing Authority</th>
                <th className="py-3 px-4">Notification Ref</th>
                <th className="py-3 px-4">Target / Mandate</th>
                <th className="py-3 px-4">Statutory Deadline</th>
                <th className="py-3 px-4 text-center">Workflow</th>
                <th className="py-3 px-4 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70 text-xs">
              {rawApplicability.map((app) => (
                <tr key={app._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {app.complianceType}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                    {app.period}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                    {app.authority}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {app.notificationReference || '—'}
                  </td>
                  <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-semibold">
                    {app.targetValue !== null ? `${app.targetValue} ${app.targetUnit}` : 'Monthly Filing'}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                    {formatDate(app.deadline)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={app.workflowStatus} type="workflow" size="sm" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={app.complianceOutcome} type="outcome" size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Drive Evidence Vault & Synced Repository Files */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Folder className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              Google Drive Evidence Vault & Document Repository
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live mapped files, audited DISCOM invoices, consumption spreadsheets, and statutory certificates from the corporate Drive.
            </p>
          </div>
          <a
            href={stats.driveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors shadow-2xs self-start sm:self-center"
          >
            <span>Open Google Drive Folder</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {driveFiles.map((f: any) => (
            <div
              key={f.id}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {f.category.replace(/_/g, ' ')}
                  </span>
                  {f.month && (
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      {f.month}
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={f.name}>
                  {f.name}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 ">
                  {f.mimeType.includes('pdf') ? 'PDF Utility Bill / Certificate' : 'Excel Energy Model / Log'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px]  ">
                  {f.sizeBytes ? `${Math.round(f.sizeBytes / 1024)} KB` : 'Cloud Doc'}
                </span>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 dark:text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                >
                  <span>View in Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Drive Connection & Direct Sync Modal */}
      <DriveConnectionModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        facilityId={facilityId}
        onSyncSuccess={() => {
          void loadMatrix();
        }}
      />

      {/* Standardized Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        facilityId={facilityId}
        onImportSuccess={() => loadMatrix()}
      />
    </div>
  );
}
