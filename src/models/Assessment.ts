import mongoose, { Schema, Model, Document } from 'mongoose';
import { ComplianceOutcome, ComplianceType, IMetricValue, WorkflowStatus } from '@/types';

export interface IAssessmentDocument extends Document {
  facilityId: string;
  complianceType: ComplianceType;
  period: string;
  workflowStatus: WorkflowStatus;
  complianceOutcome: ComplianceOutcome;
  isHistorical: boolean;
  metrics: IMetricValue[];
  documentLinks: {
    finalReportUrl?: string;
    submissionAckUrl?: string;
    calculationWorkbookUrl?: string;
    evidenceFolderUrl?: string;
  };
  version: number;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  assignedConsultantId?: mongoose.Types.ObjectId;
  assignedReviewerId?: mongoose.Types.ObjectId;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MetricValueSchema = new Schema(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    unit: { type: String, required: true },
    period: { type: String, required: true },
    source: { type: String, required: true, default: 'Internal Calculation' },
    sourceUrl: { type: String },
    isProvisional: { type: Boolean, default: false },
    approvalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      default: 'PENDING',
    },
    version: { type: Number, default: 1 },
  },
  { _id: false }
);

const AssessmentSchema = new Schema<IAssessmentDocument>(
  {
    facilityId: { type: String, required: true, uppercase: true, trim: true, index: true },
    complianceType: {
      type: String,
      enum: ['RCO', 'PAT', 'CCTS', 'CEA'],
      required: true,
    },
    period: { type: String, required: true, trim: true },
    workflowStatus: {
      type: String,
      enum: ['NOT_STARTED', 'DATA_COLLECTION', 'UNDER_REVIEW', 'APPROVED', 'SUBMITTED'],
      default: 'NOT_STARTED',
    },
    complianceOutcome: {
      type: String,
      enum: ['COMPLIANT', 'SHORTFALL', 'SURPLUS', 'PENDING_DETERMINATION', 'NOT_APPLICABLE'],
      default: 'PENDING_DETERMINATION',
    },
    isHistorical: { type: Boolean, default: false },
    metrics: [MetricValueSchema],
    documentLinks: {
      finalReportUrl: { type: String },
      submissionAckUrl: { type: String },
      calculationWorkbookUrl: { type: String },
      evidenceFolderUrl: { type: String },
    },
    version: { type: Number, default: 1 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    assignedConsultantId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedReviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
  },
  { timestamps: true }
);

AssessmentSchema.index({ facilityId: 1, complianceType: 1, period: 1 }, { unique: true });

export const AssessmentModel: Model<IAssessmentDocument> =
  mongoose.models.Assessment || mongoose.model<IAssessmentDocument>('Assessment', AssessmentSchema);
