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
      facilities = await FacilityModel.find({ clientGroupId: group._id })
        .populate('assignedConsultantId', 'name email designation')
        .populate('assignedReviewerId', 'name email designation')
        .lean();
    }

    // Fallback to MOCK_CLIENT_GROUPS if not in DB or facilities empty
    const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
    const mockGroup = MOCK_CLIENT_GROUPS.find(
      (g) =>
        g._id === id ||
        g.code.toUpperCase() === id.toUpperCase() ||
        g.name.toLowerCase() === id.toLowerCase() ||
        g._id === group?._id?.toString()
    );

    if (!group && mockGroup) {
      const mockFacs = MOCK_FACILITIES.filter((f) => f.clientGroupId === mockGroup._id);
      return NextResponse.json({
        success: true,
        data: {
          ...mockGroup,
          facilities: mockFacs,
        },
      });
    }

    if (!group && !mockGroup) {
      return NextResponse.json({ error: 'Client Group not found' }, { status: 404 });
    }

    const resolvedGroup = group || mockGroup;
    let resolvedFacilities = facilities;
    if (resolvedFacilities.length === 0 && mockGroup) {
      resolvedFacilities = MOCK_FACILITIES.filter((f) => f.clientGroupId === mockGroup._id);
    }

    // Filter facilities for client users
    const filteredFacilities =
      session && session.role === 'CLIENT' && session.authorizedFacilityIds
        ? resolvedFacilities.filter((f) => session.authorizedFacilityIds?.includes(f.facilityId))
        : resolvedFacilities;

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
    console.warn('Error fetching group from DB, returning fallback demo client group:', error);
    const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
    const group =
      MOCK_CLIENT_GROUPS.find(
        (g) =>
          g._id === id ||
          g.code.toUpperCase() === id.toUpperCase() ||
          g.name.toLowerCase() === id.toLowerCase()
      ) || MOCK_CLIENT_GROUPS[0];
    const groupFacilities = MOCK_FACILITIES.filter((f) => f.clientGroupId === group._id);
    return NextResponse.json({
      success: true,
      data: {
        ...group,
        facilities: groupFacilities,
      },
    });
  }
}
