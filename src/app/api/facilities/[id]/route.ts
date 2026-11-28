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
import { deleteFacilityRecords, runDirectoryDeletion } from '@/lib/deleteClientDirectory';

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

    return NextResponse.json(
      { success: false, error: 'Facility service is temporarily unavailable.' },
      { status: 503 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorizeRole(getSessionFromRequest(request), ['ADMIN'])) {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const deleted = await runDirectoryDeletion(async (session) => {
      const filter = mongoose.Types.ObjectId.isValid(id)
        ? { $or: [{ _id: id }, { facilityId: id.toUpperCase() }] }
        : { facilityId: id.toUpperCase() };
      const facility = await FacilityModel.findOne(filter, 'facilityId', { session }).lean();
      if (!facility) return false;

      await deleteFacilityRecords([facility.facilityId], session);
      return true;
    });

    return deleted
      ? NextResponse.json({ success: true })
      : NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
  } catch (error) {
    console.error('Facility deletion failed:', error);
    return NextResponse.json({ error: 'Unable to delete facility.' }, { status: 500 });
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

    if (facility.clientGroupId) {
      try {
        const { ClientGroupModel } = await import('@/models/ClientGroup');
        const allClientFacs = await FacilityModel.find({ clientGroupId: facility.clientGroupId }).select('enabledFrameworks').lean();
        const combinedFrameworks = Array.from(
          new Set(
            allClientFacs.flatMap((f) =>
              Array.isArray(f.enabledFrameworks) && f.enabledFrameworks.length > 0
                ? f.enabledFrameworks
                : []
            )
          )
        );
        if (combinedFrameworks.length > 0) {
          await ClientGroupModel.updateOne(
            { _id: facility.clientGroupId },
            { $set: { enabledFrameworks: combinedFrameworks } }
          );
        }
      } catch (syncErr) {
        console.warn('Could not sync parent client group frameworks on facility update:', syncErr);
      }
    }

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
