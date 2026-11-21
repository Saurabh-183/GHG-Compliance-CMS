import mongoose, { Schema, Model, Document } from 'mongoose';
import { CHECKLIST_MASTER_VERSION } from '@/lib/dataRequirementMaster';

export interface IChecklistMasterVersionDocument extends Document {
  versionId: string;
  label: string;
  sourceDocument?: string;
  itemCount: number;
  publishedAt?: Date;
  publishedByName?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistMasterVersionSchema = new Schema<IChecklistMasterVersionDocument>(
  {
    versionId: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true },
    sourceDocument: { type: String, trim: true },
    itemCount: { type: Number, default: 32 },
    publishedAt: { type: Date },
    publishedByName: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export const ChecklistMasterVersionModel: Model<IChecklistMasterVersionDocument> =
  mongoose.models.ChecklistMasterVersion ||
  mongoose.model<IChecklistMasterVersionDocument>('ChecklistMasterVersion', ChecklistMasterVersionSchema);

export async function ensureDefaultMasterVersion(): Promise<void> {
  await ChecklistMasterVersionModel.updateOne(
    { versionId: CHECKLIST_MASTER_VERSION },
    {
      $setOnInsert: {
        versionId: CHECKLIST_MASTER_VERSION,
        label: 'All Clients Data Checklist (imported)',
        sourceDocument: 'Data-Checklist-All-Clients - Google Sheets (1).pdf',
        itemCount: 32,
        publishedAt: new Date(),
      },
    },
    { upsert: true }
  );
}