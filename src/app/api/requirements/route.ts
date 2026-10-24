import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { ComplianceType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');
    const period = searchParams.get('period');

    const query: {
      facilityId?: string | { $in: string[] };
      period?: string;
    } = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session && session.role === 'CLIENT' && session.authorizedFacilityIds) {
      query.facilityId = { $in: session.authorizedFacilityIds };
    }

    if (period) query.period = period;

    const requirements = await DataRequirementModel.find(query)
      .populate('datasetId')
      .sort({ dueDate: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: requirements.map((r) => ({
        ...r,
        _id: r._id.toString(),
        dueDate: r.dueDate ? r.dueDate.toISOString() : null,
        requestedAt: r.requestedAt ? r.requestedAt.toISOString() : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    return NextResponse.json({ error: 'Failed to fetch requirements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Consultants or Admins can create requirements' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      facilityId: string;
      period: string;
      title: string;
      category: 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC';
      linkedCompliances: ComplianceType[];
      description: string;
      dueDate?: string;
    };

    const newReq = await DataRequirementModel.create({
      ...body,
      facilityId: body.facilityId.toUpperCase(),
      submissionStatus: 'REQUESTED',
      verificationStatus: 'NOT_STARTED',
      requestedAt: new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });

    return NextResponse.json(
      { success: true, message: 'Data requirement created', data: newReq },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating requirement:', error);
    return NextResponse.json({ error: 'Failed to create requirement' }, { status: 500 });
  }
}
