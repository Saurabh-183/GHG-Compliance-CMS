import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ClientGroupModel } from '@/models/ClientGroup';
import { FacilityModel } from '@/models/Facility';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';
import { ComplianceType } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (session && session.role === 'CLIENT' && session.clientGroupId !== id) {
      return NextResponse.json({ error: 'Forbidden: Access denied to other client groups' }, { status: 403 });
    }

    let group = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      group = await ClientGroupModel.findById(id).lean();
    }
    if (!group) {
      group = await ClientGroupModel.findOne({
        $or: [
          { code: id.toUpperCase() },
          { _id: id },
          { name: { $regex: new RegExp(`^${id}$`, 'i') } },
        ],
      }).lean();
    }

    let facilities: any[] = [];
    if (group) {
      const facilityQuery: Record<string, unknown> = { clientGroupId: group._id };
      if (session && session.role === 'CLIENT') facilityQuery.facilityId = { $in: session.authorizedFacilityIds || [] };
      facilities = await FacilityModel.find(facilityQuery)
        .populate('assignedConsultantId', 'name email designation')
        .populate('assignedReviewerId', 'name email designation')
        .lean();
    }

    if (!group) return NextResponse.json({ error: 'Client Group not found' }, { status: 404 });
    const resolvedGroup = group;
    const filteredFacilities = session.role === 'CLIENT'
      ? facilities.filter((facility) => (session.authorizedFacilityIds || []).includes(facility.facilityId))
      : facilities;
    if (session.role === 'CLIENT' && filteredFacilities.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const facFws = Array.from(
      new Set(
        filteredFacilities.flatMap((facility) =>
          Array.isArray(facility.enabledFrameworks) && facility.enabledFrameworks.length > 0
            ? facility.enabledFrameworks
            : []
        )
      )
    );

    const enabledFrameworks =
      facFws.length > 0
        ? facFws
        : resolvedGroup.enabledFrameworks && resolvedGroup.enabledFrameworks.length > 0
        ? resolvedGroup.enabledFrameworks
        : ['RCO', 'PAT', 'CCTS'];

    return NextResponse.json({
      success: true,
      data: {
        ...resolvedGroup,
        _id: resolvedGroup._id.toString(),
        enabledFrameworks,
        facilities: filteredFacilities.map((f) => ({
          ...f,
          _id: f._id ? f._id.toString() : 'fac_' + f.facilityId.toLowerCase(),
          clientGroupId: f.clientGroupId ? f.clientGroupId.toString() : resolvedGroup._id.toString(),
          enabledFrameworks:
            Array.isArray(f.enabledFrameworks) && f.enabledFrameworks.length > 0
              ? f.enabledFrameworks
              : enabledFrameworks,
        })),
      },
    });
  } catch (error) {
    console.error('Client group lookup failed:', error);
    return NextResponse.json({ error: 'Unable to load client group.' }, { status: 503 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session || !authorizeRole(session, ['ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const body = await request.json();
    let query: Record<string, unknown> = {};
    if (mongoose.Types.ObjectId.isValid(id)) query = { _id: id };
    else query = { $or: [{ code: id.toUpperCase() }, { name: { $regex: new RegExp(`^${id}$`, 'i') } }] };

    const group = await ClientGroupModel.findOne(query);
    if (!group) return NextResponse.json({ error: 'Client Group not found.' }, { status: 404 });

    const updates: Record<string, unknown> = {};

    if (Array.isArray(body.enabledFrameworks)) {
      const valid = ['RCO', 'PAT', 'CCTS'] as ComplianceType[];
      const filtered = body.enabledFrameworks.filter((f: any) => valid.includes(f));
      updates.enabledFrameworks = filtered;

      // Sync facility compliances and facility documents
      const facilities = await FacilityModel.find({ clientGroupId: group._id }).select('facilityId').lean();
      const facilityIds = facilities.map((f) => f.facilityId);

      if (facilityIds.length > 0) {
        await FacilityModel.updateMany(
          { clientGroupId: group._id },
          { $set: { enabledFrameworks: filtered } }
        );
        // Disabled frameworks: mark isApplicable: false
        const disabled = valid.filter((f) => !filtered.includes(f));
        if (disabled.length > 0) {
          await ComplianceApplicabilityModel.updateMany(
            { facilityId: { $in: facilityIds }, complianceType: { $in: disabled } },
            { $set: { isApplicable: false } }
          );
        }
        // Enabled frameworks: mark isApplicable: true (or leave intact)
        if (filtered.length > 0) {
          await ComplianceApplicabilityModel.updateMany(
            { facilityId: { $in: facilityIds }, complianceType: { $in: filtered } },
            { $set: { isApplicable: true } }
          );
        }
      }
    }

    if (typeof body.name === 'string' && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.industry === 'string') updates.industry = body.industry.trim();
    if (typeof body.headquarters === 'string') updates.headquarters = body.headquarters.trim();

    const updatedGroup = await ClientGroupModel.findByIdAndUpdate(group._id, { $set: updates }, { new: true }).lean();

    return NextResponse.json({
      success: true,
      message: 'Client group frameworks updated successfully.',
      data: updatedGroup,
    });
  } catch (error) {
    console.error('Client group update failed:', error);
    return NextResponse.json({ error: 'Unable to update client group.' }, { status: 500 });
  }
}
