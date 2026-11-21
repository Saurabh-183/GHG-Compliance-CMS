
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IAssessment } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Folder,
  ChevronRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { FacilityDataChecklistPanel } from '@/components/checklist/FacilityDataChecklistPanel';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { RegulatoryMetricsPanel } from '@/components/regulatory/RegulatoryMetricsPanel';

export default function AssessmentDetailPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<IAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [checklistOpen, setChecklistOpen] = useState(false);

  const checklistAnchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAssessment() {
      setLoading(true);
      setLoadError(null);
      setAssessment(null);

      try {
        const res = await fetch(
          `/api/assessments/${encodeURIComponent(assessmentId)}`,
          { cache: 'no-store' }
        );

        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            json.error || `Unable to load assessment (HTTP ${res.status}).`
          );
        }

        if (!json.data) {
          throw new Error('The assessment API returned an empty response.');
        }

        if (!cancelled) {
          setAssessment(json.data as IAssessment);
        }
      } catch (error) {
        console.error('Error fetching assessment:', error);
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Unable to load assessment.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (assessmentId) {
      loadAssessment();
    } else {
      setLoading(false);
      setLoadError('Assessment ID is missing from the URL.');
    }

    return () => {
      cancelled = true;
    };
  }, [assessmentId, retryCount]);

  if (loading) {
    return (
      <CarbonCrunchLoader message="Loading compliance assessment details..." />
    );
  }

  if (!assessment) {
    const isNotFound = loadError?.toLowerCase().includes('not found');

    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {isNotFound ? 'Assessment Not Found' : 'Unable to Load Assessment'}
        </h2>

        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {loadError || 'No assessment data was returned.'}
        </p>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="rounded-md bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
          >
            Try Again
          </button>

          <Link
            href="/facilities/TRIDENT_PAPER"
            className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs"
          >
            Return to Facility Matrix
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs">
        <Link
          href={`/facilities/${assessment.facilityId || 'TRIDENT_PAPER'}`}
          className="hover:text-emerald-400"
        >
          {assessment.facilityName || assessment.facilityId || 'Facility'}
        </Link>

        <ChevronRight className="w-3 h-3" />

        <span className="text-slate-900 dark:text-white font-semibold">
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

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
                {assessment.complianceType} Assessment ({assessment.period})
              </h1>

              {assessment.isHistorical && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                  Approved Historical Baseline
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                status={assessment.workflowStatus}
                type="workflow"
              />

              <StatusBadge
                status={assessment.complianceOutcome}
                type="outcome"
              />

              <span className="text-xs font-mono">
                Version: v{assessment.version}
              </span>
            </div>

            {assessment.approvedByName && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5 pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />

                <span>
                  Approved by <strong>{assessment.approvedByName}</strong> on{' '}
                  {formatDate(assessment.approvedAt)}
                </span>
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const opening = !checklistOpen;
                setChecklistOpen(opening);

                if (opening) {
                  requestAnimationFrame(() => {
                    checklistAnchorRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  });
                }
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold border transition-colors ${checklistOpen
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-emerald-600 bg-white text-emerald-800 hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300 dark:hover:bg-slate-700'
                }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />

              <span>
                {checklistOpen ? 'Hide Data Checklist' : 'Data Checklist'}
              </span>
            </button>

            <Link
              href={`/assessments/${assessment._id}/data`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-md hover:bg-slate-100 text-slate-700 dark:text-white text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />

              <span>Client Submissions Table</span>
            </Link>

            <Link
              href={`/assessments/${assessment._id}/comparison`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors"
            >
              <TrendingUp className="w-3.5 h-3.5" />

              <span>YoY Comparison &amp; Trajectory</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Facility Data Checklist */}
      {checklistOpen && assessment.facilityId && (
        <div ref={checklistAnchorRef} className="scroll-mt-24">
          <FacilityDataChecklistPanel
            facilityId={assessment.facilityId}
            facilityName={assessment.facilityName}
            period={assessment.period || DEFAULT_CHECKLIST_PERIOD}
            mode="internal"
          />
        </div>
      )}

      {/* Structured Summary Metrics Table */}
      <div className="rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Structured Regulatory Compliance Metrics
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Approved and verified parameters, accounting basis, and
              calculation outcomes.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Parameter</th>
                <th className="py-3 px-4">Reported Value</th>
                <th className="py-3 px-4">Source / Accounting Basis</th>
                <th className="py-3 px-4 text-center">Data Status</th>
                <th className="py-3 px-4 text-center">Version</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/70 text-xs">
              {(assessment.metrics || []).map((metric, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                    {metric.name}
                  </td>

                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {metric.value}{' '}
                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                      {metric.unit}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {metric.source}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {metric.isProvisional ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        Provisional
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-blue-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
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

      {/* Framework-specific regulatory data collection and approval */}
      {(['RCO', 'PAT', 'CCTS'] as string[]).includes(assessment.complianceType) && (
        <RegulatoryMetricsPanel
          assessmentId={assessment._id}
          framework={assessment.complianceType as 'RCO' | 'PAT' | 'CCTS'}
          period={assessment.period}
          facilityId={assessment.facilityId}
        />
      )}

      {/* Linked Primary Google Drive Evidence & Reports */}
      <div className="rounded-md border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Verified Source Documents (Google Drive)
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Primary calculation workbooks, official regulator submission
            acknowledgements, and final published reports.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Final Assessment Report
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Signed executive compliance report PDF
              </div>
            </div>

            <DriveLinkBadge
              url={assessment.documentLinks?.finalReportUrl}
              label="Final Report"
            />
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Regulatory Submission Acknowledgement
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Official PSERC/BEE portal acknowledgment receipt
              </div>
            </div>

            <DriveLinkBadge
              url={assessment.documentLinks?.submissionAckUrl}
              label="Submission Ack"
            />
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Calculation Workbook Model
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Versioned audit-ready Excel formula model
              </div>
            </div>

            <DriveLinkBadge
              url={assessment.documentLinks?.calculationWorkbookUrl}
              label="Model Excel"
            />
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-white">
                Supporting Evidence Folder
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                All underlying utility bills &amp; wheeling vouchers
              </div>
            </div>

            <DriveLinkBadge
              url={assessment.documentLinks?.evidenceFolderUrl}
              label="Evidence Drive"
              isFolder
            />
          </div>
        </div>
      </div>
    </div>
  );
}
