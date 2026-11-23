import mongoose, { Document, Model, Schema } from 'mongoose';

export type DriveMappingType = 'UNMAPPED' | 'CLIENT_GROUP' | 'FACILITY' | 'FINANCIAL_YEAR' | 'CATEGORY';

export interface IDriveItemDocument extends Document {
  driveId: string;
  name: string;
  mimeType: string;
  parentDriveId?: string;
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  modifiedTime?: Date;
  createdTime?: Date;
  trashed: boolean;
  pathNames: string[];
  pathDriveIds: string[];
  isFolder: boolean;
  mappingType: DriveMappingType;
  clientGroupId?: string;
  facilityId?: string;
  financialYear?: string;
  category?: string;
  mappingConfidence?: 'MANUAL' | 'INFERRED' | 'NONE';
  mappingHistory?: Array<{ mappedBy: string; mappedByName: string; mappedAt: Date; mappingType: DriveMappingType; value: string }>;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DriveItemSchema = new Schema<IDriveItemDocument>({
  driveId: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  mimeType: { type: String, required: true },
  parentDriveId: { type: String, index: true },
  webViewLink: String,
  webContentLink: String,
  size: String,
  modifiedTime: Date,
  createdTime: Date,
  trashed: { type: Boolean, default: false, index: true },
  pathNames: { type: [String], default: [] },
  pathDriveIds: { type: [String], default: [] },
  isFolder: { type: Boolean, default: false, index: true },
  mappingType: {
    type: String,
    enum: ['UNMAPPED', 'CLIENT_GROUP', 'FACILITY', 'FINANCIAL_YEAR', 'CATEGORY'],
    default: 'UNMAPPED',
    index: true,
  },
  clientGroupId: { type: String, index: true },
  facilityId: { type: String, index: true },
  financialYear: { type: String, index: true },
  category: String,
  mappingConfidence: { type: String, enum: ['MANUAL', 'INFERRED', 'NONE'], default: 'NONE' },
  mappingHistory: [{
    mappedBy: { type: String, required: true },
    mappedByName: { type: String, required: true },
    mappedAt: { type: Date, default: Date.now },
    mappingType: { type: String, enum: ['UNMAPPED', 'CLIENT_GROUP', 'FACILITY', 'FINANCIAL_YEAR', 'CATEGORY'], required: true },
    value: { type: String, required: true },
  }],
  lastSeenAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

DriveItemSchema.index({ parentDriveId: 1, name: 1 });
DriveItemSchema.index({ facilityId: 1, financialYear: 1, isFolder: 1 });

export const DriveItemModel: Model<IDriveItemDocument> =
  mongoose.models.DriveItem || mongoose.model<IDriveItemDocument>('DriveItem', DriveItemSchema);
