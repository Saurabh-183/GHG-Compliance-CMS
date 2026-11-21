import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      assessmentId: string;
      reportUrl: string;
      notes?: string;
    };

    if (!body.assessmentId || !body.reportUrl) {
      return NextResponse.json({ error: 'assessmentId and reportUrl are required' }, { status: 400 });
    }

    const assessment = await AssessmentModel.findById(body.assessmentId);
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    if (!isAuthorizedForFacility(session, assessment.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    assessment.documentLinks.finalReportUrl = body.reportUrl.trim();
    assessment.version += 1;
    if (body.notes) {
      assessment.notes = (assessment.notes ? assessment.notes + '\n' : '') + body.notes;
    }

    await assessment.save();

    return NextResponse.json({
      success: true,
      message: 'Final compliance report link linked successfully',
      data: assessment,
    });
  } catch (error) {
    console.error('Report link update failed:', error);
    return NextResponse.json({ error: 'Unable to link final report.' }, { status: 500 });
  }
}
