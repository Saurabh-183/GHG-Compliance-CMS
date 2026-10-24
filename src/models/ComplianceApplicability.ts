import mongoose, { Schema, Model, Document } from 'mongoose';
import { ComplianceOutcome, ComplianceType, WorkflowStatus } from '@/types';

export interface IComplianceApplicabilityDocument extends Document {
  facilityId: string;
  complianceType: ComplianceType;
  period: string;
  isApplicable: boolean;
  authority: string;
  ministry?: string;
  notificationReference?: string;
  targetValue: number | null;
  targetUnit: string;
  targetMethodology?: string;
  deadline: Date | null;
  assignedConsultantId?: mongoose.Types.ObjectId;
  assignedReviewerId?: mongoose.Types.ObjectId;
  workflowStatus: WorkflowStatus;
  complianceOutcome: ComplianceOutcome;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceApplicabilitySchema = new Schema<IComplianceApplicabilityDocument>(
  {
    facilityId: { type: String, required: true, uppercase: true, trim: true, index: true },
    complianceType: {
      type: String,
      enum: ['RCO', 'PAT', 'CCTS', 'CEA'],
      required: true,
    },
    period: { type: String, required: true, trim: true },
    isApplicable: { type: Boolean, required: true, default: true },
    authority: { type: String, required: true, default: 'BEE' },
    ministry: { type: String, default: 'Ministry of Power' },
    notificationReference: { type: String },
    targetValue: { type: Number, default: null },
    targetUnit: { type: String, default: '%' },
    targetMethodology: { type: String },
    deadline: { type: Date, default: null },
    assignedConsultantId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedReviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
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
    notes: { type: String },
  },
  { timestamps: true }
);

ComplianceApplicabilitySchema.index({ facilityId: 1, complianceType: 1, period: 1 }, { unique: true });

export const ComplianceApplicabilityModel: Model<IComplianceApplicabilityDocument> =
  mongoose.models.ComplianceApplicability ||
  mongoose.model<IComplianceApplicabilityDocument>('ComplianceApplicability', ComplianceApplicabilitySchema);
