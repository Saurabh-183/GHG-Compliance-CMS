'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { IDataRequirement, IAssessment } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { DataRequestStatsBar, type RequestStats } from '@/components/requests/DataRequestStatsBar';
import { FacilityDataRequestPanel } from '@/components/requests/FacilityDataRequestPanel';
import { resolveDataCategoryLabel, matchesQuickFilter } from '@/lib/dataRequestDisplay';
import { ChevronRight, ExternalLink, FileSpreadsheet, Plus, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

function getDatasetId(value: unknown): string | null {
  if (typeof value === 'string') {
    const id = value.trim();
    return id.length > 0 ? id : null;
  }
  if (!value || typeof value !== 'object') return null;
  const dataset = value as { _id?: unknown; id?: unknown; $oid?: unknown };
  for (const candidate of [dataset._id, dataset.id, dataset.$oid]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
  }
  return null;
}

export default function AssessmentDataPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;

  const [assessment, setAssessment] = useState<IAssessment | null>(null);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [stats, setStats] = useState<RequestStats | null>(null);
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

      const [requirementsResponse, statsResponse] = await Promise.all([
        fetch(`/api/requirements?${query.toString()}`, { cache: 'no-store', credentials: 'include' }),
        fetch(`/api/requirements/stats?facilityId=${encodeURIComponent(currentAssessment.facilityId)}`, {
          cache: 'no-store',
          credentials: 'include',
        }),
      ]);

      const requirementsPayload = await requirementsResponse.json().catch(() => null);
      if (!requirementsResponse.ok) {
        throw new Error(requirementsPayload?.error || 'Unable to load data requests.');
      }

      setRequirements(Array.isArray(requirementsPayload?.data) ? requirementsPayload.data : []);

      const statsPayload = await statsResponse.json().catch(() => null);
      if (statsResponse.ok) setStats(statsPayload.data);
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

  const visibleRequirements = useMemo(() => {
    return requirements.filter((req) => {
      if (frameworkOnly && assessment) {
        if (!req.linkedCompliances?.includes(assessment.complianceType)) return false;
      }
      if (quickFilter !== 'all' && !matchesQuickFilter(req, quickFilter)) return false;
      return true;
    });
  }, [requirements, frameworkOnly, assessment, quickFilter]);

  const orgLabel = requirements[0]?.clientGroupName;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-xs text-slate-500">
        Loading data requests for this assessment…
      </div>
    );
  }

  if (!assessment && error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
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
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Data requests · {assessment?.period}
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {orgLabel ? `${orgLabel} · ` : ''}
              {assessment?.facilityName || assessment?.facilityId} · Assessment framework{' '}
              <span className="font-mono font-bold">{assessment?.complianceType}</span>
            </p>
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
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
            >
              <Plus className="h-3.5 w-3.5" />
              {showCreate ? 'Hide create form' : 'Create data request'}
            </button>
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
            totalFallback={requirements.length}
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

      {showCreate && assessment && (
        <FacilityDataRequestPanel
          facilityId={assessment.facilityId}
          facilityName={assessment.facilityName}
          period={assessment.period}
        />
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Requirements and client submissions
          <span className="ml-2 text-xs font-normal text-slate-500">({visibleRequirements.length} shown)</span>
        </h2>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 dark:bg-slate-950">
              <tr>
                <th className="p-3">Request</th>
                <th className="p-3">Category / BRSR</th>
                <th className="p-3">Frameworks</th>
                <th className="p-3">Workflow</th>
                <th className="p-3">Client submission</th>
                <th className="p-3">Evidence</th>
                <th className="p-3">Due</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleRequirements.map((req) => {
                const datasetId = getDatasetId(req.datasetId);
                const workflow = req.workflowStatus || req.verificationStatus;
                const category = resolveDataCategoryLabel(req);

                return (
                  <tr key={req._id} className="align-top hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="min-w-52 p-3">
                      <div className="font-semibold text-slate-900 dark:text-white">{req.title}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-emerald-700">{req.requestId}</div>
                      <div className="mt-1 line-clamp-2 text-[11px] text-slate-500">{req.description}</div>
                      {req.requestedByName && (
                        <div className="mt-1 text-[10px] text-slate-400">Consultant: {req.requestedByName}</div>
                      )}
                    </td>

                    <td className="p-3 min-w-[120px]">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{category}</div>
                      {req.brsrSection && <div className="text-[10px] text-slate-500 mt-0.5">{req.brsrSection}</div>}
                      {req.brsrPrinciple && (
                        <span className="mt-1 inline-block rounded bg-violet-100 px-1 py-0.5 text-[9px] dark:bg-violet-950/50">
                          {req.brsrPrinciple}
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {req.linkedCompliances?.map((code) => (
                          <span
                            key={code}
                            className={`rounded px-1.5 py-1 font-mono text-[10px] ${
                              code === assessment?.complianceType
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50'
                                : 'bg-slate-100 dark:bg-slate-800'
                            }`}
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-3">
                      <StatusBadge status={workflow} type="verification" size="sm" />
                      {req.reviewNote && ['CHANGES_REQUESTED', 'REJECTED'].includes(String(workflow)) && (
                        <p className="mt-1 text-[10px] text-amber-800 dark:text-amber-200 line-clamp-2">{req.reviewNote}</p>
                      )}
                    </td>

                    <td className="p-3">
                      <StatusBadge status={req.submissionStatus} size="sm" />
                      {req.monthlyFrequency && req.reportingMonths?.length ? (
                        <p className="mt-1 text-[10px] text-slate-500">
                          Months: {req.reportingMonths.length} configured
                        </p>
                      ) : null}
                    </td>

                    <td className="min-w-48 p-3">
                      {req.submittedDriveLinks?.length ? (
                        req.submittedDriveLinks.map((link, index) => (
                          <div key={`${link.url}-${index}`} className="mb-2">
                            <DriveLinkBadge
                              url={link.vaultUrl || link.url}
                              label={link.description || link.fileName || 'Client evidence'}
                              billDetails={link.billDetails}
                              utilityConnectionSnapshot={link.utilityConnectionSnapshot}
                              facilityId={req.facilityId}
                            />
                            <div className="mt-1 text-[10px] text-slate-500">
                              {link.submittedBy}
                              {link.submittedAt ? ` · ${formatDate(link.submittedAt)}` : ''}
                              {link.mappedMonth ? ` · ${link.mappedMonth}` : ''}
                            </div>
                          </div>
                        ))
                      ) : (
                        <span className="italic text-slate-400">Awaiting client</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap p-3">{req.dueDate ? formatDate(req.dueDate) : '—'}</td>

                    <td className="p-3 space-y-1">
                      {datasetId ? (
                        <Link
                          href={`/datasets/${encodeURIComponent(datasetId)}/verify`}
                          className="inline-block whitespace-nowrap rounded bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white"
                        >
                          Review dataset
                        </Link>
                      ) : (
                        <Link
                          href="/data-review"
                          className="inline-block whitespace-nowrap rounded border border-slate-300 px-2 py-1 text-[10px] font-semibold hover:bg-slate-50"
                        >
                          Review submission
                        </Link>
                      )}
                      <Link
                        href={`/portal/requests/${req._id}`}
                        className="block text-[10px] text-emerald-700 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Client view
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {visibleRequirements.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500">
                    {requirements.length === 0
                      ? 'No requests for this facility and period. Create one above or publish the facility checklist.'
                      : 'No requests match the current filter.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}