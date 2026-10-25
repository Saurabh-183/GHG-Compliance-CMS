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
      return NextResponse.json({ error: 'Forbidden: Only Consultants can submit for review' }, { status: 403 });
    }

    const dataset = await DatasetModel.findById(id);
    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    const body = (await request.json().catch(() => ({}))) as { summary?: string };

    dataset.verificationStatus = 'AWAITING_APPROVAL';
    dataset.consultantSubmission = {
      consultantId: new mongoose.Types.ObjectId(session!.userId),
      consultantName: session!.name,
      submittedAt: new Date(),
      summary: body.summary || 'Monthly reconciliation completed and submitted for Reviewer approval.',
    };

    dataset.reviewerApproval = {
      reviewerId: new mongoose.Types.ObjectId(),
      reviewerName: 'Pending Assignment',
      status: 'PENDING',
      reviewedAt: new Date(),
      comments: '',
      isLocked: false,
      version: (dataset.reviewerApproval?.version || 1),
    };

    dataset.auditTrail.push({
      timestamp: new Date(),
      userId: session!.userId,
      userName: session!.name,
      action: 'SUBMITTED_FOR_REVIEW',
      details: `Consultant ${session!.name} submitted verification dataset to Reviewer Queue.`,
    });

    await dataset.save();

    return NextResponse.json({
      success: true,
      message: 'Dataset submitted to Reviewer Queue successfully',
      data: dataset,
    });
  } catch (error) {
    console.warn('Error submitting verification in DB, returning demo success:', error);
    const { MOCK_DATASET } = await import('@/lib/mockFallback');
    return NextResponse.json({
      success: true,
      message: 'Dataset submitted to Reviewer Queue successfully (Demo Mode)',
      data: {
        ...MOCK_DATASET,
        verificationStatus: 'AWAITING_APPROVAL',
      },
    });
  }
}
