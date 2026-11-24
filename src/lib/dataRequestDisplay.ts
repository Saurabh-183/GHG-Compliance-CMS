import { getMasterRequirement, MASTER_REQUIREMENT_CATEGORIES } from '@/lib/dataRequirementMaster';
import type { IDataRequirement, RequestWorkflowStatus, SubmissionStatus } from '@/types';

/** Display-ready client submission state (syncs legacy rows where drive links exist but status was not updated). */
export function resolveClientSubmissionStatus(
  req: Pick<
    IDataRequirement,
    | 'submissionStatus'
    | 'workflowStatus'
    | 'submittedDriveLinks'
    | 'clientDraftData'
    | 'latestStructuredData'
    | 'monthlyFrequency'
    | 'reportingMonths'
  >
): SubmissionStatus {
  const linkCount = req.submittedDriveLinks?.length ?? 0;
  const structured =
    (req.latestStructuredData && Object.keys(req.latestStructuredData).length > 0) ||
    (req.clientDraftData?.structuredData && Object.keys(req.clientDraftData.structuredData).length > 0);

  if (req.submissionStatus === 'NOT_REQUESTED') return 'NOT_REQUESTED';

  if (req.workflowStatus === 'ACCEPTED' || req.workflowStatus === 'CLOSED') {
    return 'RECEIVED';
  }

  if (linkCount > 0 || structured) {
    if (req.monthlyFrequency && (req.reportingMonths?.length ?? 0) > 0) {
      const submittedMonths = new Set(
        (req.submittedDriveLinks || []).map((l) => l.mappedMonth).filter(Boolean)
      );
      const allMonths = req.reportingMonths!.every((m) => submittedMonths.has(m));
      return allMonths ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    }
    if (req.submissionStatus === 'RECEIVED' || req.submissionStatus === 'PARTIALLY_RECEIVED') {
      return req.submissionStatus;
    }
    return 'PARTIALLY_RECEIVED';
  }

  return req.submissionStatus || 'REQUESTED';
}

export function resolveDataCategoryLabel(
  req: Pick<IDataRequirement, 'dataCategory' | 'category' | 'title' | 'sourceChecklistItemKey'>
): string {
  if (req.sourceChecklistItemKey) {
    const master = getMasterRequirement(req.sourceChecklistItemKey);
    if (master) return MASTER_REQUIREMENT_CATEGORIES[master.category];
  }
  if (req.dataCategory?.trim()) return req.dataCategory.trim();
  if (req.category === 'COMMON_ENERGY') return 'Electricity and Power Data';
  return req.title || '—';
}

export type DueUrgency = 'none' | 'ok' | 'soon' | 'overdue';

export function getDueUrgency(dueDate?: string | null, workflowStatus?: RequestWorkflowStatus | string): DueUrgency {
  if (!dueDate) return 'none';
  const closed = ['ACCEPTED', 'CLOSED', 'REJECTED'].includes(workflowStatus || '');
  if (closed) return 'ok';
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'overdue';
  if (days <= 7) return 'soon';
  return 'ok';
}

export function requestCompletionPercent(req: IDataRequirement): number {
  const fields = req.requiredFields || [];
  if (fields.length === 0) {
    const hasDocs = (req.submittedDriveLinks?.length ?? 0) > 0;
    if (['ACCEPTED', 'CLOSED'].includes(req.workflowStatus || '')) return 100;
    if (hasDocs) return 70;
    if (req.workflowStatus === 'IN_PROGRESS') return 35;
    return 0;
  }
  const latest =
    req.submissionHistory?.[req.submissionHistory.length - 1]?.structuredData ||
    req.clientDraftData?.structuredData ||
    req.latestStructuredData ||
    {};
  const filled = fields.filter((f) => {
    const v = latest[f.key];
    return v !== undefined && v !== '' && v !== null;
  }).length;
  const fieldPct = Math.round((filled / fields.length) * 60);
  const docPct = (req.submittedDriveLinks?.length ?? 0) > 0 ? 25 : 0;
  const acceptedPct = ['ACCEPTED', 'CLOSED'].includes(req.workflowStatus || '') ? 15 : 0;
  return Math.min(100, fieldPct + docPct + acceptedPct);
}

export function matchesQuickFilter(req: IDataRequirement, quick: string): boolean {
  const status = (req.workflowStatus || req.verificationStatus) as string;
  switch (quick) {
    case 'pendingSubmission':
    case 'awaiting':
      return ['REQUESTED', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'NOT_STARTED'].includes(status) ||
        req.submissionStatus === 'REQUESTED';
    case 'submitted':
    case 'review':
      return ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'EVIDENCE_PENDING'].includes(status);
    case 'accepted':
      return ['ACCEPTED', 'APPROVED'].includes(status);
    case 'changes':
    case 'changesRequested':
      return status === 'CHANGES_REQUESTED' || req.verificationStatus === 'CLARIFICATION_REQUIRED';
    case 'underReview':
      return status === 'UNDER_REVIEW';
    case 'overdue':
      return getDueUrgency(req.dueDate, status) === 'overdue';
    case 'all':
    default:
      return true;
  }
}

export const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  MEDIUM: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
  LOW: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
};