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
    if (session.role !== 'ADMIN') facilityQuery.facilityId = { $in: session.authorizedFacilityIds || [] };
    const facilities = await FacilityModel.find(facilityQuery)
      .populate('assignedConsultantId', 'name email')
      .populate('assignedReviewerId', 'name email')
      .lean();

    let result =
      session.role !== 'ADMIN' && session.authorizedFacilityIds
        ? facilities.filter((f) => session.authorizedFacilityIds?.includes(f.facilityId))
        : facilities;

    if (result.length === 0 && session.role === 'ADMIN') {
      const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
      const group = MOCK_CLIENT_GROUPS.find(
        (g) => g._id === id || g.code.toUpperCase() === id.toUpperCase()
      );
      if (group) {
        result = MOCK_FACILITIES.filter((f) => f.clientGroupId === group._id && (session.role === 'ADMIN' || (session.authorizedFacilityIds || []).includes(f.facilityId)));
      }
    }

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
