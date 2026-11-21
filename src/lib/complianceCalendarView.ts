import type { ComplianceType, ICalendarItem } from '@/types';
import type { IDataRequirementDocument } from '@/models/DataRequirement';
import type { ICalendarItemDocument } from '@/models/CalendarItem';

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
  const hasDueDate = Boolean(req.dueDate);
  let regulatoryDue: Date | null = null;
  if (req.dueDate) {
    const due = req.dueDate instanceof Date ? req.dueDate : new Date(req.dueDate);
    if (!Number.isNaN(due.getTime())) regulatoryDue = due;
  }

  const linkedFrameworks: ComplianceType[] =
    req.linkedCompliances?.length > 0 ? [...req.linkedCompliances] : (['RCO'] as ComplianceType[]);
  const primaryFramework = linkedFrameworks[0];

  const milestones = regulatoryDue ? deriveMilestoneDates(regulatoryDue) : null;
  const hasExtensions = (extensionOverlay?.extensionHistory?.length ?? 0) > 0;

  return {
    _id: `req-${req._id.toString()}`,
    facilityId: req.facilityId,
    facilityName,
    complianceType: primaryFramework,
    reportingPeriod: req.period,
    regulatoryDueDate: regulatoryDue ? regulatoryDue.toISOString() : '',
    internalDeadline: milestones
      ? milestones.internalDeadline.toISOString()
      : '',
    clientDataSubmissionDeadline: milestones
      ? milestones.clientDataSubmissionDeadline.toISOString()
      : '',
    assignedConsultantId: extensionOverlay?.assignedConsultantId?.toString() || '',
    status: !regulatoryDue
      ? 'PENDING'
      : hasExtensions
        ? 'EXTENDED'
        : mapWorkflowToCalendarStatus(req.workflowStatus, regulatoryDue),
    actualSubmissionDate: null,
    extensionHistory: extensionOverlay ? mapExtensionHistory(extensionOverlay) : [],
    isRecurringCEA: linkedFrameworks.includes('CEA'),
    source: 'requirement',
    sourceRequirementId: req._id.toString(),
    requestTitle: req.title,
    requestCode: req.requestId,
    linkedFrameworks,
    requestWorkflowStatus: req.workflowStatus || 'REQUESTED',
    requestSubmissionStatus: req.submissionStatus || 'REQUESTED',
    hasDueDate,
  };
}

/** Calendar rows = one row per consultant data request (with due date), optional extension log overlay. */
export function buildComplianceCalendarView(input: {
  requirements: Array<
    Pick<
      IDataRequirementDocument,
      | '_id'
      | 'facilityId'
      | 'period'
      | 'dueDate'
      | 'linkedCompliances'
      | 'workflowStatus'
      | 'submissionStatus'
      | 'isApplicable'
      | 'title'
      | 'requestId'
    >
  >;
  calendarItems?: Array<ICalendarItemDocument & { _id: { toString(): string } }>;
  facilityNameById: Map<string, string>;
}): CalendarViewRow[] {
  const extensionByReqId = new Map<string, ICalendarItemDocument>();
  const extensionByKey = new Map<string, ICalendarItemDocument>();
  for (const item of input.calendarItems || []) {
    const reqId = item.dataRequirementId?.toString();
    if (reqId) extensionByReqId.set(reqId, item);
    extensionByKey.set(rowKey(item.facilityId, item.complianceType, item.reportingPeriod), item);
  }

  const rows: CalendarViewRow[] = [];

  for (const req of input.requirements) {
    if (req.isApplicable === false) continue;
    const name = input.facilityNameById.get(req.facilityId) || req.facilityId;
    const frameworks =
      req.linkedCompliances?.length > 0 ? req.linkedCompliances : (['RCO'] as ComplianceType[]);
    const overlay =
      extensionByReqId.get(req._id.toString()) ||
      frameworks
        .map((ct) => extensionByKey.get(rowKey(req.facilityId, ct, req.period)))
        .find(Boolean) ||
      extensionByKey.get(rowKey(req.facilityId, frameworks[0], req.period));

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