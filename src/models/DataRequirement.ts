import mongoose, { Schema, Model, Document } from 'mongoose';
import { ComplianceType, SubmissionStatus, VerificationStatus, RequestWorkflowStatus, IRequestField, IRequestFieldReview, IRequestHistoryEntry } from '@/types';

export interface IDataRequirementDocument extends Document {
  facilityId: string;
  requestId?: string;
  bundleId?: string;
  bundleTitle?: string;
  masterRequirementId?: string;
  requirementItemStatus?: string;
  period: string;
  sourceChecklistItemKey?: string;
  requestedBy?: string;
  requestedByName?: string;
  monthlyFrequency?: boolean;
  reportingMonths?: string[];
  title: string;
  category: 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC';
  linkedCompliances: ComplianceType[];
  description: string;
  purpose?: string;
  dataCategory?: string;
  templateId?: string;
  reportingFrequency?: string;
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
  requiredDocumentSpecs?: Array<{
    name: string;
    description?: string;
    required: boolean;
    acceptedFileTypes?: string[];
    sampleUrl?: string;
  }>;
  submissionFormat?: string;
  allowPartialSubmission?: boolean;
  assignedClientContact?: string;
  clientDraftData?: {
    structuredData?: Record<string, unknown>;
    comment?: string;
    updatedAt?: Date;
    updatedBy?: string;
  };
  latestStructuredData?: Record<string, unknown>;
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
    submittedAt: Date;
    submittedBy: string;
    comment?: string;
    driveLinkIndexes: number[];
    structuredData?: Record<string, unknown>;
  }>;
  isApplicable: boolean;
  submissionStatus: SubmissionStatus;
  verificationStatus: VerificationStatus;
  reviewNote?: string;
  reviewedByName?: string;
  reviewedAt?: Date;
  requestedAt?: Date;
  dueDate?: Date;
  submittedDriveLinks: Array<{
    url: string;
    submittedAt: Date;
    submittedBy: string;
    description: string;
    sourceUrl?: string;
    vaultUrl?: string;
    vaultFolderUrl?: string;
    vaultFolderPath?: string;
    vaultCategory?: string;
    driveFileId?: string;
    driveFolderId?: string;
    vaultFileId?: string;
    vaultTargetFolderId?: string;
    fileName?: string;
    mappingStatus?: 'PENDING' | 'MAPPED' | 'VERIFIED' | 'REJECTED';
    mappedMonth?: string;
    mappedDatasetId?: mongoose.Types.ObjectId;
    mappedAt?: Date;
    mappedBy?: string;
    verificationNotes?: string;
    ingestionMode?: 'VAULT_INDEXED' | 'DRIVE_API_COPIED' | 'LOCAL_VAULT_DEV';
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
  }>;
  datasetId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DataRequirementSchema = new Schema<IDataRequirementDocument>(
  {
    facilityId: { type: String, required: true, uppercase: true, trim: true, index: true },
    requestId: { type: String, unique: true, sparse: true, index: true },
    bundleId: { type: String, trim: true, index: true },
    bundleTitle: { type: String, trim: true },
    masterRequirementId: { type: String, trim: true, index: true },
    requirementItemStatus: {
      type: String,
      enum: [
        'PENDING',
        'IN_PROGRESS',
        'SUBMITTED',
        'UNDER_REVIEW',
        'CHANGES_REQUESTED',
        'RESUBMITTED',
        'ACCEPTED',
        'REJECTED',
        'NOT_APPLICABLE',
      ],
      default: 'PENDING',
    },
    period: { type: String, required: true, trim: true },
    sourceChecklistItemKey: { type: String, trim: true },
    requestedBy: { type: String },
    requestedByName: { type: String },
    monthlyFrequency: { type: Boolean, default: false },
    reportingMonths: [{ type: String }],
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ['COMMON_ENERGY', 'COMPLIANCE_SPECIFIC'],
      required: true,
      default: 'COMMON_ENERGY',
    },
    linkedCompliances: [
      {
        type: String,
        enum: ['RCO', 'PAT', 'CCTS', 'CEA'],
      },
    ],
    description: { type: String, required: true },
    purpose: { type: String, trim: true },
    dataCategory: { type: String, trim: true, index: true },
    templateId: { type: String, trim: true },
    reportingFrequency: {
      type: String,
      enum: ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'CUSTOM'],
    },
    reportingPeriodStart: { type: String, trim: true },
    reportingPeriodEnd: { type: String, trim: true },
    requiredDocumentSpecs: [{
      name: { type: String, required: true },
      description: String,
      required: { type: Boolean, default: true },
      acceptedFileTypes: [String],
      sampleUrl: String,
    }],
    submissionFormat: { type: String, trim: true },
    allowPartialSubmission: { type: Boolean, default: true },
    assignedClientContact: { type: String, trim: true },
    clientDraftData: {
      structuredData: { type: Schema.Types.Mixed },
      comment: String,
      updatedAt: Date,
      updatedBy: String,
    },
    latestStructuredData: { type: Schema.Types.Mixed },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
    requiredFields: [{
      key: { type: String, required: true }, label: { type: String, required: true },
      type: {
        type: String,
        enum: ['TEXT', 'NUMBER', 'DECIMAL', 'DATE', 'SELECT', 'RADIO', 'CHECKBOX', 'MONTHLY_TABLE', 'LONG_TEXT', 'URL', 'YES_NO', 'FILE_UPLOAD'],
        required: true,
      },
      required: { type: Boolean, default: false },
      options: [String],
      unit: String,
      helpText: String,
      placeholder: String,
      defaultValue: { type: Schema.Types.Mixed },
      validationMin: Number,
      validationMax: Number,
    }],
    requiredDocuments: [{ type: String, trim: true }],
    submissionInstructions: { type: String, trim: true },
    workflowStatus: {
      type: String,
      enum: [
        'DRAFT',
        'REQUESTED',
        'IN_PROGRESS',
        'PARTIALLY_SUBMITTED',
        'SUBMITTED',
        'UNDER_REVIEW',
        'PARTIALLY_ACCEPTED',
        'CHANGES_REQUESTED',
        'RESUBMITTED',
        'ACCEPTED',
        'REJECTED',
        'CLOSED',
      ],
      default: 'REQUESTED',
    },
    fieldReviews: [{
      fieldKey: { type: String, required: true }, status: { type: String, enum: ['PENDING', 'VERIFIED', 'MISSING', 'INCORRECT', 'CLARIFICATION_REQUIRED'], default: 'PENDING' },
      comment: String, reviewedBy: String, reviewedAt: Date,
    }],
    history: [{
      status: {
        type: String,
        enum: [
          'DRAFT',
          'REQUESTED',
          'IN_PROGRESS',
          'PARTIALLY_SUBMITTED',
          'SUBMITTED',
          'UNDER_REVIEW',
          'PARTIALLY_ACCEPTED',
          'CHANGES_REQUESTED',
          'RESUBMITTED',
          'ACCEPTED',
          'REJECTED',
          'CLOSED',
        ],
      },
      changedAt: Date,
      changedBy: String,
      comment: String,
    }],
    submissionVersion: { type: Number, default: 0 },
    submissionHistory: [{
      version: { type: Number, required: true }, submittedAt: { type: Date, default: Date.now }, submittedBy: String,
      comment: String, driveLinkIndexes: [Number], structuredData: { type: Schema.Types.Mixed },
    }],
    isApplicable: { type: Boolean, default: true },
    submissionStatus: {
      type: String,
      enum: ['NOT_REQUESTED', 'REQUESTED', 'PARTIALLY_RECEIVED', 'RECEIVED'],
      default: 'NOT_REQUESTED',
    },
    verificationStatus: {
      type: String,
      enum: [
        'NOT_STARTED',
        'EVIDENCE_PENDING',
        'UNDER_REVIEW',
        'CLARIFICATION_REQUIRED',
        'AWAITING_APPROVAL',
        'APPROVED',
        'REJECTED',
      ],
      default: 'NOT_STARTED',
    },
    reviewNote: { type: String, trim: true },
    reviewedByName: { type: String, trim: true },
    reviewedAt: { type: Date },
    requestedAt: { type: Date },
    dueDate: { type: Date },
    submittedDriveLinks: [
      {
        url: { type: String, required: true },
        submittedAt: { type: Date, default: Date.now },
        submittedBy: { type: String, required: true },
        description: { type: String, default: '' },
        sourceUrl: { type: String },
        vaultUrl: { type: String },
        vaultFolderUrl: { type: String },
        vaultFolderPath: { type: String },
        vaultCategory: { type: String },
        driveFileId: { type: String },
        driveFolderId: { type: String },
        vaultFileId: { type: String },
        vaultTargetFolderId: { type: String },
        fileName: { type: String },
        mappingStatus: {
          type: String,
          enum: ['PENDING', 'MAPPED', 'VERIFIED', 'REJECTED'],
          default: 'PENDING',
        },
        mappedMonth: { type: String },
        mappedDatasetId: { type: Schema.Types.ObjectId, ref: 'Dataset' },
        mappedAt: { type: Date },
        mappedBy: { type: String },
        verificationNotes: { type: String },
        ingestionMode: { type: String, enum: ['VAULT_INDEXED', 'DRIVE_API_COPIED', 'LOCAL_VAULT_DEV'] },
        utilityConnectionSnapshot: {
          providerName: String,
          connectionType: String,
          subDivision: String,
          circle: String,
          consumerAccountNumber: String,
          consumerName: String,
          meterNumber: String,
          contractDemand: String,
        },
        billDetails: {
          invoiceNumber: { type: String, default: '' },
          billingFrom: { type: String, default: '' },
          billingTo: { type: String, default: '' },
          consumptionKwh: { type: Number, default: null },
          billAmount: { type: Number, default: null },
        },
      },
    ],
    datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset' },
  },
  { timestamps: true }
);

DataRequirementSchema.index(
  { facilityId: 1, period: 1, sourceChecklistItemKey: 1 },
  { unique: true, sparse: true }
);

export const DataRequirementModel: Model<IDataRequirementDocument> =
  mongoose.models.DataRequirement ||
  mongoose.model<IDataRequirementDocument>('DataRequirement', DataRequirementSchema);
