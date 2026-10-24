import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    const assessment = await AssessmentModel.findById(id)
      .populate('approvedBy', 'name email designation')
      .populate('assignedConsultantId', 'name email designation')
      .populate('assignedReviewerId', 'name email designation')
      .lean();

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, assessment.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Client portal permission enforcement: unapproved metrics and internal notes hidden
    if (session && session.role === 'CLIENT') {
      return NextResponse.json({
        success: true,
        data: {
          ...assessment,
          _id: assessment._id.toString(),
          metrics: assessment.metrics.filter((m) => m.approvalStatus === 'APPROVED'),
          notes: undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...assessment,
        _id: assessment._id.toString(),
      },
    });
  } catch (error) {
    console.error('Error fetching assessment:', error);
    return NextResponse.json({ error: 'Failed to fetch assessment' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT', 'REVIEWER'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Record<string, unknown>;

    // Increment version when updating assessment records
    const updated = await AssessmentModel.findByIdAndUpdate(
      id,
      {
        $set: body,
        $inc: { version: 1 },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Assessment updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Error updating assessment:', error);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}
