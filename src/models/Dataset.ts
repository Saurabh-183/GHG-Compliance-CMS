import mongoose, { Schema, Model, Document } from 'mongoose';
import { IMonthlyRecord, SubmissionStatus, VerificationStatus } from '@/types';

export interface IDatasetDocument extends Document {
  facilityId: string;
  datasetType: 'GRID_ELECTRICITY' | 'RENEWABLE_PURCHASE' | 'FUEL_CONSUMPTION' | 'PRODUCTION';
  period: string;
  dataRequirementId?: mongoose.Types.ObjectId;
  months: IMonthlyRecord[];
  submissionStatus: SubmissionStatus;
  verificationStatus: VerificationStatus;
  toleranceDefault: number;
  consultantSubmission?: {
    consultantId: mongoose.Types.ObjectId;
    consultantName: string;
    submittedAt: Date;
    summary: string;
  };
  reviewerApproval?: {
    reviewerId: mongoose.Types.ObjectId;
    reviewerName: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    reviewedAt: Date;
    comments: string;
    isLocked: boolean;
    version: number;
  };
  auditTrail: Array<{
    timestamp: Date;
    userId: string;
    userName: string;
    action: string;
    details: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const MonthlyRecordSchema = new Schema(
  {
    month: { type: String, required: true },
    declaredValue: { type: Number, required: true },
    evidenceValue: { type: Number, default: null },
    unit: { type: String, required: true, default: 'kWh' },
    tolerance: { type: Number, default: 0 },
    variance: { type: Number, default: 0 },
    variancePercentage: { type: Number, default: 0 },
    result: {
      type: String,
      enum: ['MATCHED', 'MISMATCH', 'EVIDENCE_MISSING'],
      default: 'EVIDENCE_MISSING',
    },
    consumerNumber: { type: String },
    meterNumber: { type: String },
    billingPeriod: { type: String },
    sourceDocumentUrl: { type: String },
    evidenceDocumentUrl: { type: String },
    consultantNotes: { type: String },
    clarificationId: { type: Schema.Types.ObjectId, ref: 'Clarification' },
  },
  { _id: false }
);

const DatasetSchema = new Schema<IDatasetDocument>(
  {
    facilityId: { type: String, required: true, uppercase: true, trim: true, index: true },
    datasetType: {
      type: String,
      enum: ['GRID_ELECTRICITY', 'RENEWABLE_PURCHASE', 'FUEL_CONSUMPTION', 'PRODUCTION'],
      required: true,
      default: 'GRID_ELECTRICITY',
    },
    period: { type: String, required: true, trim: true },
    dataRequirementId: { type: Schema.Types.ObjectId, ref: 'DataRequirement' },
    months: [MonthlyRecordSchema],
    submissionStatus: {
      type: String,
      enum: ['NOT_REQUESTED', 'REQUESTED', 'PARTIALLY_RECEIVED', 'RECEIVED'],
      default: 'RECEIVED',
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
      default: 'UNDER_REVIEW',
    },
    toleranceDefault: { type: Number, default: 0 },
    consultantSubmission: {
      consultantId: { type: Schema.Types.ObjectId, ref: 'User' },
      consultantName: { type: String },
      submittedAt: { type: Date },
      summary: { type: String },
    },
    reviewerApproval: {
      reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
      reviewerName: { type: String },
      status: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING',
      },
      reviewedAt: { type: Date },
      comments: { type: String },
      isLocked: { type: Boolean, default: false },
      version: { type: Number, default: 1 },
    },
    auditTrail: [
      {
        timestamp: { type: Date, default: Date.now },
        userId: { type: String, required: true },
        userName: { type: String, required: true },
        action: { type: String, required: true },
        details: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

export const DatasetModel: Model<IDatasetDocument> =
  mongoose.models.Dataset || mongoose.model<IDatasetDocument>('Dataset', DatasetSchema);
