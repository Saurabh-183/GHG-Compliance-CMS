import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { getClientFacilityIds } from '@/lib/clientFacilityAccess';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';


export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const { RegulatorySubmissionModel } = await import('@/models/RegulatorySubmission');
    const query: Record<string, unknown> = {};
    let allowedFacilityIds = (session.authorizedFacilityIds || []).map((id) => id.toUpperCase());
    if (session.role === 'CLIENT' && session.clientGroupId) {
      const companyFacilityIds = await getClientFacilityIds(session.clientGroupId);
      allowedFacilityIds = [...new Set([...allowedFacilityIds, ...companyFacilityIds])];
    }
    if (session.role === 'CLIENT') {
      if (!allowedFacilityIds.length) return NextResponse.json({ success: true, data: [] });
      query.facilityId = { $in: allowedFacilityIds };
    }
    const submissions = await RegulatorySubmissionModel.find(query).sort({ updatedAt: -1 }).lean();
    const allowedSet = new Set(allowedFacilityIds);
    const data = session.role === 'CLIENT'
      ? submissions.filter((item) => allowedSet.has(item.facilityId.toUpperCase()))
      : submissions;
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
