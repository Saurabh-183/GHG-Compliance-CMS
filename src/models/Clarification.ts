import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IClarificationDocument extends Document {
  facilityId: string;
  datasetId: mongoose.Types.ObjectId;
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
    respondedAt: Date;
    respondedBy?: string;
  };
  raisedBy: mongoose.Types.ObjectId;
  raisedByName?: string;
  raisedAt: Date;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClarificationSchema = new Schema<IClarificationDocument>(
  {
    facilityId: { type: String, required: true, uppercase: true, trim: true, index: true },
    datasetId: { type: Schema.Types.ObjectId, ref: 'Dataset', required: true },
    month: { type: String, required: true },
    parameter: { type: String, required: true, default: 'Grid Electricity Consumption' },
    declaredValue: { type: Number, required: true },
    evidenceValue: { type: Number, required: true },
    variance: { type: Number, required: true },
    variancePercentage: { type: Number, required: true },
    comment: { type: String, required: true },
    supportingLink: { type: String, required: true },
    status: {
      type: String,
      enum: ['OPEN', 'CLIENT_RESPONDED', 'RESOLVED'],
      default: 'OPEN',
    },
    emailDraft: { type: String, required: true },
    clientResponse: {
      responseText: { type: String },
      revisedDriveLink: { type: String },
      respondedAt: { type: Date },
      respondedBy: { type: String },
    },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    raisedByName: { type: String },
    raisedAt: { type: Date, default: Date.now },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const ClarificationModel: Model<IClarificationDocument> =
  mongoose.models.Clarification ||
  mongoose.model<IClarificationDocument>('Clarification', ClarificationSchema);
