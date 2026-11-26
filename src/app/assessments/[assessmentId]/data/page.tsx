'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { COMPLIANCE_PERIODS } from '@/lib/complianceMatrixData';
import { buildAssessmentId } from '@/lib/assessmentIds';
import type { IDataRequirement, IAssessment } from '@/types';
import { DataRequestStatsBar } from '@/components/requests/DataRequestStatsBar';
import { ChecklistDrivenRequestWizard } from '@/components/requests/ChecklistDrivenRequestWizard';
import { RequirementsReviewTable } from '@/components/requests/RequirementsReviewTable';
import { matchesQuickFilter } from '@/lib/dataRequestDisplay';
import { computeRequestStats } from '@/lib/requestStats';
import { ChevronRight, ExternalLink, FileSpreadsheet, Plus, RefreshCw, ChevronDown } from 'lucide-react';
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

export default function AssessmentDataPage() {
  const { theme, currentRole, currentUser } = useAuth();
  const isDark = theme === 'dark';
  const isAdmin = currentRole === 'ADMIN' || currentUser?.role === 'ADMIN';
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<IAssessment | null>(null);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [frameworkOnly, setFrameworkOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    if (!assessmentId) return;

    setLoading(true);
    setError('');

    try {
      const assessmentResponse = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const assessmentPayload = await assessmentResponse.json().catch(() => null);
      if (!assessmentResponse.ok || !assessmentPayload?.data) {
        throw new Error(assessmentPayload?.error || 'Unable to load assessment details.');
      }

      const currentAssessment = assessmentPayload.data as IAssessment;
      setAssessment(currentAssessment);

      const query = new URLSearchParams({
        facilityId: currentAssessment.facilityId,
        period: currentAssessment.period,
      });

      const requirementsResponse = await fetch(`/api/requirements?${query.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });

      const requirementsPayload = await requirementsResponse.json().catch(() => null);
      if (!requirementsResponse.ok) {
        throw new Error(requirementsPayload?.error || 'Unable to load data requests.');
      }

      setRequirements(Array.isArray(requirementsPayload?.data) ? requirementsPayload.data : []);
    } catch (loadError) {
      console.error('Error loading assessment data requests:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load data requests.');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const periodScopedRequirements = useMemo(() => {
    return requirements.filter((req) => {
      if (frameworkOnly && assessment) {
        if (!req.linkedCompliances?.includes(assessment.complianceType)) return false;
      }
      return true;
    });
  }, [requirements, frameworkOnly, assessment]);

  const stats = useMemo(
    () => computeRequestStats(periodScopedRequirements),
    [periodScopedRequirements]
  );

  const visibleRequirements = useMemo(() => {
    return periodScopedRequirements.filter((req) => {
      if (quickFilter !== 'all' && !matchesQuickFilter(req, quickFilter)) return false;
      return true;
    });
  }, [periodScopedRequirements, quickFilter]);

  const orgLabel = requirements[0]?.clientGroupName;

  if (loading) {
    return (
      <div className="mx-auto max-w-8xl px-4 py-16 text-center text-xs text-slate-500">
        Loading data requests for this assessment…
      </div>
    );
  }

  if (!assessment && error) {
    return (
      <div className="mx-auto max-w-8xl px-4 py-16">
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-8xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link
          href={`/facilities/${encodeURIComponent(assessment?.facilityId || '')}`}
          className="hover:text-emerald-600"
        >
          {assessment?.facilityName || assessment?.facilityId}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/assessments/${encodeURIComponent(assessmentId)}`}>Assessment</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-semibold text-slate-900 dark:text-white">Data requests</span>
      </nav>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Data requests · {assessment?.period || '—'}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {orgLabel ? `${orgLabel} · ` : ''}
              {assessment?.facilityName || assessment?.facilityId} · Assessment framework{' '}
              <span className="font-mono font-bold">{assessment?.complianceType}</span>
            </p>
            {assessment && (
              <div className="mt-3 inline-flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Data collection year</span>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <Select
                    value={assessment.period}
                    onChange={(e: SelectChangeEvent) => {
                      const nextPeriod = e.target.value;
                      const nextId = buildAssessmentId(
                        assessment.facilityId,
                        assessment.complianceType,
                        nextPeriod
                      );
                      if (nextId !== assessmentId) {
                        router.push(`/assessments/${encodeURIComponent(nextId)}/data`);
                      }
                    }}
                    IconComponent={() => (
                      <ChevronDown
                        className="w-4 h-4 pointer-events-none"
                        style={{ color: isDark ? '#94A3B8' : '#64748B', marginRight: 8 }}
                      />
                    )}
                    sx={{
                      height: 34,
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      borderRadius: '8px',
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
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
                        py: '5px',
                        px: '10px',
                      },
                    }}
                    MenuProps={{
                      slotProps: {
                        paper: {
                          sx: {
                            mt: 0.5,
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
                    {COMPLIANCE_PERIODS.map((fy) => (
                      <MenuItem
                        key={fy}
                        value={fy}
                        sx={{
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          fontWeight: assessment.period === fy ? 600 : 400,
                          py: 0.75,
                          px: 1.5,
                          borderRadius: '6px',
                          mx: 0.5,
                          my: 0.25,
                          '&.Mui-selected': {
                            backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                            color: isDark ? '#34D399' : '#059669',
                          },
                        }}
                      >
                        {fy}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <span className="text-[10px] text-slate-400">
                  Switches assessment year, stats, and client request list together.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
            {!isAdmin && (
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
              >
                <Plus className="h-3.5 w-3.5" />
                {showCreate ? 'Hide create form' : 'Create data request'}
              </button>
            )}
            <Link
              href="/data-review"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
            >
              Data review <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="mt-5">
          <DataRequestStatsBar
            stats={stats}
            totalFallback={periodScopedRequirements.length}
            activeQuickFilter={quickFilter}
            onQuickFilter={setQuickFilter}
          />
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={frameworkOnly}
            onChange={(e) => setFrameworkOnly(e.target.checked)}
            className="accent-emerald-700"
          />
          Show only requests linked to {assessment?.complianceType}
        </label>
      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {showCreate && !isAdmin && assessment && (
        <ChecklistDrivenRequestWizard
          key={`${assessment.facilityId}-${assessment.period}`}
          facilityId={assessment.facilityId}
          facilityName={assessment.facilityName}
          period={assessment.period}
          initialFrameworks={assessment.complianceType ? [assessment.complianceType] : undefined}
          onPeriodChange={(nextPeriod) => {
            const nextId = buildAssessmentId(
              assessment.facilityId,
              assessment.complianceType,
              nextPeriod
            );
            if (nextId !== assessmentId) {
              router.push(`/assessments/${encodeURIComponent(nextId)}/data`);
            }
          }}
          onSent={() => void loadData()}
        />
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Client data review
          <span className="ml-2 text-xs font-normal text-slate-500">
            ({visibleRequirements.length} requests · {assessment?.facilityId} · {assessment?.period})
          </span>
        </h2>
        <p className="text-[11px] text-slate-500">
          Same layout as the Data Review workspace — scoped to this facility and data collection year.
        </p>

        <RequirementsReviewTable
          requirements={visibleRequirements}
          hideFacilityColumn
          showWorkflowFilter
          emptyMessage={
            requirements.length === 0
              ? (isAdmin
                  ? 'No requests for this facility and period.'
                  : 'No requests for this facility and period. Create one above or publish the facility checklist.')
              : 'No requests match the current filter.'
          }
          onReviewed={() => void loadData()}
        />
      </section>
    </div>
  );
}