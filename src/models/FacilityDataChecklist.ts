import mongoose, { Schema, Model, Document } from 'mongoose';
import type { DataChecklistItemStatus } from '@/types';

export interface IFacilityDataChecklistDocument extends Document {
  facilityId: string;
  facilityName?: string;
  period: string;
  items: Array<{
    itemKey: string;
    label: string;
    status: DataChecklistItemStatus;
    notes?: string;
    sortOrder: number;
  }>;
  sharedWithClient: boolean;
  sharedAt?: Date;
  sharedByName?: string;
  lastUpdatedByName?: string;
  consultantNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FacilityDataChecklistSchema = new Schema<IFacilityDataChecklistDocument>(
  {
    facilityId: { type: String, required: true, uppercase: true, trim: true, index: true },
    facilityName: { type: String },
    period: { type: String, required: true, trim: true, default: 'FY2025-26' },
    items: [
      {
        itemKey: { type: String, required: true },
        label: { type: String, required: true },
        status: {
          type: String,
          enum: ['DUE', 'RECEIVED', 'NOT_APPLICABLE', 'NOT_REQUIRED', 'NEEDS_VERIFICATION'],
          default: 'DUE',
        },
        applicability: {
          type: String,
          enum: ['APPLICABLE', 'NOT_APPLICABLE', 'NOT_REQUIRED', 'NEEDS_VERIFICATION', 'UNSELECTED'],
        },
        importedApplicability: {
          type: String,
          enum: ['APPLICABLE', 'NOT_APPLICABLE', 'NOT_REQUIRED', 'NEEDS_VERIFICATION', 'UNSELECTED'],
        },
        masterRequirementId: { type: String },
        sourceColumnLabel: { type: String },
        categoryKey: { type: String },
        specialInstruction: { type: String },
        notes: { type: String, default: '' },
        sortOrder: { type: Number, default: 0 },
      },
    ],
    sharedWithClient: { type: Boolean, default: false },
    sharedAt: { type: Date },
    sharedByName: { type: String },
    lastUpdatedByName: { type: String },
    consultantNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

FacilityDataChecklistSchema.index({ facilityId: 1, period: 1 }, { unique: true });

export const FacilityDataChecklistModel: Model<IFacilityDataChecklistDocument> =
  mongoose.models.FacilityDataChecklist ||
  mongoose.model<IFacilityDataChecklistDocument>(
    'FacilityDataChecklist',
    FacilityDataChecklistSchema
  );