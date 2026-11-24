
import mongoose, { Schema, Model, Document } from 'mongoose';

export type RegulatorySubmissionStatus =
  | 'REQUESTED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'RETURNED'
  | 'VERIFIED'
  | 'APPROVED';

export interface IRegulatorySubmissionDocument extends Document {
  assessmentId: mongoose.Types.ObjectId;
  facilityId: string;
  framework: 'RCO' | 'PAT' | 'CCTS';
  templateId: string;
  period: string;
  status: RegulatorySubmissionStatus;

  values: Record<string, unknown>;
  fieldReviews: Array<Record<string, unknown>>;
  evidence: Array<Record<string, unknown>>;
  auditTrail: Array<Record<string, unknown>>;

  version: number;

  requestedAt?: Date;
  requestedBy?: string;
  requestedByName?: string;
  requestMessage?: string;
  submittedAt?: Date;
  submittedBy?: string;
  approvedAt?: Date;
  approvedBy?: string;

  createdAt: Date;
  updatedAt: Date;
}

const RegulatorySubmissionSchema =
  new Schema<IRegulatorySubmissionDocument>(
    {
      assessmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Assessment',
        required: true,
        index: true,
      },

      facilityId: {
        type: String,
        required: true,
        uppercase: true,
        index: true,
      },

      framework: {
        type: String,
        enum: ['RCO', 'PAT', 'CCTS'],
        required: true,
      },

      templateId: {
        type: String,
        required: true,
      },

      period: {
        type: String,
        required: true,
      },

      status: {
        type: String,
        enum: [
          'REQUESTED',
          'DRAFT',
          'SUBMITTED',
          'UNDER_REVIEW',
          'RETURNED',
          'VERIFIED',
          'APPROVED',
        ],
        default: 'DRAFT',
        index: true,
      },

      values: {
        type: Schema.Types.Mixed,
        default: {},
      },

      // Store the complete array as Mixed.
      fieldReviews: {
        type: Schema.Types.Mixed,
        default: [],
      },

      evidence: {
        type: Schema.Types.Mixed,
        default: [],
      },

      auditTrail: {
        type: Schema.Types.Mixed,
        default: [],
      },

      version: {
        type: Number,
        default: 1,
      },

      requestedAt: { type: Date },
      requestedBy: { type: String },
      requestedByName: { type: String },
      requestMessage: { type: String, default: '' },
      submittedAt: { type: Date },

      submittedBy: {
        type: String,
      },

      approvedAt: {
        type: Date,
      },

      approvedBy: {
        type: String,
      },
    },
    {
      timestamps: true,
    }
  );

// Prevent duplicate submissions for the same assessment and template.
RegulatorySubmissionSchema.index(
  { assessmentId: 1, templateId: 1 },
  { unique: true }
);

export const RegulatorySubmissionModel: Model<IRegulatorySubmissionDocument> =
  mongoose.models.RegulatorySubmission ||
  mongoose.model<IRegulatorySubmissionDocument>(
    'RegulatorySubmission',
    RegulatorySubmissionSchema
  );
