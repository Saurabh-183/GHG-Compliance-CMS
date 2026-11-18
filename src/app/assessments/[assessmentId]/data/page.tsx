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
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-xs text-slate-500">Loading Data Collection Checklist...</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Link href={`/facilities/${assessment?.facilityId || ''}`} className="hover:text-emerald-500">{assessment?.facilityName || assessment?.facilityId || 'Facility'}</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href={`/assessments/${assessmentId}`} className="hover:text-emerald-500">Assessment</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="font-semibold text-slate-900 dark:text-white">Data Collection Checklist</span>
      </div>

      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400"><FileSpreadsheet className="h-5 w-5" /></span>
          <div>
            <h1 className="text-xl font-bold text-white">Data Collection Checklist</h1>
            <p className="mt-1 text-xs text-slate-400">{assessment?.facilityName || assessment?.facilityId} · Reporting period: {assessment?.period} · Framework: {assessment?.complianceType}</p>
          </div>
        </div>
        <button type="button" onClick={() => void loadData()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh submissions
        </button>
      </section>

      {error && <div role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}

      <section className="space-y-4 rounded-md border border-slate-800 bg-slate-900/60 p-4 shadow-xl sm:p-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Client data submissions and verification states</h2>
          <span className="text-[11px] text-slate-500">Submission status and verification status are tracked separately.</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Frameworks</th>
                <th className="px-4 py-3 text-center">Submission</th>
                <th className="px-4 py-3 text-center">Verification</th>
                <th className="px-4 py-3">Client evidence / bill preview</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {requirements.map((requirement) => (
                <tr key={requirement._id} className="hover:bg-slate-800/30">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-slate-900 dark:text-white">{requirement.title}</div>
                    <div className="mt-0.5 line-clamp-2 text-[11px] text-slate-500">{requirement.description}</div>
                    <div className="mt-1 text-[10px] text-slate-500">{requirement.facilityId} · {requirement.period}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">{requirement.category === 'COMMON_ENERGY' ? 'Common Energy' : 'Specific Mandate'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1">{(requirement.linkedCompliances || []).map((compliance) => <span key={compliance} className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">{compliance}</span>)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge status={requirement.submissionStatus} size="sm" /></td>
                  <td className="px-4 py-3.5 text-center"><StatusBadge status={requirement.verificationStatus} size="sm" /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex min-w-[190px] flex-col gap-2">
                      {requirement.submittedDriveLinks?.length ? requirement.submittedDriveLinks.map((submission, index) => (
                        <div key={`${submission.url}-${index}`} className="space-y-1">
                          <DriveLinkBadge
                            url={submission.url}
                            label={submission.description || 'Client evidence'}
                            billDetails={submission.billDetails}
                            utilityConnectionSnapshot={submission.utilityConnectionSnapshot}
                            facilityId={requirement.facilityId}
                          />
                          {submission.billDetails && (
                            <p className="text-[10px] text-slate-500">Invoice: {submission.billDetails.invoiceNumber || '—'} · Consumption: {submission.billDetails.consumptionKwh ?? '—'} kWh</p>
                          )}
                          <p className="text-[10px] text-slate-500">Submitted by {submission.submittedBy || 'Client'} · {submission.submittedAt ? formatDate(submission.submittedAt) : ''}</p>
                        </div>
                      )) : <span className="italic text-slate-500">Awaiting client submission</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">{requirement.dueDate ? formatDate(requirement.dueDate) : '—'}</td>
                  <td className="px-4 py-3.5">
                    {requirement.datasetId ? (
                      <Link href={`/datasets/${requirement.datasetId}/verify`} className="whitespace-nowrap rounded bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20">Reconcile data</Link>
                    ) : <span className="text-[10px] text-slate-600">Not linked</span>}
                  </td>
                </tr>
              ))}
              {requirements.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No data requirements found for this facility and reporting period.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
