import mongoose, { Schema, Model, Document } from 'mongoose';
import { UserRole } from '@/types';

export type UserStatus = 'ACTIVE' | 'DISABLED' | 'LOCKED';
export interface IUserDocument extends Document {
  name: string; email: string; passwordHash: string; role: UserRole;
  status?: UserStatus; mustChangePassword?: boolean; passwordChangedAt?: Date;
  clientGroupId?: mongoose.Types.ObjectId; clientGroupIds?: mongoose.Types.ObjectId[]; authorizedFacilityIds?: string[];
  designation?: string; avatarUrl?: string;
  mobileNo?: string; managerName?: string; capacity?: string;
  createdAt: Date; updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: true },
  role: { type: String, enum: ['ADMIN', 'CONSULTANT', 'CLIENT'], required: true },
  status: { type: String, enum: ['ACTIVE', 'DISABLED', 'LOCKED'], default: 'ACTIVE', index: true },
  mustChangePassword: { type: Boolean, default: false },
  passwordChangedAt: { type: Date },
  clientGroupId: { type: Schema.Types.ObjectId, ref: 'ClientGroup' },
  clientGroupIds: { type: [{ type: Schema.Types.ObjectId, ref: 'ClientGroup' }], default: [] },
  authorizedFacilityIds: { type: [{ type: String, uppercase: true, trim: true }], default: [] },
  designation: { type: String, trim: true }, avatarUrl: { type: String },
  mobileNo: { type: String, trim: true },
  managerName: { type: String, trim: true },
  capacity: { type: String, trim: true },
}, { timestamps: true });

export const UserModel: Model<IUserDocument> = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
