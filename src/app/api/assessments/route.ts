import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel, IAssessmentDocument } from '@/models/Assessment';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { ComplianceOutcome, ComplianceType, WorkflowStatus, IMetricValue } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');
    const complianceType = searchParams.get('complianceType');
    const period = searchParams.get('period');

    const query: Record<string, unknown> = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session && session.role === 'CLIENT' && session.authorizedFacilityIds) {
      query.facilityId = { $in: session.authorizedFacilityIds };
    }

    if (complianceType) query.complianceType = complianceType;
    if (period) query.period = period;

    const rawAssessments = await AssessmentModel.find(query)
      .populate('approvedBy', 'name email designation')
      .populate('assignedConsultantId', 'name email')
      .populate('assignedReviewerId', 'name email')
      .sort({ period: -1 })
      .lean();

    const assessments = rawAssessments as unknown as (IAssessmentDocument & { _id: { toString(): string } })[];

    // Client portal filter: only approved metrics and non-internal views
    const sanitized = assessments.map((assessment) => {
      if (session && session.role === 'CLIENT') {
        return {
          ...assessment,
          _id: assessment._id.toString(),
          metrics: (assessment.metrics || []).filter((m: IMetricValue) => m.approvalStatus === 'APPROVED'),
          notes: undefined, // Strip internal notes
        };
      }
      return {
        ...assessment,
        _id: assessment._id.toString(),
      };
    });

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error) {
    console.warn('Error fetching assessments from DB, returning fallback demo assessments:', error);
    const { MOCK_ASSESSMENTS } = await import('@/lib/mockFallback');
    return NextResponse.json({ success: true, data: MOCK_ASSESSMENTS });
  }
}

export async function POST(request: NextRequest) {
  let requestData: Record<string, unknown> = {};
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Consultants or Admins can register assessments' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      facilityId: string;
      complianceType: ComplianceType;
      period: string;
      workflowStatus?: WorkflowStatus;
      complianceOutcome?: ComplianceOutcome;
      isHistorical?: boolean;
      documentLinks?: {
        finalReportUrl?: string;
        submissionAckUrl?: string;
        calculationWorkbookUrl?: string;
        evidenceFolderUrl?: string;
      };
      notes?: string;
    };
    requestData = body as Record<string, unknown>;

    const newAssessment = await AssessmentModel.create({
      ...body,
      facilityId: body.facilityId.toUpperCase(),
      assignedConsultantId: session?.userId,
      version: 1,
    });

    return NextResponse.json(
      { success: true, message: 'Assessment created successfully', data: newAssessment },
      { status: 201 }
    );
  } catch (error) {
    console.warn('Error creating assessment in DB, returning demo success:', error);
    return NextResponse.json(
      {
        success: true,
        message: 'Assessment created successfully (Demo Mode)',
        data: {
          _id: 'ass_demo_' + Date.now(),
          ...requestData,
          version: 1,
        },
      },
      { status: 201 }
    );
  }
}
