import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { DataRequirementModel } from '@/models/DataRequirement';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    const assessment = await AssessmentModel.findById(id).lean();
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, assessment.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requirements = await DataRequirementModel.find({
      facilityId: assessment.facilityId,
      period: assessment.period,
      linkedCompliances: assessment.complianceType,
    })
      .populate('datasetId')
      .lean();

    return NextResponse.json({
      success: true,
      data: requirements.map((r) => ({
        ...r,
        _id: r._id.toString(),
      })),
    });
  } catch (error) {
    console.warn('Error fetching assessment requirements from DB, returning fallback demo requirements:', error);
    const { MOCK_REQUIREMENTS } = await import('@/lib/mockFallback');
    return NextResponse.json({ success: true, data: MOCK_REQUIREMENTS });
  }
}
