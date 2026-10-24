import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'CLARIFICATION_RAISED'
  | 'CLARIFICATION_RESPONDED'
  | 'EVIDENCE_SUBMITTED'
  | 'REVIEW_REQUESTED'
  | 'DATASET_APPROVED'
  | 'DATASET_REJECTED'
  | 'DEADLINE_EXTENDED';

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
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    facilityId: { type: String },
    linkUrl: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
