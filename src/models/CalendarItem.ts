import mongoose, { Schema, Model, Document } from 'mongoose';
import { ComplianceType } from '@/types';

export interface ICalendarItemDocument extends Document {
  facilityId: string;
  complianceType: ComplianceType;
  reportingPeriod: string;
  regulatoryDueDate: Date;
  internalDeadline: Date;
  clientDataSubmissionDeadline: Date;
  assignedConsultantId?: mongoose.Types.ObjectId;
  status: 'UPCOMING' | 'PENDING' | 'COMPLETED' | 'OVERDUE' | 'EXTENDED';
  actualSubmissionDate?: Date | null;
  extensionHistory: Array<{
    oldDate: Date;
    newDate: Date;
    reason: string;
    notificationRef: string;
    revisedAt: Date;
  }>;
  isRecurringCEA: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExtensionHistorySchema = new Schema(
  {
    oldDate: { type: Date, required: true },
    newDate: { type: Date, required: true },
    reason: { type: String, required: true },
    notificationRef: { type: String, required: true },
    revisedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CalendarItemSchema = new Schema<ICalendarItemDocument>(
  {
    facilityId: { type: String, required: true, uppercase: true, trim: true, index: true },
    complianceType: {
      type: String,
      enum: ['RCO', 'PAT', 'CCTS', 'CEA'],
      required: true,
    },
    reportingPeriod: { type: String, required: true },
    regulatoryDueDate: { type: Date, required: true },
    internalDeadline: { type: Date, required: true },
    clientDataSubmissionDeadline: { type: Date, required: true },
    assignedConsultantId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['UPCOMING', 'PENDING', 'COMPLETED', 'OVERDUE', 'EXTENDED'],
      default: 'PENDING',
    },
    actualSubmissionDate: { type: Date, default: null },
    extensionHistory: [ExtensionHistorySchema],
    isRecurringCEA: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CalendarItemModel: Model<ICalendarItemDocument> =
  mongoose.models.CalendarItem ||
  mongoose.model<ICalendarItemDocument>('CalendarItem', CalendarItemSchema);
