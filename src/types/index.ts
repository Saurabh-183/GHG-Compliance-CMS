export type UserRole = 'ADMIN' | 'CONSULTANT' | 'CLIENT';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  clientGroupId?: string;
  clientGroupIds?: string[];
  clientGroupName?: string;
  authorizedFacilityIds?: string[];
  designation?: string;
  avatarUrl?: string;
  mobileNo?: string;
  managerName?: string;
  capacity?: string;
  mustChangePassword?: boolean;
}

export type ComplianceType = 'RCO' | 'RPO' | 'PAT' | 'CCTS';

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

export type RequestWorkflowStatus =
  | 'DRAFT'
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'PARTIALLY_SUBMITTED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PARTIALLY_ACCEPTED'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CLOSED';

export type RequestFieldType =
  | 'TEXT'
  | 'NUMBER'
  | 'DECIMAL'
  | 'DATE'
  | 'SELECT'
  | 'RADIO'
  | 'CHECKBOX'
  | 'MONTHLY_TABLE'
  | 'LONG_TEXT'
  | 'URL'
  | 'YES_NO'
  | 'FILE_UPLOAD';

export type ReportingFrequency =
  | 'ONE_TIME'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'ANNUAL'
  | 'CUSTOM';

export interface IRequestField {
  id?: string;
  key: string;
  label: string;
  type: RequestFieldType;
  required: boolean;
  options?: string[];
  unit?: string;
  helpText?: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  validationMin?: number;
  validationMax?: number;
}

export interface IRequestDocumentSpec {
  name: string;
  description?: string;
  required: boolean;
  acceptedFileTypes?: string[];
  sampleUrl?: string;
}

export type RequestFieldReviewStatus = 'PENDING' | 'VERIFIED' | 'MISSING' | 'INCORRECT' | 'CLARIFICATION_REQUIRED';

export interface IRequestFieldReview {
  fieldKey: string;
  status: RequestFieldReviewStatus;
  comment?: string;
  reviewedBy?: string;
  reviewedAt?: string | Date;
}

export interface IRequestHistoryEntry {
  status: RequestWorkflowStatus;
  changedAt: string | Date;
  changedBy: string;
  comment?: string;
}

export type ReconciliationResult = 'MATCHED' | 'MISMATCH' | 'EVIDENCE_MISSING';

export interface IClientGroup {
  _id: string;
  name: string;
  code: string;
  industry: string;
  headquarters: string;
  capacity?: string;
  managerName?: string;
  enabledFrameworks?: ComplianceType[];
  contactPerson: {
    name: string;
    email: string;
    phone: string;
  };
  totalFacilitiesCount?: number;
  activeCompliancesCount?: number;
  facilities?: IFacility[];
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
  clientGroupCode?: string;
  location: string;
  category: string;
  assignedConsultantId: string;
  assignedReviewerId: string;
  assignedConsultantName?: string;
  assignedReviewerName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  enabledFrameworks?: ComplianceType[];
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
  authority: string; // BEE, State ERC, Ministry of Power
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
  facilityName?: string;
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

export type DriveLinkMappingStatus = 'PENDING' | 'MAPPED' | 'VERIFIED' | 'REJECTED';

export interface ISubmittedDriveLink {
  url: string;
  submittedAt: string;
  submittedBy: string;
  description: string;

  // Drive Vault information
  /** Original URL pasted by the client */
  sourceUrl?: string;
  /** Canonical link in the compliance vault (may match url after ingest) */
  vaultUrl?: string;
  vaultFolderUrl?: string;
  vaultFolderPath?: string;
  vaultCategory?: string;
  vaultFileId?: string;
  driveFileId?: string;
  driveFolderId?: string;
  vaultTargetFolderId?: string;

  // File information
  fileName?: string;
  ingestionMode?: 'VAULT_INDEXED' | 'DRIVE_API_COPIED' | string;

  // Mapping and verification
  mappingStatus?: DriveLinkMappingStatus | string;
  mappedMonth?: string;
  mappedDatasetId?: string;
  mappedAt?: string;
  mappedBy?: string;
  verificationNotes?: string;

  // Electricity bill information
  billDetails?: {
    invoiceNumber: string;
    billingFrom: string;
    billingTo: string;
    consumptionKwh: number;
    billAmount: number;
  };

  utilityConnectionSnapshot?: {
    providerName: string;
    connectionType: string;
    subDivision: string;
    circle: string;
    consumerAccountNumber: string;
    consumerName: string;
    meterNumber: string;
    contractDemand: string;
  };
}


export interface IDataRequirement {
  _id: string;
  requestId?: string;
  bundleId?: string;
  bundleTitle?: string;
  sourceChecklistItemKey?: string;
  masterRequirementId?: string;
  requirementItemStatus?: RequirementItemWorkflowStatus;
  facilityId: string;
  period: string;
  title: string;
  category: 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC';
  linkedCompliances: ComplianceType[];
  description: string;
  purpose?: string;
  dataCategory?: string;
  templateId?: string;
  reportingFrequency?: ReportingFrequency;
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
  requiredDocumentSpecs?: IRequestDocumentSpec[];
  submissionFormat?: string;
  allowPartialSubmission?: boolean;
  assignedClientContact?: string;
  clientDraftData?: {
    structuredData?: Record<string, unknown>;
    comment?: string;
    updatedAt?: string;
    updatedBy?: string;
  };
  latestStructuredData?: Record<string, unknown>;
  requestedByName?: string;
  facilityName?: string;
  facilityLocation?: string;
  clientGroupName?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  requiredFields?: IRequestField[];
  requiredDocuments?: string[];
  submissionInstructions?: string;
  workflowStatus?: RequestWorkflowStatus;
  fieldReviews?: IRequestFieldReview[];
  history?: IRequestHistoryEntry[];
  submissionVersion?: number;
  submissionHistory?: Array<{
    version: number;
    submittedAt: string;
    submittedBy: string;
    comment?: string;
    driveLinkIndexes: number[];
    structuredData?: Record<string, unknown>;
  }>;
  isApplicable: boolean;
  submissionStatus: SubmissionStatus;
  verificationStatus: VerificationStatus;
  requestedAt?: string;
  dueDate?: string;
  submittedDriveLinks: ISubmittedDriveLink[];
  utilityConnection?: { providerName: string; connectionType: string; subDivision: string; circle: string; consumerAccountNumber: string; consumerName: string; meterNumber: string; contractDemand: string };
  datasetId?: string;
  reviewNote?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  monthlyFrequency?: boolean;
reportingMonths?: string[];
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
  facilityName?: string;
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
  mustChangePassword?: boolean;
}

export type DataChecklistItemStatus =
  | 'DUE'
  | 'RECEIVED'
  | 'NOT_APPLICABLE'
  | 'NOT_REQUIRED'
  | 'NEEDS_VERIFICATION';

export type ChecklistApplicabilityStatus =
  | 'APPLICABLE'
  | 'NOT_APPLICABLE'
  | 'NOT_REQUIRED'
  | 'NEEDS_VERIFICATION'
  | 'UNSELECTED';

export interface IFacilityDataChecklistItem {
  itemKey: string;
  label: string;
  status: DataChecklistItemStatus;
  applicability?: ChecklistApplicabilityStatus;
  importedApplicability?: ChecklistApplicabilityStatus;
  masterRequirementId?: string;
  sourceColumnLabel?: string;
  categoryKey?: string;
  specialInstruction?: string;
  notes?: string;
  sortOrder: number;
}

export interface IMasterRequirementRowPublic {
  requirementId: string;
  itemKey: string;
  name: string;
  sourceColumnLabel: string;
  category: string;
  categoryLabel: string;
  description: string;
  requiredEvidence: string;
  inputType: string;
  reportingFrequency: ReportingFrequency;
  unit?: string;
  mandatory: boolean;
  specialInstructions?: string;
  defaultCompliances?: ComplianceType[];
}

export interface IFacilityApplicableRequirement {
  master: IMasterRequirementRowPublic;
  applicability: ChecklistApplicabilityStatus;
  checklistStatus: DataChecklistItemStatus;
  notes?: string;
  requestable: boolean;
  needsVerification: boolean;
}

export type RequirementItemWorkflowStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'CHANGES_REQUESTED'
  | 'RESUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'NOT_APPLICABLE';

export interface IFacilityDataChecklist {
  _id: string;
  facilityId: string;
  facilityName?: string;
  period: string;
  items: IFacilityDataChecklistItem[];
  sharedWithClient: boolean;
  sharedAt?: string;
  sharedByName?: string;
  lastUpdatedByName?: string;
  consultantNotes?: string;
  createdAt: string;
  updatedAt: string;
}
