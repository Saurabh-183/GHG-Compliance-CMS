import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);

    let query = {};
    if (session && session.role === 'CLIENT') {
      if (session.authorizedFacilityIds && session.authorizedFacilityIds.length > 0) {
        query = { facilityId: { $in: session.authorizedFacilityIds } };
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    const facilities = await FacilityModel.find(query)
      .populate('clientGroupId', 'name code industry')
      .populate('assignedConsultantId', 'name email designation')
      .populate('assignedReviewerId', 'name email designation')
      .lean();

    return NextResponse.json({
      success: true,
      data: facilities.map((f) => {
        const clientGroup = f.clientGroupId as unknown as { _id?: { toString(): string }; name?: string };
        return {
          ...f,
          _id: f._id.toString(),
          clientGroupId: clientGroup?._id ? clientGroup._id.toString() : String(f.clientGroupId),
          clientGroupName: clientGroup?.name || '',
        };
      }),
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    return NextResponse.json({ error: 'Failed to fetch facilities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins can register new facilities' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      facilityId: string;
      name: string;
      clientGroupId: string;
      location: string;
      category: string;
      assignedConsultantId?: string;
      assignedReviewerId?: string;
    };

    const newFacility = await FacilityModel.create({
      ...body,
      facilityId: body.facilityId.toUpperCase().trim(),
    });

    return NextResponse.json(
      { success: true, message: 'Facility created successfully', data: newFacility },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating facility:', error);
    return NextResponse.json({ error: 'Failed to create facility' }, { status: 500 });
  }
}
