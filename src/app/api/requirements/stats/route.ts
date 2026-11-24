import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { computeRequestStats } from '@/lib/requestStats';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const facilityId = request.nextUrl.searchParams.get('facilityId');
    const period = request.nextUrl.searchParams.get('period');
    const query: { facilityId?: string | { $in: string[] }; period?: string } = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session.role === 'CLIENT') {
      query.facilityId = { $in: session.authorizedFacilityIds || [] };
    } else if (session.role === 'CONSULTANT') {
      const assigned = await FacilityModel.find({ assignedConsultantId: session.userId })
        .select('facilityId')
        .lean();
      query.facilityId = { $in: assigned.map((f) => f.facilityId) };
    } else if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (period?.trim()) query.period = period.trim();

    const rows = await DataRequirementModel.find(query).select('workflowStatus dueDate').lean();
    const stats = computeRequestStats(rows);

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Requirement stats failed:', error);
    return NextResponse.json({ error: 'Unable to load statistics.' }, { status: 500 });
  }
}