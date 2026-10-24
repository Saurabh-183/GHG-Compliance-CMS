import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IFacilityDocument extends Document {
  facilityId: string; // Unique business code e.g. TRIDENT_PAPER
  name: string;
  clientGroupId: mongoose.Types.ObjectId;
  location: string;
  category: string;
  assignedConsultantId?: mongoose.Types.ObjectId;
  assignedReviewerId?: mongoose.Types.ObjectId;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

const FacilitySchema = new Schema<IFacilityDocument>(
  {
    facilityId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    clientGroupId: { type: Schema.Types.ObjectId, ref: 'ClientGroup', required: true },
    location: { type: String, required: true },
    category: { type: String, required: true },
    assignedConsultantId: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedReviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

export const FacilityModel: Model<IFacilityDocument> =
  mongoose.models.Facility || mongoose.model<IFacilityDocument>('Facility', FacilitySchema);
