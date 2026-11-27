import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import { ComplianceType, WorkflowStatus, ComplianceOutcome } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    const facilityId = request.nextUrl.searchParams.get('facilityId');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const query: { facilityId?: string | { $in: string[] } } = {};
    if (!facilityId && session.role !== 'ADMIN') {
      query.facilityId = { $in: session.authorizedFacilityIds || [] };
    }
    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    }

    const records = await ComplianceApplicabilityModel.find(query)
      .populate('assignedConsultantId', 'name email')
      .populate('assignedReviewerId', 'name email')
      .sort({ period: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: records.map((record) => ({
        ...record,
        _id: record._id.toString(),
        deadline: record.deadline ? new Date(record.deadline).toISOString() : null,
      })),
    });
  } catch (error) {
    console.error('Compliance applicability query failed:', error);
    return NextResponse.json({ error: 'Unable to load compliance applicability.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins can configure facility compliance applicability.' },
        { status: 403 }
      );
    }

    body = (await request.json()) as {
      facilityId: string;
      complianceType: ComplianceType;
      period: string;
      isApplicable: boolean;
      authority: string;
      ministry?: string;
      notificationReference?: string;
      targetValue: number | null;
      targetUnit?: string;
      targetMethodology?: string;
      deadline?: string | null;
      assignedConsultantId?: string;
      assignedReviewerId?: string;
      workflowStatus?: WorkflowStatus;
      complianceOutcome?: ComplianceOutcome;
      notes?: string;
    };

    if (!body.facilityId || !body.complianceType || !body.period) {
      return NextResponse.json({ error: 'facilityId, complianceType and financial year are required.' }, { status: 400 });
    }
    if (!['RCO', 'RPO', 'PAT', 'CCTS'].includes(body.complianceType)) {
      return NextResponse.json({ error: 'Invalid compliance framework.' }, { status: 400 });
    }
    if (!isAuthorizedForFacility(session, body.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const facility = await (await import('@/models/Facility')).FacilityModel.findOne({ facilityId: body.facilityId.toUpperCase() });
    if (!facility) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });

    const doc = await ComplianceApplicabilityModel.findOneAndUpdate(
      {
        facilityId: body.facilityId.toUpperCase(),
        complianceType: body.complianceType,
        period: body.period,
      },
      {
        ...body,
        facilityId: body.facilityId.toUpperCase(),
        deadline: body.deadline ? new Date(body.deadline) : null,
      },
      { upsert: true, new: true, runValidators: true }
    );

    // enabledFrameworks is the facility-wide allow-list (union across years).
    // ComplianceApplicability remains the source of truth for each financial year.
    const activeFrameworks = await ComplianceApplicabilityModel.distinct('complianceType', {
      facilityId: facility.facilityId,
      isApplicable: true,
    });
    facility.enabledFrameworks = activeFrameworks as ComplianceType[];
    await facility.save();

    return NextResponse.json({
      success: true,
      message: 'Compliance applicability saved successfully',
      data: doc,
    });
  } catch (error) {
    console.error('Compliance applicability save failed:', error);
    return NextResponse.json({ error: 'Unable to save compliance applicability.' }, { status: 500 });
  }
}
