import type { IDataRequirement, ISubmittedDriveLink } from '@/types';

export type ClientPortalPrimaryAction = 'view' | 'resubmit' | 'submit';

export function clientPortalPrimaryAction(req: IDataRequirement): ClientPortalPrimaryAction {
  const status = req.workflowStatus || 'REQUESTED';
  if (['CHANGES_REQUESTED', 'REJECTED', 'CLARIFICATION_REQUIRED'].includes(status)) {
    return 'resubmit';
  }
  const hasLinks = (req.submittedDriveLinks?.length ?? 0) > 0;
  const hasStructured =
    Boolean(req.latestStructuredData && Object.keys(req.latestStructuredData).length) ||
    Boolean(
      req.submissionHistory?.some(
        (h) => h.structuredData && Object.keys(h.structuredData).length > 0
      )
    );

  if (['ACCEPTED', 'CLOSED', 'APPROVED'].includes(status)) return 'view';
  if (hasLinks || hasStructured) {
    if (['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED', 'IN_PROGRESS'].includes(status)) {
      return hasLinks ? 'view' : 'submit';
    }
  }
  return 'submit';
}

export function clientPortalPrimaryLabel(req: IDataRequirement): string {
  const action = clientPortalPrimaryAction(req);
  if (action === 'view') return 'View';
  if (action === 'resubmit') return 'Resubmit';
  return 'Submit';
}

export function isClientSubmissionReadOnly(req: IDataRequirement): boolean {
  return clientPortalPrimaryAction(req) === 'view';
}

export function getLatestDriveLink(req: IDataRequirement): ISubmittedDriveLink | null {
  const links = req.submittedDriveLinks || [];
  if (!links.length) return null;
  return links[links.length - 1];
}

export function getLatestSubmissionStructuredData(req: IDataRequirement): Record<string, unknown> {
  const history = req.submissionHistory;
  if (history?.length) {
    for (let i = history.length - 1; i >= 0; i--) {
      const data = history[i].structuredData;
      if (data && Object.keys(data).length > 0) return data;
    }
  }
  if (req.latestStructuredData && Object.keys(req.latestStructuredData).length > 0) {
    return req.latestStructuredData;
  }
  return req.clientDraftData?.structuredData || {};
}

export function getLatestSubmissionComment(req: IDataRequirement): string {
  const history = req.submissionHistory;
  if (history?.length) {
    const last = history[history.length - 1];
    if (last.comment?.trim()) return last.comment.trim();
  }
  return req.clientDraftData?.comment?.trim() || '';
}

export function formatSubmittedFieldValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export type HydratedClientSubmissionForm = {
  driveUrl: string;
  fileDescription: string;
  reportingMonth: string;
  connection: {
    providerName: string;
    connectionType: string;
    subDivision: string;
    circle: string;
    consumerAccountNumber: string;
    consumerName: string;
    meterNumber: string;
    contractDemand: string;
  };
  bill: {
    invoiceNumber: string;
    billingFrom: string;
    billingTo: string;
    consumptionKwh: string;
    billAmount: string;
  };
  structuredData: Record<string, unknown>;
  clientComment: string;
};

const emptyConnection = {
  providerName: '',
  connectionType: '',
  subDivision: '',
  circle: '',
  consumerAccountNumber: '',
  consumerName: '',
  meterNumber: '',
  contractDemand: '',
};

const emptyBill = {
  invoiceNumber: '',
  billingFrom: '',
  billingTo: '',
  consumptionKwh: '',
  billAmount: '',
};

export function hydrateClientSubmissionForm(req: IDataRequirement): HydratedClientSubmissionForm {
  const link = getLatestDriveLink(req);
  const snap = link?.utilityConnectionSnapshot;
  const bill = link?.billDetails;

  return {
    driveUrl: link?.sourceUrl || link?.url || '',
    fileDescription: link?.description || link?.fileName || '',
    reportingMonth: link?.mappedMonth || '',
    connection: {
      ...emptyConnection,
      ...(req.utilityConnection || {}),
      ...(snap || {}),
    },
    bill: bill
      ? {
          invoiceNumber: bill.invoiceNumber || '',
          billingFrom: bill.billingFrom || '',
          billingTo: bill.billingTo || '',
          consumptionKwh:
            bill.consumptionKwh !== undefined && bill.consumptionKwh !== null
              ? String(bill.consumptionKwh)
              : '',
          billAmount:
            bill.billAmount !== undefined && bill.billAmount !== null ? String(bill.billAmount) : '',
        }
      : { ...emptyBill },
    structuredData: getLatestSubmissionStructuredData(req),
    clientComment: getLatestSubmissionComment(req),
  };
}