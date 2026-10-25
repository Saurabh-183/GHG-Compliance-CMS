import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DatasetModel } from '@/models/Dataset';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    let dataset = await DatasetModel.findById(id)
      .populate('consultantSubmission.consultantId', 'name email designation avatarUrl')
      .populate('reviewerApproval.reviewerId', 'name email designation avatarUrl')
      .lean();

    if (!dataset) {
      const totalCount = await DatasetModel.countDocuments();
      if (totalCount === 0) {
        const { seedDatabase } = await import('@/lib/seedData');
        await seedDatabase();
        dataset = await DatasetModel.findById(id)
          .populate('consultantSubmission.consultantId', 'name email designation avatarUrl')
          .populate('reviewerApproval.reviewerId', 'name email designation avatarUrl')
          .lean();
      }
    }

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, dataset.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Client portal view: hide internal consultant notes & internal rejection comments
    if (session && session.role === 'CLIENT') {
      const sanitizedMonths = dataset.months.map((m) => ({
        ...m,
        consultantNotes: undefined,
      }));

      return NextResponse.json({
        success: true,
        data: {
          ...dataset,
          _id: dataset._id.toString(),
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
        _id: dataset._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching dataset:', error);
    return NextResponse.json({ error: 'Failed to fetch dataset' }, { status: 500 });
  }
}
