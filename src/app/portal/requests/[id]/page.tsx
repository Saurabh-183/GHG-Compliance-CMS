'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { IDataRequirement, IRequestDocumentSpec } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { RequestTimeline } from '@/components/requests/RequestTimeline';
import { ClientRequirementSubmissionModal } from '@/components/portal/ClientRequirementSubmissionModal';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import {
  getDueUrgency,
  PRIORITY_STYLES,
  requestCompletionPercent,
  resolveDataCategoryLabel,
} from '@/lib/dataRequestDisplay';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Building2, Calendar, FileSpreadsheet, UserCircle } from 'lucide-react';

export default function ClientRequestDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const [requirement, setRequirement] = useState<IDataRequirement | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/requirements/${id}`, { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setRequirement(json.data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <CarbonCrunchLoader message="Loading request details…" />;
  if (!requirement) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center text-sm text-slate-500">
        Request not found or access denied.
        <Link href="/portal/requests" className="block mt-2 text-emerald-700 hover:underline">
          Back to Data Requests
        </Link>
      </div>
    );
  }

  const categoryLabel = resolveDataCategoryLabel(requirement);
  const progress = requestCompletionPercent(requirement);
  const urgency = getDueUrgency(requirement.dueDate, requirement.workflowStatus);
  const status = requirement.workflowStatus || 'REQUESTED';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link
        href="/portal/requests"
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All data requests
      </Link>

      <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="h-2 bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-teal-500" style={{ width: `${progress}%` }} />
        </div>
        <div className="p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {categoryLabel}
              </span>
              <h1 className="mt-1 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
                {requirement.title}
              </h1>
              <p className="mt-1 font-mono text-xs text-slate-500">{requirement.requestId}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={status} type="verification" />
              {requirement.priority && (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${PRIORITY_STYLES[requirement.priority]}`}>
                  {requirement.priority} priority
                </span>
              )}
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{requirement.description}</p>
          {requirement.purpose && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-4 text-xs">
              <span className="font-bold text-slate-800 dark:text-slate-200">Why this is required</span>
              <p className="mt-1 text-slate-600 dark:text-slate-400">{requirement.purpose}</p>
            </div>
          )}

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <dt className="text-slate-500 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Facility
              </dt>
              <dd className="mt-1 font-semibold">{requirement.facilityName || requirement.facilityId}</dd>
              <dd className="font-mono text-[10px] text-slate-500">{requirement.facilityId}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <dt className="text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Reporting period
              </dt>
              <dd className="mt-1 font-mono font-semibold">{requirement.period}</dd>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <dt className="text-slate-500">Due date</dt>
              <dd
                className={`mt-1 font-semibold ${
                  urgency === 'overdue' ? 'text-rose-600' : urgency === 'soon' ? 'text-amber-600' : ''
                }`}
              >
                {requirement.dueDate ? formatDate(requirement.dueDate) : 'Not set'}
                {urgency === 'overdue' && ' · Overdue'}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <dt className="text-slate-500 flex items-center gap-1">
                <UserCircle className="w-3 h-3" /> Consultant
              </dt>
              <dd className="mt-1 font-semibold">{requirement.requestedByName || 'Assigned consultant'}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2">
            {(requirement.linkedCompliances || []).map((c) => (
              <span key={c} className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 border">
                {c}
              </span>
            ))}
            {requirement.brsrPrinciple && (
              <span className="px-2 py-0.5 rounded-md text-[10px] bg-violet-100 dark:bg-violet-950/50 text-violet-800 dark:text-violet-300">
                {requirement.brsrPrinciple}
              </span>
            )}
          </div>

          {requirement.submissionInstructions && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-4 text-xs text-blue-950 dark:text-blue-200">
              <strong>How to submit:</strong> {requirement.submissionInstructions}
            </div>
          )}

          {requirement.reviewNote && (
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-4 text-xs">
              <strong>{requirement.reviewedByName || 'Consultant'} feedback:</strong> {requirement.reviewNote}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {!['ACCEPTED', 'CLOSED'].includes(status) && (
              <button
                type="button"
                onClick={() => setSubmitOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 shadow-sm"
              >
                {['CHANGES_REQUESTED', 'REJECTED'].includes(status) ? 'Resubmit corrected data' : 'Submit response'}
              </button>
            )}
            <span className="text-xs text-slate-500 self-center">Completion estimate: {progress}%</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(requirement.requiredFields?.length ?? 0) > 0 && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-xs">
            <h2 className="font-bold text-sm mb-3">Information to provide</h2>
            <ul className="space-y-2">
              {requirement.requiredFields?.map((f) => {
                const review = requirement.fieldReviews?.find((r) => r.fieldKey === f.key);
                const flagged = review && !['PENDING', 'VERIFIED'].includes(review.status);
                return (
                  <li
                    key={f.key}
                    className={`flex justify-between gap-2 p-2 rounded-lg ${flagged ? 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900' : 'bg-slate-50 dark:bg-slate-950/50'}`}
                  >
                    <span>
                      {f.label}
                      {f.required && <span className="text-rose-500"> *</span>}
                    </span>
                    {review && review.status !== 'PENDING' && (
                      <span className="font-bold text-[10px] uppercase text-rose-600">{review.status.replaceAll('_', ' ')}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {((requirement.requiredDocumentSpecs?.length ?? 0) > 0 || (requirement.requiredDocuments?.length ?? 0) > 0) && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 text-xs">
            <h2 className="font-bold text-sm mb-3">Required documents</h2>
            <ul className="space-y-2 text-slate-600 dark:text-slate-300">
              {(
                requirement.requiredDocumentSpecs?.length
                  ? requirement.requiredDocumentSpecs
                  : (requirement.requiredDocuments || []).map(
                      (name): IRequestDocumentSpec => ({ name, required: true })
                    )
              ).map((doc) => (
                <li key={doc.name} className="rounded-lg border border-slate-200 dark:border-slate-800 p-3">
                  <span className="font-semibold">{doc.name}</span>
                  {doc.required && <span className="text-rose-500 text-[10px] ml-1">Mandatory</span>}
                  {doc.description ? <p className="text-[11px] mt-0.5">{doc.description}</p> : null}
                  {doc.acceptedFileTypes?.length ? (
                    <p className="text-[10px] text-slate-500">Formats: {doc.acceptedFileTypes.join(', ')}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {(requirement.submittedDriveLinks?.length ?? 0) > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="font-bold text-sm mb-3">Your submitted files</h2>
          <div className="flex flex-col gap-2">
            {requirement.submittedDriveLinks.map((link, i) => (
              <DriveLinkBadge key={i} url={link.vaultUrl || link.url} label={link.description || 'Document'} facilityId={requirement.facilityId} />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <h2 className="text-sm font-bold mb-4">Request timeline</h2>
        <RequestTimeline requirement={requirement} />
      </section>

      <ClientRequirementSubmissionModal
        requirement={submitOpen ? requirement : null}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={load}
      />
    </div>
  );
}