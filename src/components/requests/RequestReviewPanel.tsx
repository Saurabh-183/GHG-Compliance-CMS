'use client';

import React, { useMemo, useState } from 'react';
import type { IDataRequirement, IRequestFieldReview } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { RequestTimeline } from '@/components/requests/RequestTimeline';
import { formatDate } from '@/lib/utils';
import { getDueUrgency } from '@/lib/dataRequestDisplay';
import { resolveRequirementDueDate } from '@/lib/dataRequestDueDate';
import { notify } from '@/lib/notify';
import { MuiDatePicker } from '@/components/common/MuiDatePicker';
import { CheckCircle2, XCircle, RotateCcw, Eye, Calendar, ChevronDown } from 'lucide-react';
import { Select, MenuItem, FormControl, SelectChangeEvent } from '@mui/material';

const REVIEW_STATUSES = ['PENDING', 'VERIFIED', 'MISSING', 'INCORRECT', 'CLARIFICATION_REQUIRED'] as const;

export function RequestReviewPanel({
  requirement,
  onReviewed,
}: {
  requirement: IDataRequirement;
  onReviewed?: () => void | Promise<void>;
}) {
  const { currentRole, currentUser, theme } = useAuth();
  const isDark = theme === 'dark';
  const isAdmin = currentRole === 'ADMIN' || currentUser?.role === 'ADMIN';

  const isSubmitted =
    requirement.workflowStatus === 'SUBMITTED' ||
    requirement.workflowStatus === 'RESUBMITTED' ||
    requirement.workflowStatus === 'UNDER_REVIEW' ||
    requirement.submissionStatus === 'RECEIVED';

  const isAccepted =
    requirement.workflowStatus === 'ACCEPTED' ||
    requirement.requirementItemStatus === 'ACCEPTED' ||
    requirement.verificationStatus === 'APPROVED';

  const effectiveDueDate = useMemo(() => {
    return resolveRequirementDueDate(requirement.dueDate, requirement.period, requirement.requestedAt);
  }, [requirement.dueDate, requirement.period, requirement.requestedAt]);

  const [comment, setComment] = useState(requirement.reviewNote || '');
  const [dueDateInput, setDueDateInput] = useState(() => {
    const raw = requirement.dueDate || effectiveDueDate;
    if (!raw) return '';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  });
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

  const activeDueDate = dueDateInput || requirement.dueDate || effectiveDueDate;
  const urgency = getDueUrgency(activeDueDate, requirement.workflowStatus);

  const latestSubmission = useMemo(
    () => requirement.submissionHistory?.[requirement.submissionHistory.length - 1],
    [requirement.submissionHistory]
  );

  const allFieldsVerified = useMemo(() => {
    if (fieldReviews.length === 0) return true;
    return fieldReviews.every((review) => review.status === 'VERIFIED');
  }, [fieldReviews]);

  const submitReview = async (action: 'START_REVIEW' | 'REQUEST_CHANGES' | 'ACCEPT' | 'REJECT') => {
    if (isAccepted) {
      notify.error('This data request has already been accepted and locked. No further modifications or status changes are permitted.');
      return;
    }
    if (action === 'ACCEPT' && !allFieldsVerified) {
      notify.error('All fields must be marked as Verified before accepting the submission.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/requirements/${requirement._id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          comment: comment.trim() || undefined,
          dueDate: isSubmitted ? undefined : (dueDateInput || undefined),
          fieldReviews,
        }),
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <MetaStat label="Workflow" value={requirement.workflowStatus || 'REQUESTED'} workflow />
        <MetaStat label="Version" value={String(requirement.submissionVersion || 0)} />
        <MetaStat label="Facility" value={requirement.facilityId} mono />
        <MetaStat label="Period" value={requirement.period} mono />
        <MetaStat
          label="Due date*"
          value={formatDate(activeDueDate)}
          badge={urgency === 'overdue' ? 'Overdue' : urgency === 'soon' ? 'Soon' : undefined}
          badgeVariant={urgency === 'overdue' ? 'rose' : 'amber'}
        />
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
                {isAdmin || isAccepted ? (
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-center">
                    {review.status.replaceAll('_', ' ')}
                  </span>
                ) : (
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={review.status}
                      onChange={(e: SelectChangeEvent) =>
                        setFieldReviews((current) =>
                          current.map((item) =>
                            item.fieldKey === review.fieldKey
                              ? { ...item, status: e.target.value as IRequestFieldReview['status'] }
                              : item
                          )
                        )
                      }
                      IconComponent={() => (
                        <ChevronDown
                          className="w-3.5 h-3.5 pointer-events-none"
                          style={{ color: isDark ? '#94A3B8' : '#64748B', marginRight: 6 }}
                        />
                      )}
                      sx={{
                        height: 32,
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '6px',
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
                          py: '4px',
                          px: '8px',
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
                              '& .MuiList-root': { py: '4px' },
                            },
                          },
                        },
                      }}
                    >
                      {REVIEW_STATUSES.map((s) => (
                        <MenuItem
                          key={s}
                          value={s}
                          sx={{
                            fontSize: '11px',
                            fontWeight: review.status === s ? 600 : 400,
                            py: 0.5,
                            px: 1.25,
                          }}
                        >
                          {s.replaceAll('_', ' ')}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isAdmin ? (
        requirement.reviewNote ? (
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-1 bg-slate-50/70 dark:bg-slate-900/40">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Consultant comment</span>
            <p className="text-slate-700 dark:text-slate-300 text-xs whitespace-pre-wrap">{requirement.reviewNote}</p>
          </div>
        ) : null
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-3 items-start">
            <div className="space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" /> Due date
                </span>
                {(isSubmitted || isAccepted) && (
                  <span className="text-[10px] text-slate-400 font-normal">
                    {isAccepted ? '(Locked — accepted)' : '(Locked — submitted)'}
                  </span>
                )}
              </span>
              <MuiDatePicker
                value={dueDateInput}
                onChange={(val) => setDueDateInput(val)}
                placeholder="dd-mm-yyyy"
                disabled={isSubmitted || isAccepted}
              />
            </div>
            <label className="block space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Consultant comment</span>
              <textarea
                rows={3}
                value={comment}
                disabled={isAccepted}
                onChange={(e) => setComment(e.target.value)}
                className={`w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isAccepted
                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed'
                    : 'bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200'
                }`}
                placeholder={isAccepted ? 'No further comments (request accepted)' : 'Explain missing or incorrect items for the client…'}
              />
            </label>
          </div>
        </div>
      )}

      {isAdmin ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3.5 text-xs text-slate-600 dark:text-slate-400">
          <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong className="font-semibold text-slate-800 dark:text-slate-200">Admin View Only:</strong> Data review actions (accept, reject, request changes) are reserved for assigned Consultants.
          </span>
        </div>
      ) : isAccepted ? (
        <div className="flex flex-wrap items-center gap-2 justify-end w-full">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed opacity-60"
            title="Accepted requests cannot request changes"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Request changes
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-not-allowed opacity-60"
            title="Accepted requests cannot be rejected"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-700/60 dark:bg-emerald-800/60 text-white font-bold text-xs cursor-not-allowed opacity-75 shadow-none"
            title="Submission already accepted"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Accepted
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 justify-end">
          {!allFieldsVerified && fieldReviews.length > 0 && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mr-auto sm:mr-2">
              Mark all fields as Verified to accept submission
            </span>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => void submitReview('REQUEST_CHANGES')}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-700 text-white font-bold hover:bg-amber-800 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Request changes
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submitReview('REJECT')}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-rose-400 text-rose-700 font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" /> Reject
          </button>
          <button
            type="button"
            disabled={saving || !allFieldsVerified}
            onClick={() => void submitReview('ACCEPT')}
            title={
              !allFieldsVerified
                ? 'All fields must be marked as Verified before accepting submission'
                : undefined
            }
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg font-bold transition-all ${
              saving || !allFieldsVerified
                ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Accept submission
          </button>
        </div>
      )}

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
  badge,
  badgeVariant,
}: {
  label: string;
  value: string;
  mono?: boolean;
  workflow?: boolean;
  badge?: string;
  badgeVariant?: 'rose' | 'amber' | 'emerald';
}) {
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-2">
      <div className="text-[10px] uppercase text-slate-500 flex items-center justify-between">
        <span>{label}</span>
        {badge && (
          <span
            className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${
              badgeVariant === 'rose'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                : badgeVariant === 'amber'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            }`}
          >
            {badge}
          </span>
        )}
      </div>
      <div className={`font-semibold text-slate-900 dark:text-white ${mono ? 'font-mono text-[11px]' : ''}`}>
        {workflow ? <StatusBadge status={value} type="verification" size="sm" /> : value}
      </div>
    </div>
  );
}