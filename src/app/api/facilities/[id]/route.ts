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
      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
      const mockFacility = MOCK_FACILITIES.find(
        (f) => f.facilityId === id.toUpperCase() || f._id === id
      );
      if (mockFacility) {
        return NextResponse.json({ success: true, data: mockFacility });
      }
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
    console.warn('Error fetching facility from DB, returning fallback demo facility:', error);
    const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
    const { id } = await params;
    const fallback =
      MOCK_FACILITIES.find((f) => f.facilityId === id.toUpperCase() || f._id === id) ||
      MOCK_FACILITIES[0];
    return NextResponse.json({ success: true, data: fallback });
  }
}
