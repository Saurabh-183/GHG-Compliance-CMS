import mongoose, { Schema, Model, Document } from 'mongoose';
import { UserRole } from '@/types';

export interface IUserDocument extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  clientGroupId?: mongoose.Types.ObjectId;
  authorizedFacilityIds?: string[];
  designation?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'CONSULTANT', 'CLIENT'],
      required: true,
      default: 'CONSULTANT',
    },
    clientGroupId: { type: Schema.Types.ObjectId, ref: 'ClientGroup' },
    authorizedFacilityIds: [{ type: String }],
    designation: { type: String },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
