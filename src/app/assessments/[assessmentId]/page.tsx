
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Select, MenuItem, FormControl } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { COMPLIANCE_PERIODS } from '@/lib/complianceMatrixData';
import { buildAssessmentId } from '@/lib/assessmentIds';
import { IAssessment } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { FacilityDataChecklistPanel } from '@/components/checklist/FacilityDataChecklistPanel';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { RegulatoryMetricsPanel } from '@/components/regulatory/RegulatoryMetricsPanel';

export default function AssessmentDetailPage() {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const params = useParams();
  const router = useRouter();
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
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 sm:p-7 shadow-sm">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-emerald-800 border border-slate-300 dark:bg-slate-800 dark:text-emerald-400 dark:border-slate-700">
              {assessment.facilityId}
            </span>

            {assessment.isHistorical && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                Approved Historical Baseline
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {assessment.complianceType} Assessment ({assessment.period})
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {assessment.facilityName || assessment.facilityId} · Statutory compliance evaluation & calculation model
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            <StatusBadge
              status={assessment.workflowStatus}
              type="workflow"
            />

            <StatusBadge
              status={assessment.complianceOutcome}
              type="outcome"
            />

            <span className="text-xs font-mono px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400">
              Version: v{assessment.version}
            </span>

            {assessment.approvedByName && (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  Approved by <strong>{assessment.approvedByName}</strong> on{' '}
                  {formatDate(assessment.approvedAt)}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FormControl size="small">
              <Select
                value={assessment.period}
                onChange={(e) => {
                  const nextId = buildAssessmentId(
                    assessment.facilityId,
                    assessment.complianceType,
                    e.target.value
                  );
                  if (nextId !== assessmentId) {
                    router.push(`/assessments/${encodeURIComponent(nextId)}`);
                  }
                }}
                displayEmpty
                renderValue={(val) => (
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-sans font-semibold text-slate-500 dark:text-slate-400">Period:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{val}</span>
                  </div>
                )}
                sx={{
                  height: 36,
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                  color: isDark ? '#FFFFFF' : '#1E293B',
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
                    display: 'flex',
                    alignItems: 'center',
                  },
                  '& .MuiSvgIcon-root': {
                    color: isDark ? '#94A3B8' : '#64748B',
                    fontSize: '18px',
                  },
                }}
                MenuProps={{
                  slotProps: {
                    paper: {
                      sx: {
                        backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                        color: isDark ? '#FFFFFF' : '#1E293B',
                        borderRadius: '8px',
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0'}`,
                        '& .MuiList-root': { py: '4px' },
                      },
                    },
                  },
                }}
              >
                {COMPLIANCE_PERIODS.map((fy) => (
                  <MenuItem
                    key={fy}
                    value={fy}
                    sx={{
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: assessment.period === fy ? 600 : 400,
                      color: assessment.period === fy ? (isDark ? '#34D399' : '#059669') : undefined,
                      '&.Mui-selected': {
                        backgroundColor: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(5, 150, 105, 0.08)',
                      },
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    {fy}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
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
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors shadow-2xs ${
                checklistOpen
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                  : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>
                {checklistOpen ? 'Hide Data Checklist' : 'Data Checklist'}
              </span>
            </button>

            <Link
              href={`/assessments/${assessment._id}/data`}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Client Submissions Table</span>
            </Link>

            <Link
              href={`/assessments/${assessment._id}/comparison`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-sm"
            >
              <TrendingUp className="w-3.5 h-3.5 text-white" />
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
    </div>
  );
}
