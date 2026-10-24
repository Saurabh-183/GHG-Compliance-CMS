import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    let facility;
    if (mongoose.Types.ObjectId.isValid(id)) {
      facility = await FacilityModel.findById(id)
        .populate('clientGroupId', 'name code industry headquarters contactPerson')
        .populate('assignedConsultantId', 'name email designation avatarUrl')
        .populate('assignedReviewerId', 'name email designation avatarUrl')
        .lean();
    }

    if (!facility) {
      facility = await FacilityModel.findOne({ facilityId: id.toUpperCase() })
        .populate('clientGroupId', 'name code industry headquarters contactPerson')
        .populate('assignedConsultantId', 'name email designation avatarUrl')
        .populate('assignedReviewerId', 'name email designation avatarUrl')
        .lean();
    }

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, facility.facilityId)) {
      return NextResponse.json({ error: 'Forbidden: Access denied to this facility' }, { status: 403 });
    }

    const clientGroupObj = facility.clientGroupId as {
      _id?: mongoose.Types.ObjectId;
      name?: string;
      code?: string;
      industry?: string;
    };

    return NextResponse.json({
      success: true,
      data: {
        ...facility,
        _id: facility._id.toString(),
        clientGroupId: clientGroupObj?._id?.toString() || facility.clientGroupId.toString(),
        clientGroupName: clientGroupObj?.name || '',
      },
    });
  } catch (error) {
    console.error('Error fetching facility:', error);
    return NextResponse.json({ error: 'Failed to fetch facility' }, { status: 500 });
  }
}
