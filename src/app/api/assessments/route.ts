import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel, IAssessmentDocument } from '@/models/Assessment';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
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
    } else if (session && session.role === 'CLIENT') {
      query.facilityId = { $in: session.authorizedFacilityIds || [] };
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

    // Only surface assessments whose facility/framework/period is explicitly applicable.
    // This prevents legacy synthetic assessments from appearing in report lists.
    const applicableRows = await ComplianceApplicabilityModel.find({ isApplicable: true })
      .select('facilityId complianceType period')
      .lean();
    const applicableKeys = new Set(applicableRows.map((row) =>
      `${String(row.facilityId).toUpperCase()}|${row.complianceType}|${String(row.period).toLowerCase()}`
    ));
    const visibleAssessments = assessments.filter((assessment) => {
      const facility = String(assessment.facilityId).toUpperCase();
      const period = String(assessment.period).toLowerCase();
      const exact = `${facility}|${assessment.complianceType}|${period}`;
      const normalizedYear = period.match(/20\d{2}-\d{2}/)?.[0];
      return applicableKeys.has(exact) || (!!normalizedYear && applicableKeys.has(`${facility}|${assessment.complianceType}|fy${normalizedYear}`));
    });

    // Client portal filter: only approved metrics and non-internal views
    const sanitized = visibleAssessments.map((assessment) => {
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
    console.error('Error fetching assessments:', error);
    return NextResponse.json({ success: false, error: 'Unable to load assessments.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
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

    if (!body.facilityId || !body.complianceType || !body.period) {
      return NextResponse.json({ error: 'facilityId, complianceType and period are required.' }, { status: 400 });
    }
    if (!isAuthorizedForFacility(session, body.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Assessment creation is permitted only for a facility/framework/year that
    // has an explicit applicable record. This blocks empty/fabricated reports.
    const applicability = await ComplianceApplicabilityModel.findOne({
      facilityId: body.facilityId.toUpperCase(),
      complianceType: body.complianceType,
      period: body.period,
      isApplicable: true,
    }).lean();
    if (!applicability) {
      return NextResponse.json(
        { error: 'This compliance framework and financial year are not applicable for this facility.' },
        { status: 409 }
      );
    }

    const existingAssessment = await AssessmentModel.findOne({
      facilityId: body.facilityId.toUpperCase(),
      complianceType: body.complianceType,
      period: body.period,
    }).lean();
    if (existingAssessment) {
      return NextResponse.json(
        { error: 'An assessment already exists for this facility, framework and financial year.', data: { assessmentId: String(existingAssessment._id) } },
        { status: 409 }
      );
    }

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
    console.error('Assessment creation failed:', error);
    return NextResponse.json({ error: 'Unable to create assessment.' }, { status: 500 });
  }
}
