import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role === 'CLIENT' && session.clientGroupId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const facilityQuery: Record<string, unknown> = { clientGroupId: id };
    if (session.role === 'CLIENT') facilityQuery.facilityId = { $in: session.authorizedFacilityIds || [] };
    const facilities = await FacilityModel.find(facilityQuery)
      .populate('assignedConsultantId', 'name email')
      .populate('assignedReviewerId', 'name email')
      .lean();

    const result = facilities;

    return NextResponse.json({
      success: true,
      data: result.map((f) => ({
        ...f,
        _id: f._id ? f._id.toString() : 'fac_' + f.facilityId.toLowerCase(),
        clientGroupId: f.clientGroupId ? f.clientGroupId.toString() : id,
      })),
    });
  } catch (error) {
    console.error('Error fetching group facilities:', error);
    return NextResponse.json({ error: 'Unable to load facilities.' }, { status: 503 });
  }
}
