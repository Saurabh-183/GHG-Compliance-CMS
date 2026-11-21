import type { IDataRequirement } from '@/types';

export type RequestStats = {
  total?: number;
  pendingSubmission?: number;
  inProgress?: number;
  submitted?: number;
  underReview?: number;
  changesRequested?: number;
  accepted?: number;
  overdue?: number;
};

type StatRow = {
  workflowStatus?: IDataRequirement['workflowStatus'] | string;
  dueDate?: string | Date | null;
};

export function computeRequestStats(rows: StatRow[]): RequestStats {
  const byWorkflow: Record<string, number> = {};
  for (const row of rows) {
    const key = row.workflowStatus || 'REQUESTED';
    byWorkflow[key] = (byWorkflow[key] || 0) + 1;
  }

  const today = new Date();
  const overdue = rows.filter((r) => {
    if (!r.dueDate) return false;
    const due = r.dueDate instanceof Date ? r.dueDate : new Date(r.dueDate);
    const open = !['ACCEPTED', 'CLOSED', 'REJECTED'].includes(r.workflowStatus || '');
    return open && due.getTime() < today.getTime();
  }).length;

  return {
    total: rows.length,
    pendingSubmission:
      (byWorkflow.REQUESTED || 0) +
      (byWorkflow.IN_PROGRESS || 0) +
      (byWorkflow.CHANGES_REQUESTED || 0),
    inProgress: byWorkflow.IN_PROGRESS || 0,
    submitted: (byWorkflow.SUBMITTED || 0) + (byWorkflow.RESUBMITTED || 0),
    underReview: byWorkflow.UNDER_REVIEW || 0,
    changesRequested: byWorkflow.CHANGES_REQUESTED || 0,
    accepted: byWorkflow.ACCEPTED || 0,
    overdue,
  };
}

type ProgressRow = Pick<
  IDataRequirement,
  'workflowStatus' | 'submissionStatus' | 'submittedDriveLinks'
>;

function clientHasSubmittedData(row: ProgressRow): boolean {
  const workflow = row.workflowStatus || 'REQUESTED';
  if (
    ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'CHANGES_REQUESTED'].includes(workflow)
  ) {
    return true;
  }
  if ((row.submittedDriveLinks?.length ?? 0) > 0) {
    return true;
  }
  const status = row.submissionStatus || '';
  return status === 'RECEIVED' || status === 'PARTIALLY_RECEIVED';
}

/** Client portal “Data Given / Data Matched” from consultant data requests for one facility + FY */
export function computePortalDataRequestPercentages(rows: ProgressRow[]): {
  dataGivenPercentage: number;
  dataMatchedPercentage: number;
  givenCount: number;
  matchedCount: number;
  auditedCount: number;
  total: number;
} {
  const total = rows.length;
  if (total === 0) {
    return {
      dataGivenPercentage: 0,
      dataMatchedPercentage: 0,
      givenCount: 0,
      matchedCount: 0,
      auditedCount: 0,
      total: 0,
    };
  }

  const givenCount = rows.filter(clientHasSubmittedData).length;
  const matchedCount = rows.filter((r) => (r.workflowStatus || '') === 'ACCEPTED').length;
  const auditedCount = rows.filter((r) =>
    ['SUBMITTED', 'RESUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'].includes(r.workflowStatus || '')
  ).length;

  const dataGivenPercentage = Math.round((givenCount / total) * 100);
  const dataMatchedPercentage =
    auditedCount > 0
      ? Number(((matchedCount / auditedCount) * 100).toFixed(1))
      : matchedCount > 0
        ? 100
        : 0;

  return {
    dataGivenPercentage,
    dataMatchedPercentage,
    givenCount,
    matchedCount,
    auditedCount,
    total,
  };
}