import type { RequestWorkflowStatus } from '@/types';

const TRANSITIONS: Record<RequestWorkflowStatus, RequestWorkflowStatus[]> = {
  DRAFT: ['REQUESTED', 'CLOSED'],
  REQUESTED: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['PARTIALLY_SUBMITTED', 'SUBMITTED', 'REQUESTED', 'CLOSED'],
  PARTIALLY_SUBMITTED: ['SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'CLOSED'],
  SUBMITTED: ['UNDER_REVIEW', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'CHANGES_REQUESTED', 'CLOSED'],
  UNDER_REVIEW: ['CHANGES_REQUESTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'CLOSED'],
  PARTIALLY_ACCEPTED: ['ACCEPTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'CLOSED'],
  CHANGES_REQUESTED: ['IN_PROGRESS', 'RESUBMITTED', 'CLOSED'],
  RESUBMITTED: ['UNDER_REVIEW', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'CHANGES_REQUESTED', 'CLOSED'],
  ACCEPTED: [],
  REJECTED: ['IN_PROGRESS', 'RESUBMITTED', 'CLOSED'],
  CLOSED: [],
};

export function canTransition(from: RequestWorkflowStatus | undefined, to: RequestWorkflowStatus): boolean {
  const current = from || 'REQUESTED';
  return TRANSITIONS[current]?.includes(to) ?? false;
}

export function assertTransition(from: RequestWorkflowStatus | undefined, to: RequestWorkflowStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid status transition from ${from || 'REQUESTED'} to ${to}`);
  }
}

export function workflowLabel(status: RequestWorkflowStatus | string): string {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}