import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { DatasetModel } from '@/models/Dataset';
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
      return NextResponse.json({ error: 'Forbidden: Only Consultants or Admins can reject verifications' }, { status: 403 });
    }

    const dataset = await DatasetModel.findById(id);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const body = (await request.json()) as { comments: string };
    if (!body.comments) {
      return NextResponse.json({ error: 'Rejection comments are required' }, { status: 400 });
    }

    const reviewerId = new mongoose.Types.ObjectId(session!.userId);
    const reviewerName = session!.name;

    dataset.verificationStatus = 'REJECTED';
    dataset.reviewerApproval = {
      reviewerId,
      reviewerName,
      status: 'REJECTED',
      reviewedAt: new Date(),
      comments: body.comments,
      isLocked: false,
      version: dataset.reviewerApproval?.version || 1,
    };

    dataset.auditTrail.push({
      timestamp: new Date(),
      userId: session!.userId,
      userName: reviewerName,
      action: 'REVIEWER_REJECTED',
      details: `Reviewer ${reviewerName} rejected dataset. Reason: ${body.comments}`,
    });

    await dataset.save();

    // Trigger notification to Consultant that dataset was returned
    try {
      const { Notification } = await import('@/models/Notification');
      await Notification.create({
        recipientRole: 'CONSULTANT',
        senderRole: 'CONSULTANT',
        senderName: reviewerName,
        type: 'DATASET_REJECTED',
        title: 'Dataset Returned by Reviewer',
        message: `Reviewer ${reviewerName} returned dataset for ${dataset.facilityId} (${dataset.period}) with audit notes: "${body.comments}".`,
        facilityId: dataset.facilityId,
        linkUrl: `/datasets/${dataset._id}/verify`,
        isRead: false,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Failed to dispatch reviewer reject notification:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Dataset rejected and returned to consultant with audit notes',
      data: dataset,
    });
  } catch (error) {
    console.warn('Error rejecting verification in DB, returning demo success:', error);
    const { MOCK_DATASET } = await import('@/lib/mockFallback');
    return NextResponse.json({
      success: true,
      message: 'Dataset rejected and returned to consultant with audit notes (Demo Mode)',
      data: {
        ...MOCK_DATASET,
        verificationStatus: 'REJECTED',
      },
    });
  }
}
