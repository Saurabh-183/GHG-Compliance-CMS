import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import {
  getSessionFromRequest,
  isAuthorizedForFacility,
} from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  const session = getSessionFromRequest(request);

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Facility ID is required.' },
      { status: 400 }
    );
  }

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();

    let facility: any;

    if (mongoose.Types.ObjectId.isValid(id)) {
      facility = await FacilityModel.findById(id)
        .populate('clientGroupId', 'name code industry headquarters contactPerson')
        .populate('assignedConsultantId', 'name email designation avatarUrl')
        .populate('assignedReviewerId', 'name email designation avatarUrl')
        .lean();
    }

    if (!facility) {
      facility = await FacilityModel.findOne({
        facilityId: id.toUpperCase(),
      })
        .populate('clientGroupId', 'name code industry headquarters contactPerson')
        .populate('assignedConsultantId', 'name email designation avatarUrl')
        .populate('assignedReviewerId', 'name email designation avatarUrl')
        .lean();
    }

    if (!facility && process.env.NODE_ENV !== 'production') {
      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
      facility = MOCK_FACILITIES.find(
        (item) =>
          item.facilityId?.toUpperCase() === id.toUpperCase() ||
          item._id === id
      );

      if (facility) {
        if (!isAuthorizedForFacility(session, facility.facilityId)) {
          return NextResponse.json(
            { success: false, error: 'You are not authorized to access this facility.' },
            { status: 403 }
          );
        }

        return NextResponse.json({
          success: true,
          source: 'development-fallback',
          data: facility,
        });
      }
    }

    if (!facility) {
      return NextResponse.json(
        { success: false, error: 'Facility not found.' },
        { status: 404 }
      );
    }

    if (!isAuthorizedForFacility(session, facility.facilityId)) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to access this facility.' },
        { status: 403 }
      );
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
        clientGroupId:
          clientGroupObj?._id?.toString() || facility.clientGroupId.toString(),
        clientGroupName: clientGroupObj?.name || '',
      },
    });
  } catch (error) {
    console.error('Error fetching facility:', error);

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Facility service is temporarily unavailable.' },
        { status: 503 }
      );
    }

    const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
    const fallback = MOCK_FACILITIES.find(
      (item) =>
        item.facilityId?.toUpperCase() === id.toUpperCase() ||
        item._id === id
    );

    if (!fallback) {
      return NextResponse.json(
        { success: false, error: `Facility "${id}" was not found.` },
        { status: 404 }
      );
    }

    if (!isAuthorizedForFacility(session, fallback.facilityId)) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to access this facility.' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      source: 'development-fallback',
      data: fallback,
    });
  }
}
