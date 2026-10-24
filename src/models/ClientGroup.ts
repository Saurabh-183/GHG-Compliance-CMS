import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IClientGroupDocument extends Document {
  name: string;
  code: string;
  industry: string;
  headquarters: string;
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
