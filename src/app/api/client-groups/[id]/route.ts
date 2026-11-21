import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { ClientGroupModel } from '@/models/ClientGroup';
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
      if (session && session.role !== 'ADMIN') facilityQuery.facilityId = { $in: session.authorizedFacilityIds || [] };
      facilities = await FacilityModel.find(facilityQuery)
        .populate('assignedConsultantId', 'name email designation')
        .populate('assignedReviewerId', 'name email designation')
        .lean();
    }

    if (!group) return NextResponse.json({ error: 'Client Group not found' }, { status: 404 });
    const resolvedGroup = group;
    const filteredFacilities = session.role === 'ADMIN'
      ? facilities
      : facilities.filter((facility) => (session.authorizedFacilityIds || []).includes(facility.facilityId));
    if (session.role === 'CONSULTANT' && filteredFacilities.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({
      success: true,
      data: {
        ...resolvedGroup,
        _id: resolvedGroup._id.toString(),
        facilities: filteredFacilities.map((f) => ({
          ...f,
          _id: f._id ? f._id.toString() : 'fac_' + f.facilityId.toLowerCase(),
          clientGroupId: f.clientGroupId ? f.clientGroupId.toString() : resolvedGroup._id.toString(),
        })),
      },
    });
  } catch (error) {
    console.error('Client group lookup failed:', error);
    return NextResponse.json({ error: 'Unable to load client group.' }, { status: 503 });
  }
}
