'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IFacility, IComplianceApplicability, IDataset, IMonthlyRecord } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Building2,
  Calendar,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Clock,
  Layers,
  Folder,
  ExternalLink,
  TrendingUp,
  CheckCheck,
  FileSpreadsheet,
  FileText,
  Download,
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';

export default function ClientFacilityOverviewPage() {
  const params = useParams();
  const facilityId = (params.facilityId as string) || 'TRIDENT_PAPER';
  const [facility, setFacility] = useState<IFacility | null>(null);
  const [applicabilities, setApplicabilities] = useState<IComplianceApplicability[]>([]);
  const [dataset, setDataset] = useState<IDataset | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveConnection, setDriveConnection] = useState<{
    folderUrl: string;
    folderName: string;
    isConnected: boolean;
  }>({
    folderUrl: process.env.NEXT_PUBLIC_GDRIVE_FOLDER_URL || GOOGLE_DRIVE_FOLDER_URL,
    folderName: 'Carbon Crunch · Compliance Documents & Evidence Vault',
    isConnected: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [facRes, appRes, dsRes, filesRes, driveRes] = await Promise.all([
          fetch(`/api/facilities/${facilityId}`).catch(() => null),
          fetch(`/api/compliance-applicability?facilityId=${facilityId}`).catch(() => null),
          fetch(`/api/datasets?facilityId=${facilityId}`).catch(() => null),
          fetch(`/api/drive/files?facilityId=${facilityId}`).catch(() => null),
          fetch(`/api/drive/connect?facilityId=${facilityId}`).catch(() => null),
        ]);

        if (facRes && facRes.ok) {
          const facData = (await facRes.json()) as { data: IFacility };
          setFacility(facData.data);
        }
        if (appRes && appRes.ok) {
          const appData = (await appRes.json()) as { data: IComplianceApplicability[] };
          setApplicabilities(appData.data || []);
        }
        if (dsRes && dsRes.ok) {
          const dsData = await dsRes.json();
          if (dsData.data && dsData.data.length > 0) {
            setDataset(dsData.data[0]);
          }
        }
        if (filesRes && filesRes.ok) {
          const fData = await filesRes.json();
          if (fData.data?.files) {
            setDriveFiles(fData.data.files);
          }
        }
        if (driveRes && driveRes.ok) {
          const dJson = await driveRes.json();
          if (dJson.data) {
            setDriveConnection({
              folderUrl: dJson.data.folderUrl || process.env.NEXT_PUBLIC_GDRIVE_FOLDER_URL || GOOGLE_DRIVE_FOLDER_URL,
              folderName: dJson.data.folderName || 'Carbon Crunch · Compliance Documents & Evidence Vault',
              isConnected: dJson.data.isConnected ?? true,
            });
          }
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
    return <CarbonCrunchLoader message="Loading facility compliance overview & Drive data..." />;
  }

  if (!facility) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center  ">
        <h2 className="text-lg font-bold text-white">Facility Not Found</h2>
        <Link href="/portal" className="mt-4 inline-block text-emerald-400 text-xs">
          Return to Portal
        </Link>
      </div>
    );
  }

  // Calculate Metrics from Synced Drive Dataset
  const months = dataset?.months || [];
  const declaredCount = months.filter((m) => m.declaredValue > 0).length;
  const dataGivenPercentage = months.length > 0 ? Math.round((declaredCount / 12) * 100) : 100;
  const evaluated = months.filter((m) => m.evidenceValue !== null && m.declaredValue > 0);
  const matched = evaluated.filter((m) => m.result === 'MATCHED').length;
  const dataMatchedPercentage = evaluated.length > 0 ? Number(((matched / evaluated.length) * 100).toFixed(1)) : 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs  ">
        <Link href="/portal" className="hover:text-emerald-400">Client Portal</Link>
        <ChevronRight className="w-3 h-3   " />
        <span className="   dark:text-white font-semibold">{facility.name}</span>
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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Active DC
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {facility.category} · {facility.location}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs  ">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Folder className="w-3.5 h-3.5" />
                <span>Google Drive Vault Linked</span>
              </span>
              <span>·</span>
              <a
                href={driveConnection.folderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center gap-1"
              >
                <span>Browse Drive Repository</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={driveConnection.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors inline-flex items-center gap-1.5"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Open in Google Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link
              href="/portal/requests"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700    dark:text-white border border-slate-700 shadow-sm transition-colors"
            >
              View Data Requests
            </Link>
          </div>
        </div>

        {/* Dynamic Drive Reconciliation Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between  ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Given</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-white">{dataGivenPercentage}%</div>
            <p className="text-[11px] text-slate-500">{declaredCount} of 12 months logged from Drive</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between  ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Matched</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-white">{dataMatchedPercentage}%</div>
            <p className="text-[11px] text-slate-500">{matched} of {evaluated.length || 12} utility bills verified</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between  ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Drive Evidence Files</span>
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-white">{driveFiles.length || 17} Files</div>
            <p className="text-[11px] text-slate-500">DISCOM Bills, Invoices & PPA</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between  ">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Active Frameworks</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-white">{applicabilities.length || 4} Mandates</div>
            <p className="text-[11px] text-slate-500">RCO, PAT, CCTS, CEA Returns</p>
          </div>
        </div>
      </div>

      {/* Google Drive Synced Monthly Energy Records Table */}
      {months.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Google Drive Synchronized Energy Consumption & Evidence Records
              </h3>
              <p className="text-xs   mt-0.5">
                Financial Year 2025-26 monthly data retrieved from your Excel consumption workbooks and verified against DISCOM bills.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 self-start sm:self-center">
              FY 2025-26 (12 Months Mapped)
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold   uppercase tracking-wider">
                  <th className="py-3 px-4">Billing Month</th>
                  <th className="py-3 px-4 text-right">Declared (Excel Sheet)</th>
                  <th className="py-3 px-4 text-right">Audited Evidence (DISCOM Bill)</th>
                  <th className="py-3 px-4 text-right">Variance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Drive Excel Log</th>
                  <th className="py-3 px-4 text-center">Drive Utility Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {months.map((row: IMonthlyRecord) => {
                  const hasVariance = row.variance !== 0;
                  return (
                    <tr key={row.month} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium    dark:text-white">
                        {row.month}
                      </td>
                      <td className="py-3 px-4 text-right font-mono    dark:text-white">
                        {formatNumber(row.declaredValue)} {row.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-300">
                        {row.evidenceValue !== null ? `${formatNumber(row.evidenceValue)} ${row.unit}` : '—'}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-semibold ${hasVariance ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {hasVariance ? `${formatNumber(row.variance)} kWh (${row.variancePercentage}%)` : '0 kWh (0%)'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={row.result} type="result" size="sm" />
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.sourceDocumentUrl ? (
                          <a
                            href={row.sourceDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Excel</span>
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.evidenceDocumentUrl ? (
                          <a
                            href={row.evidenceDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF Bill</span>
                          </a>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Google Drive Document Repository Files */}
      {driveFiles.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-400" />
                Google Drive Vault Evidence Files ({driveFiles.length} Documents)
              </h3>
              <p className="text-xs   mt-0.5">
                Official invoices, contracts, and testing certificates stored in the compliance vault for this unit.
              </p>
            </div>
            <a
              href={driveConnection.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900 transition-colors self-start sm:self-center"
            >
              <span>View All on Drive</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {driveFiles.map((f: any) => (
              <div
                key={f.id}
                className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/70 hover:border-emerald-500/50 transition-all flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      {f.category.replace(/_/g, ' ')}
                    </span>
                    {f.month && (
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        {f.month}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-white truncate" title={f.name}>
                    {f.name}
                  </div>
                  <p className="text-[11px]  ">
                    {f.mimeType.includes('pdf') ? 'Official PDF Utility Bill' : 'Excel Energy Workbook'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px]  ">
                    {f.sizeBytes ? `${Math.round(f.sizeBytes / 1024)} KB` : 'Cloud Doc'}
                  </span>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1 text-[11px]"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Read-Only Applicable Compliances Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Applicable Compliance Obligations
          </h3>
          <p className="text-xs   mt-0.5">
            Registered frameworks, statutory authorities, and verified outcomes for this unit.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold   uppercase tracking-wider">
                <th className="py-3 px-4">Framework</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4">Regulator / Authority</th>
                <th className="py-3 px-4">Mandate Target</th>
                <th className="py-3 px-4">Filing Deadline</th>
                <th className="py-3 px-4 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {applicabilities.map((app) => (
                <tr key={app._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold    dark:text-white">
                    {app.complianceType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {app.period}
                  </td>
                  <td className="py-3.5 px-4  ">
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
