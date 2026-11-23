import type { ComplianceType, ICalendarItem } from '@/types';
import type { IDataRequirementDocument } from '@/models/DataRequirement';
import type { ICalendarItemDocument } from '@/models/CalendarItem';
import { resolveRequirementDueDate } from '@/lib/dataRequestDueDate';
import { resolveClientUploadWorkflowDisplay } from '@/lib/clientUploadStatus';

export type CalendarRowSource = 'requirement';

export type CalendarViewRow = ICalendarItem & {
  source: CalendarRowSource;
  sourceRequirementId: string;
  requestTitle?: string;
  requestCode?: string;
  linkedFrameworks?: ComplianceType[];
  requestWorkflowStatus?: string;
  requestSubmissionStatus?: string;
  hasDueDate: boolean;
};

function addDays(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function rowKey(facilityId: string, complianceType: string, reportingPeriod: string): string {
  return `${facilityId.toUpperCase()}|${complianceType}|${reportingPeriod.trim()}`;
}

function mapWorkflowToCalendarStatus(
  workflowStatus: string | undefined,
  regulatoryDue: Date
): ICalendarItem['status'] {
  if (workflowStatus === 'ACCEPTED' || workflowStatus === 'CLOSED') return 'COMPLETED';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (regulatoryDue.getTime() < today.getTime()) return 'OVERDUE';
  return 'PENDING';
}

type RequirementCalendarPick = Pick<
  IDataRequirementDocument,
  | '_id'
  | 'facilityId'
  | 'period'
  | 'dueDate'
  | 'linkedCompliances'
  | 'workflowStatus'
  | 'submissionStatus'
  | 'verificationStatus'
  | 'submittedDriveLinks'
  | 'submissionHistory'
  | 'title'
  | 'requestId'
>;

function mapExtensionHistory(item: ICalendarItemDocument): ICalendarItem['extensionHistory'] {
  return (item.extensionHistory || []).map((h) => ({
    oldDate: new Date(h.oldDate).toISOString(),
    newDate: new Date(h.newDate).toISOString(),
    reason: h.reason,
    notificationRef: h.notificationRef,
    revisedAt: new Date(h.revisedAt).toISOString(),
  }));
}

function mapRequirementRow(
  req: RequirementCalendarPick,
  facilityName: string,
  extensionOverlay?: ICalendarItemDocument
): CalendarViewRow | null {
  const dueIso = resolveRequirementDueDate(req.dueDate, req.period);
  let regulatoryDue: Date = new Date(dueIso);
  if (Number.isNaN(regulatoryDue.getTime())) {
    regulatoryDue = new Date();
  }

  const linkedFrameworks: ComplianceType[] =
    req.linkedCompliances?.length > 0 ? [...req.linkedCompliances] : (['RCO'] as ComplianceType[]);
  const primaryFramework = linkedFrameworks[0];

  const milestones = deriveMilestoneDates(regulatoryDue);
  const hasExtensions = (extensionOverlay?.extensionHistory?.length ?? 0) > 0;

  const hasSubmissions =
    (req.submittedDriveLinks && req.submittedDriveLinks.length > 0) ||
    (req.submissionHistory && req.submissionHistory.length > 0);

  let resolvedStatus = resolveClientUploadWorkflowDisplay({
    workflowStatus: req.workflowStatus,
    verificationStatus: req.verificationStatus,
    submissionStatus: req.submissionStatus,
  });

  if ((!resolvedStatus || resolvedStatus === 'REQUESTED') && hasSubmissions) {
    resolvedStatus = 'SUBMITTED';
  }

  return {
    _id: `req-${req._id.toString()}`,
    facilityId: req.facilityId,
    facilityName,
    complianceType: primaryFramework,
    reportingPeriod: req.period,
    regulatoryDueDate: regulatoryDue.toISOString(),
    internalDeadline: milestones.internalDeadline.toISOString(),
    clientDataSubmissionDeadline: milestones.clientDataSubmissionDeadline.toISOString(),
    assignedConsultantId: extensionOverlay?.assignedConsultantId?.toString() || '',
    status: hasExtensions
      ? 'EXTENDED'
      : mapWorkflowToCalendarStatus(resolvedStatus, regulatoryDue),
    actualSubmissionDate: null,
    extensionHistory: extensionOverlay ? mapExtensionHistory(extensionOverlay) : [],
    isRecurringCEA: linkedFrameworks.includes('CEA'),
    source: 'requirement',
    sourceRequirementId: req._id.toString(),
    requestTitle: req.title,
    requestCode: req.requestId,
    linkedFrameworks,
    requestWorkflowStatus: resolvedStatus || 'REQUESTED',
    requestSubmissionStatus: req.submissionStatus || 'REQUESTED',
    hasDueDate: true,
  };
}

/** Calendar rows = one row per consultant data request (with due date), optional extension log overlay. */
export function buildComplianceCalendarView(input: {
  requirements: Array<
    RequirementCalendarPick & {
      isApplicable?: boolean;
    }
  >;
  calendarItems?: Array<ICalendarItemDocument & { _id: { toString(): string } }>;
  facilityNameById: Map<string, string>;
}): CalendarViewRow[] {
  const extensionByReqId = new Map<string, ICalendarItemDocument>();
  for (const item of input.calendarItems || []) {
    const reqId = item.dataRequirementId?.toString();
    if (reqId) extensionByReqId.set(reqId, item);
  }

  const rows: CalendarViewRow[] = [];

  for (const req of input.requirements) {
    if (req.isApplicable === false) continue;
    const name = input.facilityNameById.get(req.facilityId) || req.facilityId;

    // Extension history is strictly isolated to this specific data request
    const overlay = extensionByReqId.get(req._id.toString());

    const row = mapRequirementRow(req, name, overlay);
    if (row) rows.push(row);
  }

  const dueSortKey = (iso: string) => {
    const t = iso ? new Date(iso).getTime() : Number.POSITIVE_INFINITY;
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };

  return rows.sort(
    (a, b) =>
      dueSortKey(a.regulatoryDueDate) - dueSortKey(b.regulatoryDueDate) ||
      (a.requestTitle || '').localeCompare(b.requestTitle || '')
  );
}

export function parseCalendarItemId(itemId: string): {
  kind: 'requirement' | 'calendar';
  requirementId?: string;
  complianceType?: ComplianceType;
  calendarId?: string;
} {
  const reqMatch = itemId.match(/^req-([a-f0-9]{24})(?:-(RCO|PAT|CCTS|CEA))?$/i);
  if (reqMatch) {
    return {
      kind: 'requirement',
      requirementId: reqMatch[1],
      complianceType: (reqMatch[2] as ComplianceType) || undefined,
    };
  }
  return { kind: 'calendar', calendarId: itemId };
}

export function deriveMilestoneDates(regulatoryDue: Date): {
  clientDataSubmissionDeadline: Date;
  internalDeadline: Date;
} {
  return {
    clientDataSubmissionDeadline: addDays(regulatoryDue, -10),
    internalDeadline: addDays(regulatoryDue, -5),
  };
}