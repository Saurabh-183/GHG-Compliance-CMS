import mongoose, { Schema, Model, Document } from 'mongoose';
import { ComplianceType } from '@/types';

export interface IClientGroupDocument extends Document {
  name: string;
  code: string;
  industry: string;
  headquarters: string;
  capacity?: string;
  managerName?: string;
  enabledFrameworks?: ComplianceType[];
  contactPerson: {
    name: string;
    email: string;
    phone: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ClientGroupSchema = new Schema<IClientGroupDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    industry: { type: String, required: true },
    headquarters: { type: String, required: true },
    capacity: { type: String, trim: true },
    managerName: { type: String, trim: true },
    enabledFrameworks: {
      type: [{ type: String, enum: ['RCO', 'RPO', 'PAT', 'CCTS'] }],
      default: ['RCO', 'RPO', 'PAT', 'CCTS'],
    },
    contactPerson: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export const ClientGroupModel: Model<IClientGroupDocument> =
  mongoose.models.ClientGroup || mongoose.model<IClientGroupDocument>('ClientGroup', ClientGroupSchema);
