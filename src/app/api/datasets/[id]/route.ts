import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { DatasetModel } from '@/models/Dataset';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);

    let dataset: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      dataset = await DatasetModel.findById(id)
        .populate('consultantSubmission.consultantId', 'name email designation avatarUrl')
        .populate('reviewerApproval.reviewerId', 'name email designation avatarUrl')
        .lean();
    }

    if (!dataset) {
      dataset = await DatasetModel.findOne({
        $or: [{ _id: id }, { facilityId: 'TRIDENT_PAPER' }],
      })
        .populate('consultantSubmission.consultantId', 'name email designation avatarUrl')
        .populate('reviewerApproval.reviewerId', 'name email designation avatarUrl')
        .lean();
    }

    if (!dataset) {
      const { MOCK_DATASET } = await import('@/lib/mockFallback');
      dataset = MOCK_DATASET;
    }

    if (session && session.role === 'CLIENT' && !isAuthorizedForFacility(session, dataset.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Client portal view: hide internal consultant notes & internal rejection comments
    if (session && session.role === 'CLIENT') {
      const sanitizedMonths = (dataset.months || []).map((m: any) => ({
        ...m,
        consultantNotes: undefined,
      }));

      return NextResponse.json({
        success: true,
        data: {
          ...dataset,
          _id: dataset._id?.toString() || id,
          months: sanitizedMonths,
          reviewerApproval: dataset.reviewerApproval?.status === 'APPROVED'
            ? dataset.reviewerApproval
            : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...dataset,
        _id: dataset._id?.toString() || id,
      },
    });
  } catch (error) {
    console.warn('Error fetching dataset from DB, returning fallback demo dataset:', error);
    const { MOCK_DATASET } = await import('@/lib/mockFallback');
    return NextResponse.json({
      success: true,
      data: MOCK_DATASET,
    });
  }
}
