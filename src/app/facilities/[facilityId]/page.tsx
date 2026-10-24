'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IFacilityComplianceMatrix, IComplianceApplicability } from '@/types';
import { ComplianceMatrixTable } from '@/components/compliance/ComplianceMatrixTable';
import { ExcelImportModal } from '@/components/compliance/ExcelImportModal';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  Building2,
  Calendar,
  FileSpreadsheet,
  Upload,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function FacilityDashboardPage() {
  const params = useParams();
  const facilityId = (params.facilityId as string) || 'TRIDENT_PAPER';
  const [matrixData, setMatrixData] = useState<IFacilityComplianceMatrix | null>(null);
  const [rawApplicability, setRawApplicability] = useState<IComplianceApplicability[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const loadMatrix = async () => {
    try {
      const res = await fetch(`/api/facilities/${facilityId}/compliance-matrix`);
      if (res.ok) {
        const json = (await res.json()) as {
          data: IFacilityComplianceMatrix & { rawApplicability: IComplianceApplicability[] };
        };
        setMatrixData(json.data);
        setRawApplicability(json.data.rawApplicability || []);
      }
    } catch (e) {
      console.error('Error fetching compliance matrix:', e);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/clients" className="hover:text-emerald-400">Clients</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <Link href="/clients/TRIDENT" className="hover:text-emerald-400">Trident Group</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-semibold">{facility.name}</span>
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
                Assigned Consultant: <strong className="text-slate-800 dark:text-slate-200">Priya Sharma</strong>
              </span>
              <span>·</span>
              <span>
                Reviewer: <strong className="text-slate-800 dark:text-slate-200">Dr. Rajesh Nair</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span>Import Excel Template</span>
            </button>

            <Link
              href="/datasets/6adb9175b32c50edab95461f/verify"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Open Reconciliation Engine</span>
            </Link>
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

      {/* Standardized Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => loadMatrix()}
      />
    </div>
  );
}
