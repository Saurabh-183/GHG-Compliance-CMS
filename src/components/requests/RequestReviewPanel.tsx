'use client';

import React, { useMemo, useState } from 'react';
import type { IDataRequirement, IRequestFieldReview } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { RequestTimeline } from '@/components/requests/RequestTimeline';
import { notify } from '@/lib/notify';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

const REVIEW_STATUSES = ['PENDING', 'VERIFIED', 'MISSING', 'INCORRECT', 'CLARIFICATION_REQUIRED'] as const;

export function RequestReviewPanel({
  requirement,
  onReviewed,
}: {
  requirement: IDataRequirement;
  onReviewed?: () => void | Promise<void>;
}) {
  const [comment, setComment] = useState(requirement.reviewNote || '');
  const [saving, setSaving] = useState(false);
  const [fieldReviews, setFieldReviews] = useState<IRequestFieldReview[]>(() =>
    (requirement.requiredFields || []).map((field) => {
      const existing = requirement.fieldReviews?.find((r) => r.fieldKey === field.key);
      return {
        fieldKey: field.key,
        status: existing?.status || 'PENDING',
        comment: existing?.comment,
      };
    })
  );

  const latestSubmission = useMemo(
    () => requirement.submissionHistory?.[requirement.submissionHistory.length - 1],
    [requirement.submissionHistory]
  );

  const submitReview = async (action: 'START_REVIEW' | 'REQUEST_CHANGES' | 'ACCEPT' | 'REJECT') => {
    setSaving(true);
    try {
      const res = await fetch(`/api/requirements/${requirement._id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, comment: comment.trim() || undefined, fieldReviews }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Review failed');
      notify.success(json.message || 'Review saved');
      if (onReviewed) await onReviewed();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Review failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetaStat label="Workflow" value={requirement.workflowStatus || 'REQUESTED'} workflow />
        <MetaStat label="Version" value={String(requirement.submissionVersion || 0)} />
        <MetaStat label="Facility" value={requirement.facilityId} mono />
        <MetaStat label="Period" value={requirement.period} mono />
      </div>

      {latestSubmission?.structuredData && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
          <h4 className="font-bold text-slate-900 dark:text-white">Submitted information</h4>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.entries(latestSubmission.structuredData).map(([key, value]) => (
              <div key={key}>
                <dt className="text-slate-500">{key}</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2">
        <h4 className="font-bold text-slate-900 dark:text-white">Supporting documents</h4>
        {requirement.submittedDriveLinks?.length ? (
          requirement.submittedDriveLinks.map((link, i) => (
            <DriveLinkBadge key={i} url={link.vaultUrl || link.url} label={link.description || 'Document'} />
          ))
        ) : (
          <p className="text-slate-500">No documents attached.</p>
        )}
      </div>

      {fieldReviews.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <h4 className="font-bold text-slate-900 dark:text-white">Field-level review</h4>
          {fieldReviews.map((review) => {
            const field = requirement.requiredFields?.find((f) => f.key === review.fieldKey);
            return (
              <div key={review.fieldKey} className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-2 items-center">
                <span className="text-slate-700 dark:text-slate-300">{field?.label || review.fieldKey}</span>
                <select
                  value={review.status}
                  onChange={(e) =>
                    setFieldReviews((current) =>
                      current.map((item) =>
                        item.fieldKey === review.fieldKey
                          ? { ...item, status: e.target.value as IRequestFieldReview['status'] }
                          : item
                      )
                    )
                  }
                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5"
                >
                  {REVIEW_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      <label className="block space-y-1">
        <span className="font-semibold text-slate-800 dark:text-slate-200">Consultant comment</span>
        <textarea
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2"
          placeholder="Explain missing or incorrect items for the client…"
        />
      </label>

      <div className="flex flex-wrap gap-2 justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void submitReview('REQUEST_CHANGES')}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-700 text-white font-bold"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Request changes
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void submitReview('REJECT')}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-rose-400 text-rose-700 font-bold"
        >
          <XCircle className="w-3.5 h-3.5" /> Reject
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void submitReview('ACCEPT')}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-700 text-white font-bold"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Accept submission
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h4 className="font-bold text-slate-900 dark:text-white mb-3">Audit timeline</h4>
        <RequestTimeline requirement={requirement} />
      </div>
    </div>
  );
}

function MetaStat({
  label,
  value,
  mono,
  workflow,
}: {
  label: string;
  value: string;
  mono?: boolean;
  workflow?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-2">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <div className={`font-semibold text-slate-900 dark:text-white ${mono ? 'font-mono text-[11px]' : ''}`}>
        {workflow ? <StatusBadge status={value} type="verification" size="sm" /> : value}
      </div>
    </div>
  );
}