'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IAssessment, IDataRequirement } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { ChevronRight, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AssessmentDataPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;
  const [assessment, setAssessment] = useState<IAssessment | null>(null);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!assessmentId) return;
    setLoading(true);
    setError('');
    try {
      const assessmentResponse = await fetch(`/api/assessments/${assessmentId}`, { cache: 'no-store' });
      const assessmentPayload = await assessmentResponse.json().catch(() => null);
      if (!assessmentResponse.ok || !assessmentPayload?.data) {
        throw new Error(assessmentPayload?.error || 'Unable to load assessment details.');
      }

      const currentAssessment = assessmentPayload.data as IAssessment;
      setAssessment(currentAssessment);

      // Use the same DataRequirement collection and facility/period filter as the client portal.
      const query = new URLSearchParams({
        facilityId: currentAssessment.facilityId,
        period: currentAssessment.period,
      });
      const requirementsResponse = await fetch(`/api/requirements?${query.toString()}`, { cache: 'no-store' });
      const requirementsPayload = await requirementsResponse.json().catch(() => null);
      if (!requirementsResponse.ok) {
        throw new Error(requirementsPayload?.error || 'Unable to load client submissions.');
      }
      setRequirements(Array.isArray(requirementsPayload?.data) ? requirementsPayload.data : []);
    } catch (loadError) {
      console.error('Error loading consultant data checklist:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load client submissions.');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-xs text-slate-500">
        Loading Data Collection Checklist...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Link
          href={`/facilities/${assessment?.facilityId || 'TRIDENT_PAPER'}`}
          className="hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          {assessment?.facilityName || assessment?.facilityId || 'Facility'}
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <Link href={`/assessments/${assessmentId}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
          Assessment
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="text-slate-900 dark:text-white font-semibold">Data Collection Checklist</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Current-Year Data Collection Checklist ({assessment?.period || 'FY 2025-26'})
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Replaces Excel tracker: Common energy data & compliance-specific requirements linked to {assessment?.facilityId || 'Trident Paper'}.
              </p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh submissions
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Checklist Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Active Data Requirements & Verification States
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Separate state machines: Submission Status vs Verification Status
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Requirement</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Linked Compliances</th>
                <th className="py-3 px-4 text-center">Submission Status</th>
                <th className="py-3 px-4 text-center">Verification Status</th>
                <th className="py-3 px-4">Submitted Drive Evidence</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70 text-xs">
              {requirements.map((req) => (
                <tr key={req._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">{req.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{req.description}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {req.category === 'COMMON_ENERGY' ? 'Common Energy' : 'Specific Mandate'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {(req.linkedCompliances || []).map((compliance) => (
                        <span key={compliance} className="rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400">
                          {compliance}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={req.submissionStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={req.verificationStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex min-w-[190px] flex-col gap-2">
                      {req.submittedDriveLinks?.length ? (
                        req.submittedDriveLinks.map((submission, index) => (
                          <div key={`${submission.url}-${index}`} className="space-y-1">
                            <DriveLinkBadge
                              url={submission.url}
                              label={submission.description || 'Client evidence'}
                              billDetails={submission.billDetails}
                              utilityConnectionSnapshot={submission.utilityConnectionSnapshot}
                              facilityId={req.facilityId}
                            />
                            {submission.billDetails && (
                              <p className="text-[10px] text-slate-500">
                                Invoice: {submission.billDetails.invoiceNumber || '—'} · Consumption: {submission.billDetails.consumptionKwh ?? '—'} kWh
                              </p>
                            )}
                            <p className="text-[10px] text-slate-500">
                              Submitted by {submission.submittedBy || 'Client'} · {submission.submittedAt ? formatDate(submission.submittedAt) : ''}
                            </p>
                          </div>
                        ))
                      ) : (
                        <span className="italic text-slate-500">Awaiting client submission</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono">
                    {req.dueDate ? formatDate(req.dueDate) : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {req.datasetId ? (
                      <Link
                        href={`/datasets/${req.datasetId}/verify`}
                        className="whitespace-nowrap rounded bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors"
                      >
                        Reconcile data
                      </Link>
                    ) : (
                      <span className="text-[10px] text-slate-500">Not linked</span>
                    )}
                  </td>
                </tr>
              ))}
              {requirements.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No data requirements found for this facility and reporting period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
