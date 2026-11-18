import mongoose, { Schema, Model, Document } from 'mongoose';
import { ComplianceType, SubmissionStatus, VerificationStatus } from '@/types';

export interface IDataRequirementDocument extends Document {
  facilityId: string;
  period: string;
  title: string;
  category: 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC';
  linkedCompliances: ComplianceType[];
  description: string;
  isApplicable: boolean;
  submissionStatus: SubmissionStatus;
  verificationStatus: VerificationStatus;
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
    ingestionMode?: 'VAULT_INDEXED' | 'DRIVE_API_COPIED';
  }>;
  datasetId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DataRequirementSchema = new Schema<IDataRequirementDocument>(
  {
    facilityId: { type: String, required: true, uppercase: true, trim: true, index: true },
    period: { type: String, required: true, trim: true },
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
        ingestionMode: { type: String, enum: ['VAULT_INDEXED', 'DRIVE_API_COPIED'] },
      },
    ],
    datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset' },
  },
  { timestamps: true }
);

export const DataRequirementModel: Model<IDataRequirementDocument> =
  mongoose.models.DataRequirement ||
  mongoose.model<IDataRequirementDocument>('DataRequirement', DataRequirementSchema);
