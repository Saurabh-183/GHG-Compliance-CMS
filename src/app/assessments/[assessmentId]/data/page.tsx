'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { COMPLIANCE_PERIODS } from '@/lib/complianceMatrixData';
import { buildAssessmentId, parseAssessmentId } from '@/lib/assessmentIds';
import { normalizeFinancialYearPeriod } from '@/lib/financialYears';
import type { IDataRequirement, IAssessment, ComplianceType } from '@/types';
import { DataRequestStatsBar } from '@/components/requests/DataRequestStatsBar';
import { FacilityDataRequestPanel } from '@/components/requests/FacilityDataRequestPanel';
import { RequirementsReviewTable } from '@/components/requests/RequirementsReviewTable';
import { matchesQuickFilter } from '@/lib/dataRequestDisplay';
import { computeRequestStats } from '@/lib/requestStats';
import { ChevronRight, ExternalLink, FileSpreadsheet, Plus, RefreshCw, ChevronDown, Filter } from 'lucide-react';
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';
import { useAuth } from '@/context/AuthContext';

type FrameworkOption = {
  type: ComplianceType;
  label: string;
  name: string;
};

const STATUTORY_FRAMEWORKS: FrameworkOption[] = [
  { type: 'RCO', label: 'RCO', name: 'Renewable Consumption Obligation' },
  { type: 'RPO', label: 'RPO', name: 'Renewable Purchase Obligation' },
  { type: 'PAT', label: 'PAT Scheme', name: 'Perform, Achieve & Trade' },
  { type: 'CCTS', label: 'CCTS Carbon', name: 'Carbon Credit Trading Scheme' },
];

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
  const [frameworkOverride, setFrameworkOverride] = useState<{
    assessmentId: string;
    framework: string;
  } | null>(null);
  const [applicabilityRecords, setApplicabilityRecords] = useState<
    Array<{
      facilityId: string;
      complianceType: ComplianceType;
      period: string;
      isApplicable: boolean;
    }>
  >([]);
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

      let currentAssessment: IAssessment | null = null;
      if (assessmentResponse.ok && assessmentPayload?.data) {
        currentAssessment = assessmentPayload.data as IAssessment;
      } else {
        const parsed = parseAssessmentId(assessmentId);
        if (parsed) {
          let facilityName = parsed.facilityId;
          let clientGroupName: string | undefined;
          try {
            const facRes = await fetch(`/api/facilities/${encodeURIComponent(parsed.facilityId)}`, {
              cache: 'no-store',
              credentials: 'include',
            });
            const facJson = await facRes.json().catch(() => null);
            if (facJson?.data?.name) facilityName = facJson.data.name;
            if (facJson?.data?.clientGroupName) clientGroupName = facJson.data.clientGroupName;
          } catch {
            // fallback
          }

          currentAssessment = {
            _id: assessmentId,
            facilityId: parsed.facilityId,
            complianceType: parsed.complianceType,
            period: parsed.period,
            facilityName,
            clientGroupName,
            workflowStatus: 'NOT_STARTED',
            complianceOutcome: 'PENDING_DETERMINATION',
            isHistorical: false,
            metrics: [],
            documentLinks: {},
            version: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as unknown as IAssessment;
        } else {
          throw new Error(assessmentPayload?.error || 'Unable to load assessment details.');
        }
      }

      setAssessment(currentAssessment);

      const query = new URLSearchParams({
        facilityId: currentAssessment.facilityId,
        period: currentAssessment.period,
      });

      const [requirementsResponse, applicabilityResponse] = await Promise.all([
        fetch(`/api/requirements?${query.toString()}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch(`/api/compliance-applicability?facilityId=${encodeURIComponent(currentAssessment.facilityId)}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
      ]);

      const requirementsPayload = await requirementsResponse.json().catch(() => null);
      if (!requirementsResponse.ok) {
        throw new Error(requirementsPayload?.error || 'Unable to load data requests.');
      }

      setRequirements(Array.isArray(requirementsPayload?.data) ? requirementsPayload.data : []);

      const applicabilityPayload = await applicabilityResponse.json().catch(() => null);
      if (applicabilityResponse.ok && Array.isArray(applicabilityPayload?.data)) {
        setApplicabilityRecords(applicabilityPayload.data);
      }
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

  const applicableFrameworks = useMemo<ComplianceType[]>(() => {
    if (!assessment) return [];

    const normPeriod = normalizeFinancialYearPeriod(assessment.period) || assessment.period?.toUpperCase();

    // 1. Check explicit records configured in compliance-applicability
    const matchedRecords = applicabilityRecords.filter((rec) => {
      const recNorm = normalizeFinancialYearPeriod(rec.period) || rec.period?.toUpperCase();
      return (
        rec.facilityId?.toUpperCase() === assessment.facilityId?.toUpperCase() &&
        recNorm === normPeriod
      );
    });

    if (matchedRecords.length > 0) {
      const activeFromRecords = matchedRecords
        .filter((rec) => rec.isApplicable)
        .map((rec) => rec.complianceType);

      if (!activeFromRecords.includes(assessment.complianceType)) {
        activeFromRecords.push(assessment.complianceType);
      }
      return activeFromRecords;
    }

    // 2. Fallback: frameworks appearing in current requirements or matching current assessment
    const activeFromReqs = requirements
      .flatMap((r) => (Array.isArray(r.linkedCompliances) ? r.linkedCompliances : []))
      .filter(Boolean) as ComplianceType[];

    const combined = Array.from(
      new Set([
        ...(assessment.complianceType ? [assessment.complianceType] : []),
        ...activeFromReqs,
      ])
    );

    if (combined.length > 0) {
      return combined;
    }

    return ['RCO', 'RPO', 'PAT', 'CCTS'];
  }, [applicabilityRecords, assessment, requirements]);

  const requestedFramework = frameworkOverride?.assessmentId === assessmentId
    ? frameworkOverride.framework
    : undefined;
  const selectedFramework = requestedFramework === 'ALL' || applicableFrameworks.some((framework) => framework === requestedFramework)
    ? requestedFramework
    : assessment?.complianceType;

  const periodScopedRequirements = useMemo(() => {
    if (selectedFramework === 'ALL') return requirements;

    return requirements.filter((req) =>
      req.linkedCompliances?.some((framework) => framework === selectedFramework)
    );
  }, [requirements, selectedFramework]);

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

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select
                  value={selectedFramework ?? ''}
                  onChange={(e: SelectChangeEvent) =>
                    setFrameworkOverride({ assessmentId, framework: e.target.value })
                  }
                  inputProps={{ 'aria-label': 'Request framework' }}
                  displayEmpty
                  renderValue={(value) => {
                    if (value === 'ALL') return 'All Frameworks';
                    const fw = STATUTORY_FRAMEWORKS.find((f) => f.type === value);
                    return fw ? fw.label : value;
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
                      display: 'flex',
                      alignItems: 'center',
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
                  <MenuItem
                    value="ALL"
                    sx={{
                      fontSize: '12px',
                      fontWeight: selectedFramework === 'ALL' ? 600 : 400,
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
                    All Frameworks
                  </MenuItem>
                  {STATUTORY_FRAMEWORKS.filter((fw) => applicableFrameworks.includes(fw.type)).map((fw) => {
                    return (
                      <MenuItem
                        key={fw.type}
                        value={fw.type}
                        sx={{
                          fontSize: '12px',
                          fontWeight: selectedFramework === fw.type ? 600 : 400,
                          py: 0.75,
                          px: 1.5,
                          borderRadius: '6px',
                          mx: 0.5,
                          my: 0.25,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          '&.Mui-selected': {
                            backgroundColor: isDark ? 'rgba(52, 211, 153, 0.15)' : 'rgba(16, 185, 129, 0.1)',
                            color: isDark ? '#34D399' : '#059669',
                          },
                        }}
                      >
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span>{fw.label}</span>
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </div>

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

      </section>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      {showCreate && !isAdmin && assessment && (
        <FacilityDataRequestPanel
          key={`${assessment.facilityId}-${assessment.period}`}
          facilityId={assessment.facilityId}
          facilityName={assessment.facilityName}
          period={assessment.period}
          initialCompliances={assessment.complianceType ? [assessment.complianceType] : undefined}
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
          {selectedFramework === 'ALL'
            ? 'Showing requests across all frameworks for this facility and data collection year.'
            : `Showing requests linked to ${selectedFramework} for this facility and data collection year.`}
        </p>

        <RequirementsReviewTable
          requirements={visibleRequirements}
          hideFacilityColumn
          showWorkflowFilter
          emptyMessage={
            periodScopedRequirements.length === 0 && selectedFramework && selectedFramework !== 'ALL'
              ? `No requests linked to ${selectedFramework} for this facility and period.`
              : requirements.length === 0
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
