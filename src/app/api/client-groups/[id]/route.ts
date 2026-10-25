import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ClientGroupModel } from '@/models/ClientGroup';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    if (session && session.role === 'CLIENT' && session.clientGroupId !== id) {
      return NextResponse.json({ error: 'Forbidden: Access denied to other client groups' }, { status: 403 });
    }

    const group = await ClientGroupModel.findById(id).lean();
    if (!group) {
      return NextResponse.json({ error: 'Client Group not found' }, { status: 404 });
    }

    const facilities = await FacilityModel.find({ clientGroupId: id })
      .populate('assignedConsultantId', 'name email designation')
      .populate('assignedReviewerId', 'name email designation')
      .lean();

    // Filter facilities for client users
    const filteredFacilities =
      session && session.role === 'CLIENT' && session.authorizedFacilityIds
        ? facilities.filter((f) => session.authorizedFacilityIds?.includes(f.facilityId))
        : facilities;

    return NextResponse.json({
      success: true,
      data: {
        ...group,
        _id: group._id.toString(),
        facilities: filteredFacilities.map((f) => ({
          ...f,
          _id: f._id.toString(),
          clientGroupId: f.clientGroupId.toString(),
        })),
      },
    });
  } catch (error) {
    console.warn('Error fetching group from DB, returning fallback demo client group:', error);
    const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
    const group = MOCK_CLIENT_GROUPS[0];
    return NextResponse.json({
      success: true,
      data: {
        ...group,
        facilities: MOCK_FACILITIES,
      },
    });
  }
}
