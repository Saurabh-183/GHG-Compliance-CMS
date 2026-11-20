import { BRSR_CATEGORY_LABELS, type BrsrDataCategory } from '@/lib/brsrRequestTemplates';
import type { IDataRequirement, RequestWorkflowStatus } from '@/types';

export function resolveDataCategoryLabel(req: Pick<IDataRequirement, 'dataCategory' | 'brsrSection' | 'category' | 'title'>): string {
  if (req.dataCategory && req.dataCategory in BRSR_CATEGORY_LABELS) {
    return BRSR_CATEGORY_LABELS[req.dataCategory as BrsrDataCategory];
  }
  if (req.brsrSection) return req.brsrSection;
  return req.category === 'COMMON_ENERGY' ? 'Energy data' : 'Compliance report';
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

export const WORKFLOW_STATUS_FILTER_MAP: Record<string, RequestWorkflowStatus | 'pendingSubmission'> = {
  pendingSubmission: 'REQUESTED',
};

export function matchesQuickFilter(
  req: IDataRequirement,
  quick: string
): boolean {
  const status = (req.workflowStatus || req.verificationStatus) as string;
  switch (quick) {
    case 'pendingSubmission':
      return ['REQUESTED', 'IN_PROGRESS', 'CHANGES_REQUESTED'].includes(status);
    case 'submitted':
      return ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW'].includes(status);
    case 'accepted':
      return ['ACCEPTED', 'APPROVED'].includes(status);
    case 'overdue':
      return getDueUrgency(req.dueDate, status) === 'overdue';
    default:
      return true;
  }
}

export const PRIORITY_STYLES: Record<string, string> = {
  HIGH: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  MEDIUM: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
  LOW: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
};