import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';


export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { RegulatorySubmissionModel } = await import('@/models/RegulatorySubmission');
    const { isAuthorizedForFacility } = await import('@/lib/auth');
    const query: Record<string, unknown> = {};
    if (session.role !== 'ADMIN') {
      const ids = session.authorizedFacilityIds || [];
      if (!ids.length) return NextResponse.json({ success: true, data: [] });
      query.facilityId = { $in: ids.map((id) => id.toUpperCase()) };
    }
    const submissions = await RegulatorySubmissionModel.find(query).sort({ updatedAt: -1 }).lean();
    const data = submissions.filter((item) => isAuthorizedForFacility(session, item.facilityId));
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Regulatory submissions list failed:', error);
    return NextResponse.json({ error: 'Unable to load regulatory requests' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      assessmentId: string;
      submissionAckUrl: string;
      submissionDate?: string;
    };

    if (!body.assessmentId || !body.submissionAckUrl) {
      return NextResponse.json({ error: 'assessmentId and submissionAckUrl are required' }, { status: 400 });
    }

    const assessment = await AssessmentModel.findById(body.assessmentId);
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const { isAuthorizedForFacility } = await import('@/lib/auth');
    if (!isAuthorizedForFacility(session, assessment.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    assessment.documentLinks.submissionAckUrl = body.submissionAckUrl.trim();
    assessment.workflowStatus = 'SUBMITTED';
    assessment.version += 1;

    await assessment.save();

    return NextResponse.json({
      success: true,
      message: 'Regulatory submission acknowledgement linked. Workflow status set to SUBMITTED.',
      data: assessment,
    });
  } catch (error) {
    console.error('Error linking regulatory submission:', error);
    return NextResponse.json({ error: 'Unable to link regulatory submission.' }, { status: 500 });
  }
}
