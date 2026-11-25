import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'CLARIFICATION_RAISED'
  | 'CLARIFICATION_RESPONDED'
  | 'EVIDENCE_SUBMITTED'
  | 'REVIEW_REQUESTED'
  | 'DATASET_APPROVED'
  | 'DATASET_REJECTED'
  | 'DEADLINE_EXTENDED'
  | 'DATA_CHECKLIST_SHARED'
  | 'DEADLINE_REMINDER'
  | 'REGULATORY_DATA_REQUESTED'
  | 'REGULATORY_SUBMITTED'
  | 'REGULATORY_APPROVED'
  | 'REGULATORY_RETURNED'
  | 'USER_CREATED'
  | 'FACILITY_CREATED';

export interface INotification extends Document {
  recipientRole: 'CONSULTANT' | 'CLIENT' | 'ADMIN' | 'ALL';
  recipientUserId?: string;
  senderRole: 'CONSULTANT' | 'CLIENT' | 'ADMIN' | 'SYSTEM';
  senderName: string;
  type: NotificationType;
  title: string;
  message: string;
  facilityId?: string;
  linkUrl: string;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipientRole: {
      type: String,
      required: true,
      enum: ['CONSULTANT', 'CLIENT', 'ADMIN', 'ALL'],
    },
    recipientUserId: { type: String },
    senderRole: {
      type: String,
      required: true,
      enum: ['CONSULTANT', 'CLIENT', 'ADMIN', 'SYSTEM'],
    },
    senderName: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
        'CLARIFICATION_RAISED',
        'CLARIFICATION_RESPONDED',
        'EVIDENCE_SUBMITTED',
        'REVIEW_REQUESTED',
        'DATASET_APPROVED',
        'DATASET_REJECTED',
        'DEADLINE_EXTENDED',
        'DATA_CHECKLIST_SHARED',
        'REGULATORY_DATA_REQUESTED',
        'REGULATORY_SUBMITTED',
        'REGULATORY_APPROVED',
        'REGULATORY_RETURNED',
        'DEADLINE_REMINDER',
        'USER_CREATED',
        'FACILITY_CREATED',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    facilityId: { type: String },
    linkUrl: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientRole: 1, isRead: 1, readAt: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
export const NotificationModel = Notification;
