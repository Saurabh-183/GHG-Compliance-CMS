'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { ExcelImportModal } from '@/components/compliance/ExcelImportModal';
import { DriveConnectionModal } from '@/components/common/DriveConnectionModal';
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
  Download,
  TrendingUp,
  CheckCheck,
  Upload,
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
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);

  useEffect(() => {
    async function loadPortal() {
      try {
        const [res, filesRes] = await Promise.all([
          fetch('/api/portal/dashboard').catch(() => null),
          fetch('/api/drive/files').catch(() => null),
        ]);

        if (res && res.ok) {
          const json = (await res.json()) as { data: typeof data };
          setData(json.data);
        }
        if (filesRes && filesRes.ok) {
          const fJson = await filesRes.json();
          if (fJson.data?.files) {
            setDriveFiles(fJson.data.files);
          }
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

  // Strict RBAC: Consultants cannot enter the external Client Portal
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
            <span>Return to Internal Workspace</span>
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
  const primaryFacilityId = facilities[0]?.facilityId || 'TRIDENT_PAPER';
  const clientOrgName =
    currentUser?.clientGroupId ||
    facilities[0]?.clientGroupName ||
    'Client Organization';

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
              {clientOrgName === 'TRIDENT' ? 'Trident Group' : clientOrgName} — Compliance Portal
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Welcome, <strong className="text-emerald-400">{currentUser?.name || 'Vikram Singh'}</strong> ({currentUser?.designation || 'Head of Regulatory Affairs'}).
              Direct visibility into authorized facilities, outstanding data submissions, Google Drive repository evidence, and verified historical reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Compliance Excel Templates</span>
            </button>

            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs shadow-sm transition-colors"
            >
              <Folder className="w-3.5 h-3.5 text-emerald-400" />
              <span>Drive Evidence Vault</span>
            </button>
          </div>
        </div>

        {/* PRD Highlights: Data Given % & Data Matched % */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Given</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-white">100%</div>
            <p className="text-[11px] text-slate-500">12/12 months submitted by your units</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Data Matched</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-extrabold text-white">75.0%</div>
            <p className="text-[11px] text-slate-500">3 of 4 audited months verified</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Operating Facilities</span>
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-white">{facilities.length} Units</div>
            <p className="text-[11px] text-slate-500">Paper, Yarn, Home Textiles</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Action Items</span>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold text-rose-400">{openClarifications.length} Query</div>
            <p className="text-[11px] text-slate-500">June 2025 PSPCL Bill Clarification</p>
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
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                    {facility.facilityId}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{facility.location}</span>
                </div>
                <h3 className="text-base font-bold text-white">{facility.name}</h3>
                <p className="text-xs text-slate-400">{facility.category}</p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Obligations: <strong>RCO, PAT, CCTS, CEA</strong>
                </span>
                <Link
                  href={`/portal/facilities/${facility.facilityId}`}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                >
                  <span>View Overview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Outstanding Data Requests Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Outstanding Compliance Data Requests
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Submit monthly energy logs, utility bills, and fuel lab test reports by attaching Google Drive URLs.
            </p>
          </div>
          <Link
            href="/portal/requests"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>View All ({pendingRequests.length})</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Requirement</th>
                <th className="py-3 px-4">Compliances</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Submission Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {pendingRequests.map((req) => (
                <tr key={req._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-white">{req.facilityId}</td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{req.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{req.description}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      {req.linkedCompliances.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{formatDate(req.dueDate)}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={req.submissionStatus} type="submission" size="sm" />
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href="/portal/requests"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-[11px] transition-colors"
                    >
                      <Folder className="w-3 h-3" />
                      <span>Attach Drive URL</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approved Historical Assessments & Reports */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Released & Approved Compliance Filings
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Official filings and submission acknowledgements certified by Carbon Crunch auditor.
            </p>
          </div>
          <Link
            href="/portal/history"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
          >
            <span>View All History</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Compliance Type</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-center">Obligation Outcome</th>
                <th className="py-3 px-4">Final Report</th>
                <th className="py-3 px-4">Regulatory Acknowledgement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {history.map((h) => (
                <tr key={h._id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-white">{h.facilityId}</td>
                  <td className="py-3 px-4 font-semibold text-white">{h.complianceType}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{h.period}</td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={h.complianceOutcome} type="outcome" size="sm" />
                  </td>
                  <td className="py-3 px-4">
                    <DriveLinkBadge url={h.documentLinks?.finalReportUrl} label="Executive Report" />
                  </td>
                  <td className="py-3 px-4">
                    <DriveLinkBadge url={h.documentLinks?.submissionAckUrl} label="Regulator Ack" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Drive Evidence Vault Repository Files */}
      {driveFiles.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-5 h-5 text-emerald-400" />
                Google Drive Corporate Compliance Vault ({driveFiles.length} Documents)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Official invoices, energy sheets, and certificates residing directly in the Google Drive compliance repository.
              </p>
            </div>
            <a
              href="https://drive.google.com/drive/folders/1oIObLXY-cBpYGO6CIOnk_Ax4R4Y8SSE7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900 transition-colors self-start sm:self-center"
            >
              <span>Browse Google Drive Folder</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
            {driveFiles.slice(0, 9).map((f: any) => (
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
                  <p className="text-[11px] text-slate-400">
                    {f.mimeType.includes('pdf') ? 'Audited PDF Bill / Certificate' : 'Client Consumption Excel Sheet'}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    {f.sizeBytes ? `${Math.round(f.sizeBytes / 1024)} KB` : 'Drive Asset'}
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
