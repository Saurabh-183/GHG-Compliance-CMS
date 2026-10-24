'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IAssessment } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  FileText,
  Folder,
  History,
  ChevronRight,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function AssessmentDetailPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;
  const [assessment, setAssessment] = useState<IAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssessment() {
      try {
        const res = await fetch(`/api/assessments/${assessmentId}`);
        if (res.ok) {
          const json = (await res.json()) as { data: IAssessment };
          setAssessment(json.data);
        }
      } catch (e) {
        console.error('Error fetching assessment:', e);
      } finally {
        setLoading(false);
      }
    }
    if (assessmentId) loadAssessment();
  }, [assessmentId]);

  if (loading) {
    return <CarbonCrunchLoader message="Loading compliance assessment details..." />;
  }

  if (!assessment) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">
        <h2 className="text-lg font-bold text-white">Assessment Not Found</h2>
        <Link href="/facilities/TRIDENT_PAPER" className="mt-4 inline-block text-emerald-400 hover:underline text-xs">
          Return to Facility Matrix
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/facilities/TRIDENT_PAPER" className="hover:text-emerald-400">Trident Paper</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-semibold">
          {assessment.complianceType} — {assessment.period}
        </span>
      </div>

      {/* Header Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-emerald-400 border border-slate-700">
                {assessment.facilityId}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {assessment.complianceType} Assessment ({assessment.period})
              </h1>
              {assessment.isHistorical && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Approved Historical Baseline
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={assessment.workflowStatus} type="workflow" />
              <StatusBadge status={assessment.complianceOutcome} type="outcome" />
              <span className="text-xs text-slate-400 font-mono">Version: v{assessment.version}</span>
            </div>

            {assessment.approvedByName && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Approved by <strong>{assessment.approvedByName}</strong> on {formatDate(assessment.approvedAt)}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/assessments/${assessment._id}/data`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Data Checklist</span>
            </Link>

            <Link
              href={`/assessments/${assessment._id}/comparison`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>YoY Comparison & Trajectory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Structured Summary Metrics Table (PRD Section 5.3) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Structured Regulatory Compliance Metrics
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Approved and verified parameters, accounting basis, and calculation outcomes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Parameter</th>
                <th className="py-3 px-4">Reported Value</th>
                <th className="py-3 px-4">Source / Accounting Basis</th>
                <th className="py-3 px-4 text-center">Data Status</th>
                <th className="py-3 px-4 text-center">Version</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {assessment.metrics.map((metric, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-slate-200">
                    {metric.name}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                    {metric.value} <span className="text-xs font-normal text-slate-400">{metric.unit}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {metric.source}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {metric.isProvisional ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        Provisional
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                        Approved Final
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono text-slate-500">
                    v{metric.version}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linked Primary Google Drive Evidence & Reports (PRD Section 5.3) */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-emerald-400" />
            Verified Source Documents (Google Drive)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Primary calculation workbooks, official regulator submission acknowledgements, and final published reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Final Assessment Report</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Signed executive compliance report PDF</div>
            </div>
            <DriveLinkBadge url={assessment.documentLinks.finalReportUrl} label="Final Report" />
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Regulatory Submission Acknowledgement</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Official PSERC/BEE portal acknowledgment receipt</div>
            </div>
            <DriveLinkBadge url={assessment.documentLinks.submissionAckUrl} label="Submission Ack" />
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Calculation Workbook Model</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Versioned audit-ready Excel formula model</div>
            </div>
            <DriveLinkBadge url={assessment.documentLinks.calculationWorkbookUrl} label="Model Excel" />
          </div>

          <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-200">Supporting Evidence Folder</div>
              <div className="text-[11px] text-slate-400 mt-0.5">All underlying utility bills & wheeling vouchers</div>
            </div>
            <DriveLinkBadge url={assessment.documentLinks.evidenceFolderUrl} label="Evidence Drive" isFolder />
          </div>
        </div>
      </div>
    </div>
  );
}
