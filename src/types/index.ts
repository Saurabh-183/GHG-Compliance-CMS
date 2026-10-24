export type UserRole = 'ADMIN' | 'CONSULTANT' | 'CLIENT';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  clientGroupId?: string;
  authorizedFacilityIds?: string[];
  designation?: string;
  avatarUrl?: string;
}

export type ComplianceType = 'RCO' | 'PAT' | 'CCTS' | 'CEA';

export type WorkflowStatus =
  | 'NOT_STARTED'
  | 'DATA_COLLECTION'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'SUBMITTED';

export type ComplianceOutcome =
  | 'COMPLIANT'
  | 'SHORTFALL'
  | 'SURPLUS'
  | 'PENDING_DETERMINATION'
  | 'NOT_APPLICABLE';

export type SubmissionStatus =
  | 'NOT_REQUESTED'
  | 'REQUESTED'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED';

export type VerificationStatus =
  | 'NOT_STARTED'
  | 'EVIDENCE_PENDING'
  | 'UNDER_REVIEW'
  | 'CLARIFICATION_REQUIRED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED';

export type ReconciliationResult = 'MATCHED' | 'MISMATCH' | 'EVIDENCE_MISSING';

export interface IClientGroup {
  _id: string;
  name: string;
  code: string;
  industry: string;
  headquarters: string;
  contactPerson: {
    name: string;
    email: string;
    phone: string;
  };
  totalFacilitiesCount?: number;
  activeCompliancesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IDriveConnection {
  isConnected: boolean;
  folderUrl: string;
  folderName?: string;
  spreadsheetUrl?: string;
  lastSyncedAt?: string;
  syncedMonthsCount?: number;
}

export interface IFacility {
  _id: string;
  facilityId: string; // e.g. TRIDENT_PAPER
  name: string;
  clientGroupId: string;
  clientGroupName?: string;
  location: string;
  category: string;
  assignedConsultantId: string;
  assignedReviewerId: string;
  assignedConsultantName?: string;
  assignedReviewerName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  driveConnection?: IDriveConnection;
  dataGivenPercentage?: number;
  dataMatchedPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IComplianceApplicability {
  _id: string;
  facilityId: string;
  complianceType: ComplianceType;
  period: string; // FY2024-25, FY2025-26, Cycle-II, 2025-06
  isApplicable: boolean;
  authority: string; // BEE, State ERC, Ministry of Power, CEA
  ministry?: string;
  notificationReference?: string;
  targetValue: number | null;
  targetUnit: string;
  targetMethodology?: string;
  deadline: string | null;
  assignedConsultantId: string;
  assignedReviewerId: string;
  workflowStatus: WorkflowStatus;
  complianceOutcome: ComplianceOutcome;
  notes?: string;
}

export interface IMetricValue {
  key: string;
  name: string;
  value: number | string;
  unit: string;
  period: string;
  source: string;
  sourceUrl?: string;
  isProvisional: boolean;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  version: number;
}

export interface IDocumentLinks {
  finalReportUrl?: string;
  submissionAckUrl?: string;
  calculationWorkbookUrl?: string;
  evidenceFolderUrl?: string;
}

export interface IAssessment {
  _id: string;
  facilityId: string;
  complianceType: ComplianceType;
  period: string;
  workflowStatus: WorkflowStatus;
  complianceOutcome: ComplianceOutcome;
  isHistorical: boolean;
  metrics: IMetricValue[];
  documentLinks: IDocumentLinks;
  version: number;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  assignedConsultantId?: string;
  assignedReviewerId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ISubmittedDriveLink {
  url: string;
  submittedAt: string;
  submittedBy: string;
  description: string;
}

export interface IDataRequirement {
  _id: string;
  facilityId: string;
  period: string;
  title: string;
  category: 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC';
  linkedCompliances: ComplianceType[];
  description: string;
  isApplicable: boolean;
  submissionStatus: SubmissionStatus;
  verificationStatus: VerificationStatus;
  requestedAt?: string;
  dueDate?: string;
  submittedDriveLinks: ISubmittedDriveLink[];
  datasetId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IMonthlyRecord {
  month: string; // YYYY-MM e.g. "2025-04"
  declaredValue: number;
  evidenceValue: number | null;
  unit: string;
  tolerance: number;
  variance: number;
  variancePercentage: number;
  result: ReconciliationResult;
  consumerNumber?: string;
  meterNumber?: string;
  billingPeriod?: string;
  sourceDocumentUrl?: string;
  evidenceDocumentUrl?: string;
  consultantNotes?: string;
  clarificationId?: string;
}

export interface IDatasetAudit {
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
}

export interface IDataset {
  _id: string;
  facilityId: string;
  datasetType: 'GRID_ELECTRICITY' | 'RENEWABLE_PURCHASE' | 'FUEL_CONSUMPTION' | 'PRODUCTION';
  period: string;
  dataRequirementId?: string;
  months: IMonthlyRecord[];
  submissionStatus: SubmissionStatus;
  verificationStatus: VerificationStatus;
  toleranceDefault: number;
  consultantSubmission?: {
    consultantId: string;
    consultantName: string;
    submittedAt: string;
    summary: string;
  };
  reviewerApproval?: {
    reviewerId: string;
    reviewerName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedAt: string;
    comments: string;
    isLocked: boolean;
    version: number;
  };
  auditTrail: IDatasetAudit[];
  createdAt: string;
  updatedAt: string;
}

export interface IClarification {
  _id: string;
  facilityId: string;
  datasetId: string;
  month: string;
  parameter: string;
  declaredValue: number;
  evidenceValue: number;
  variance: number;
  variancePercentage: number;
  comment: string;
  supportingLink: string;
  status: 'OPEN' | 'CLIENT_RESPONDED' | 'RESOLVED';
  emailDraft: string;
  clientResponse?: {
    responseText: string;
    revisedDriveLink: string;
    respondedAt: string;
    respondedBy?: string;
  };
  raisedBy: string;
  raisedByName?: string;
  raisedAt: string;
  resolvedAt?: string;
}

export interface IExtensionHistory {
  oldDate: string;
  newDate: string;
  reason: string;
  notificationRef: string;
  revisedAt: string;
}

export interface ICalendarItem {
  _id: string;
  facilityId: string;
  facilityName?: string;
  complianceType: ComplianceType;
  reportingPeriod: string;
  regulatoryDueDate: string;
  internalDeadline: string;
  clientDataSubmissionDeadline: string;
  assignedConsultantId: string;
  assignedConsultantName?: string;
  status: 'UPCOMING' | 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'EXTENDED';
  actualSubmissionDate?: string | null;
  extensionHistory: IExtensionHistory[];
  isRecurringCEA?: boolean;
}

export interface IComplianceMatrixCell {
  period: string;
  complianceType: ComplianceType;
  isApplicable: boolean;
  workflowStatus: WorkflowStatus;
  complianceOutcome: ComplianceOutcome;
  assessmentId?: string;
  deadline?: string;
}

export interface IFacilityComplianceMatrix {
  facility: IFacility;
  periods: string[];
  compliances: ComplianceType[];
  matrix: Record<ComplianceType, Record<string, IComplianceMatrixCell>>;
}

export interface IComparisonRow {
  parameter: string;
  unit: string;
  period1Value: string | number;
  period1Status: 'HISTORICAL_APPROVED' | 'PROVISIONAL' | 'APPROVED';
  period2Value: string | number;
  period2Status: 'HISTORICAL_APPROVED' | 'PROVISIONAL' | 'APPROVED';
  delta?: string | number;
  percentageChange?: string;
}

export interface IAuthUserSession {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  clientGroupId?: string;
  authorizedFacilityIds?: string[];
}
