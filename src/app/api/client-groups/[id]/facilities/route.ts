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

    if (session && session.role === 'CLIENT' && session.clientGroupId !== id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const facilities = await FacilityModel.find({ clientGroupId: id })
      .populate('assignedConsultantId', 'name email')
      .populate('assignedReviewerId', 'name email')
      .lean();

    let result =
      session && session.role === 'CLIENT' && session.authorizedFacilityIds
        ? facilities.filter((f) => session.authorizedFacilityIds?.includes(f.facilityId))
        : facilities;

    if (result.length === 0) {
      const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
      const group = MOCK_CLIENT_GROUPS.find(
        (g) => g._id === id || g.code.toUpperCase() === id.toUpperCase()
      );
      if (group) {
        result = MOCK_FACILITIES.filter((f) => f.clientGroupId === group._id);
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
    console.warn('Error fetching group facilities from DB, returning fallback demo facilities:', error);
    const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
    const group = MOCK_CLIENT_GROUPS.find(
      (g) => g._id === id || g.code.toUpperCase() === id.toUpperCase()
    );
    const facilities = group
      ? MOCK_FACILITIES.filter((f) => f.clientGroupId === group._id)
      : MOCK_FACILITIES;
    return NextResponse.json({ success: true, data: facilities });
  }
}
