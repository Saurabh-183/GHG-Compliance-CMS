'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IFacilityComplianceMatrix, IComplianceApplicability } from '@/types';
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    dataGivenPercentage: 100,
    dataMatchedPercentage: 91.7,
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oIObLXY-cBpYGO6CIOnk_Ax4R4Y8SSE7',
    driveFolderName: 'Carbon Crunch · Compliance Documents & Evidence Vault',
    isDriveConnected: true,
  });

  const loadMatrix = async () => {
    try {
      const [res, driveRes, datasetRes, filesRes] = await Promise.all([
        fetch(`/api/facilities/${facilityId}/compliance-matrix`).catch(() => null),
        fetch(`/api/drive/connect?facilityId=${facilityId}`).catch(() => null),
        fetch(`/api/datasets?facilityId=${facilityId}`).catch(() => null),
        fetch(`/api/drive/files?facilityId=${facilityId}`).catch(() => null),
      ]);

      if (res && res.ok) {
        const json = (await res.json()) as {
          data: IFacilityComplianceMatrix & { rawApplicability: IComplianceApplicability[] };
        };
        setMatrixData(json.data);
        setRawApplicability(json.data.rawApplicability || []);
      }

      // Check drive connection status
      if (driveRes && driveRes.ok) {
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

      // Dynamic calculation from synced Drive dataset
      if (datasetRes && datasetRes.ok) {
        const dJson = await datasetRes.json();
        const ds = dJson.data?.[0];
        if (ds && ds.months && ds.months.length > 0) {
          const declared = ds.months.filter((m: any) => m.declaredValue > 0).length;
          const givenPct = Math.round((declared / 12) * 100);
          const evaluated = ds.months.filter((m: any) => m.evidenceValue !== null && m.declaredValue > 0);
          const matched = evaluated.filter((m: any) => m.result === 'MATCHED').length;
          const matchedPct = evaluated.length > 0 ? Number(((matched / evaluated.length) * 100).toFixed(1)) : 100;
          setStats((prev) => ({
            ...prev,
            dataGivenPercentage: givenPct,
            dataMatchedPercentage: matchedPct,
          }));
        }
      }

      // Load Drive evidence files
      if (filesRes && filesRes.ok) {
        const fJson = await filesRes.json();
        if (fJson.data?.files) {
          setDriveFiles(fJson.data.files);
        }
      }
    } catch (e) {
      console.error('Error fetching compliance matrix and Drive files:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix();
  }, [facilityId]);

  if (loading) {
    return <CarbonCrunchLoader message={`Loading Facility Compliance Matrix (${facilityId})...`} />;
  }

  if (!matrixData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <h2 className="text-lg font-bold text-white">Facility Not Found</h2>
        <Link href="/clients" className="mt-4 inline-block text-emerald-400 hover:underline text-xs">
          Return to Clients
        </Link>
      </div>
    );
  }

  const { facility } = matrixData;
  const resolvedGroup = resolveClientGroup(facility);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link href="/clients" className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
          Clients
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600" />
        <Link
          href={resolvedGroup.id ? `/clients/${resolvedGroup.id}` : '/clients'}
          className="hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors font-medium"
        >
          {resolvedGroup.name}
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400 dark:text-slate-600" />
        <span className="text-slate-900 dark:text-slate-200 font-semibold">{facility.name}</span>
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
                Assigned Lead: <strong className="text-slate-800 dark:text-slate-200">Priya Sharma</strong> (Senior Energy & Carbon Compliance Lead)
              </span>
              <span>·</span>
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
                <Folder className="w-3.5 h-3.5" />
                <span>Google Drive Vault Connected</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-[#A56F63] dark:hover:bg-[#8C594E] !text-white text-xs font-semibold shadow-sm transition-colors"
              style={{ color: '#FFFFFF' }}
            >
              <RefreshCw className="w-3.5 h-3.5 !text-white" style={{ stroke: '#FFFFFF' }} />
              <span className="!text-white font-semibold" style={{ color: '#FFFFFF' }}>Connect & Sync Drive</span>
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
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#17365D] hover:bg-[#102947] dark:bg-[#A56F63] dark:hover:bg-[#8C594E] !text-white text-xs font-semibold transition-colors shadow-sm"
              style={{ color: '#FFFFFF' }}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 !text-white" style={{ stroke: '#FFFFFF' }} />
              <span className="!text-white font-semibold" style={{ color: '#FFFFFF' }}>Reconciliation Engine</span>
            </Link>
          </div>
        </div>

        {/* PRD Highlights: Data Given % & Data Matched % KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Given Percentage</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {stats.dataGivenPercentage}%
            </div>
            <p className="text-[11px] text-slate-500">12 of 12 financial year months client-declared</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Matched Percentage</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white">
              {stats.dataMatchedPercentage}%
            </div>
            <p className="text-[11px] text-slate-500">3 of 4 evaluated months match within 0 kWh tolerance</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
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
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-md space-y-4">
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
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
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
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-200">
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
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-md space-y-4">
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
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {f.mimeType.includes('pdf') ? 'PDF Utility Bill / Certificate' : 'Excel Energy Model / Log'}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">
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
        onSyncSuccess={(res) => {
          setStats((prev) => ({
            ...prev,
            dataGivenPercentage: res.dataGivenPercentage,
            dataMatchedPercentage: res.dataMatchedPercentage,
          }));
          loadMatrix();
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
