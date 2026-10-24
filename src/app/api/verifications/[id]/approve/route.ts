import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { DatasetModel } from '@/models/Dataset';
import { DataRequirementModel } from '@/models/DataRequirement';
import { AssessmentModel } from '@/models/Assessment';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden: Only Consultants or Admins can approve verifications' }, { status: 403 });
    }

    const dataset = await DatasetModel.findById(id);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as { comments?: string };

    const reviewerId = new mongoose.Types.ObjectId(session!.userId);
    const reviewerName = session!.name;
    const currentVersion = (dataset.reviewerApproval?.version || 0) + 1;

    dataset.verificationStatus = 'APPROVED';
    dataset.reviewerApproval = {
      reviewerId,
      reviewerName,
      status: 'APPROVED',
      reviewedAt: new Date(),
      comments: body.comments || 'Reconciliation independently reviewed and verified against DISCOM utility bills. Data locked.',
      isLocked: true,
      version: currentVersion,
    };

    dataset.auditTrail.push({
      timestamp: new Date(),
      userId: session!.userId,
      userName: reviewerName,
      action: 'REVIEWER_APPROVED',
      details: `Reviewer ${reviewerName} approved dataset version ${currentVersion}. Data locked against modification.`,
    });

    await dataset.save();

    // Also update linked DataRequirement if available
    if (dataset.dataRequirementId) {
      await DataRequirementModel.findByIdAndUpdate(dataset.dataRequirementId, {
        verificationStatus: 'APPROVED',
      });
    }

    // Update Assessment workflow status if linked
    await AssessmentModel.findOneAndUpdate(
      { facilityId: dataset.facilityId, period: dataset.period },
      {
        workflowStatus: 'APPROVED',
        approvedBy: reviewerId,
        approvedAt: new Date(),
      }
    );

    // Trigger notification to Consultant and Client that Reviewer approved & locked dataset
    try {
      const { Notification } = await import('@/models/Notification');
      await Promise.all([
        Notification.create({
          recipientRole: 'CONSULTANT',
          senderRole: 'CONSULTANT',
          senderName: reviewerName,
          type: 'DATASET_APPROVED',
          title: 'Verification Dataset Approved & Locked',
          message: `Consultant ${reviewerName} signed off and locked dataset for ${dataset.facilityId} (${dataset.period}). Version ${currentVersion}.`,
          facilityId: dataset.facilityId,
          linkUrl: `/facilities/${dataset.facilityId}`,
          isRead: false,
          createdAt: new Date(),
        }),
        Notification.create({
          recipientRole: 'CLIENT',
          senderRole: 'CONSULTANT',
          senderName: reviewerName,
          type: 'DATASET_APPROVED',
          title: 'Compliance Data Audited & Approved',
          message: `Your compliance filing dataset for ${dataset.facilityId} (${dataset.period}) has been verified and locked by Compliance Lead ${reviewerName}.`,
          facilityId: dataset.facilityId,
          linkUrl: '/portal/history',
          isRead: false,
          createdAt: new Date(),
        }),
      ]);
    } catch (e) {
      console.warn('Failed to dispatch reviewer approval notification:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Dataset verified and approved successfully. Audit trail recorded and version locked.',
      data: dataset,
    });
  } catch (error) {
    console.error('Error approving verification:', error);
    return NextResponse.json({ error: 'Failed to approve verification' }, { status: 500 });
  }
}
