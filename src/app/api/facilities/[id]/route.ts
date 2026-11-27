import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import {
  getSessionFromRequest,
  isAuthorizedForFacility,
  authorizeRole,
} from '@/lib/auth';
import type { ComplianceType } from '@/types';

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
        if (!isAuthorizedForFacility(session, facility.facilityId) || (session.role === 'CLIENT' && facility.clientGroupId?._id?.toString?.() !== session.clientGroupId && facility.clientGroupId?.toString?.() !== session.clientGroupId)) {
          return NextResponse.json(
            { success: false, error: 'You are not authorized to access this facility.' },
            { status: 403 }
          );
        }

        return NextResponse.json({
          success: true,
          source: 'development-fallback',
          data: session.role === 'CLIENT' ? { ...facility, driveConnection: undefined } : facility,
        });
      }
    }

    if (!facility) {
      return NextResponse.json(
        { success: false, error: 'Facility not found.' },
        { status: 404 }
      );
    }

    if (!isAuthorizedForFacility(session, facility.facilityId) || (session.role === 'CLIENT' && facility.clientGroupId?._id?.toString?.() !== session.clientGroupId && facility.clientGroupId?.toString?.() !== session.clientGroupId)) {
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
        ...(session.role === 'CLIENT' ? { driveConnection: undefined } : {}),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params;
  const id = typeof rawId === 'string' ? rawId.trim() : '';
  const session = getSessionFromRequest(request);

  if (!id) {
    return NextResponse.json({ success: false, error: 'Facility ID is required.' }, { status: 400 });
  }

  if (!session || !authorizeRole(session, ['ADMIN'])) {
    return NextResponse.json({ success: false, error: 'Forbidden: Admin access required.' }, { status: 403 });
  }

  try {
    await connectToDatabase();

    let facility: any;
    if (mongoose.Types.ObjectId.isValid(id)) {
      facility = await FacilityModel.findById(id);
    }
    if (!facility) {
      facility = await FacilityModel.findOne({ facilityId: id.toUpperCase() });
    }
    if (!facility) {
      return NextResponse.json({ success: false, error: 'Facility not found.' }, { status: 404 });
    }

    const body = await request.json();

    // Facility-wide enabledFrameworks is maintained as the union of all
    // year-specific applicability records. Editing a facility must not
    // accidentally enable/disable compliance for every financial year.
    if (Array.isArray(body.enabledFrameworks)) {
      return NextResponse.json({
        success: false,
        error: 'Configure compliance by financial year using the compliance settings panel.',
      }, { status: 400 });
    }

    if (body.name && typeof body.name === 'string') facility.name = body.name.trim();
    if (body.location && typeof body.location === 'string') facility.location = body.location.trim();
    if (body.category && typeof body.category === 'string') facility.category = body.category.trim();

    await facility.save();

    return NextResponse.json({
      success: true,
      message: 'Facility updated successfully',
      data: facility,
    });
  } catch (error) {
    console.error('Error updating facility:', error);
    return NextResponse.json({ success: false, error: 'Unable to update facility.' }, { status: 500 });
  }
}
