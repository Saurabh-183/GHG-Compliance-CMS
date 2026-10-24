import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const facilities = await FacilityModel.find({ clientGroupId: id })
      .populate('assignedConsultantId', 'name email')
      .populate('assignedReviewerId', 'name email')
      .lean();

    const result =
      session && session.role === 'CLIENT' && session.authorizedFacilityIds
        ? facilities.filter((f) => session.authorizedFacilityIds?.includes(f.facilityId))
        : facilities;

    return NextResponse.json({
      success: true,
      data: result.map((f) => ({
        ...f,
        _id: f._id.toString(),
        clientGroupId: f.clientGroupId.toString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching group facilities:', error);
    return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
  }
}
