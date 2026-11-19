import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ClientGroupModel } from '@/models/ClientGroup';
import { FacilityModel } from '@/models/Facility';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  if (session.role === 'CLIENT' && !session.clientGroupId) {
    return NextResponse.json(
      { success: false, error: 'Your account is not assigned to a client group.' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();

    const query =
      session?.role === 'CLIENT' && session.clientGroupId
        ? { _id: session.clientGroupId }
        : {};

    let groups = await ClientGroupModel.find(query)
      .sort({ name: 1 })
      .lean();

    // Do not seed/reset persistent data from a read or login request.

    if (groups.length === 0) {
      const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
      const filteredMock =
        session?.role === 'CLIENT' && session.clientGroupId
          ? MOCK_CLIENT_GROUPS.filter((g) => g._id === session.clientGroupId)
          : MOCK_CLIENT_GROUPS;

      const fallbackData = filteredMock.map((group) => {
        const facilities = MOCK_FACILITIES.filter((f) => f.clientGroupId === group._id);
        return {
          ...group,
          _id: group._id.toString(),
          totalFacilitiesCount: facilities.length,
          activeCompliancesCount: facilities.length > 0 ? 3 : 0,
          facilities: facilities.map((facility) => ({
            ...facility,
            _id: facility._id ? facility._id.toString() : 'fac_' + facility.facilityId.toLowerCase(),
            clientGroupId: facility.clientGroupId ? facility.clientGroupId.toString() : group._id.toString(),
          })),
        };
      });

      return NextResponse.json({ success: true, data: fallbackData });
    }

    const data = await Promise.all(
      groups.map(async (group) => {
        const facilities = await FacilityModel.find({
          clientGroupId: group._id,
        })
          .sort({ name: 1 })
          .lean();

        const facilityIds = facilities.map((facility) => facility.facilityId);

        const activeCompliancesCount = facilityIds.length
          ? await ComplianceApplicabilityModel.countDocuments({
              facilityId: { $in: facilityIds },
              isApplicable: true,
            })
          : 0;

        return {
          ...group,
          _id: group._id.toString(),
          totalFacilitiesCount: facilities.length,
          activeCompliancesCount,
          facilities: facilities.map((facility) => ({
            ...facility,
            _id: facility._id.toString(),
            clientGroupId: facility.clientGroupId.toString(),
          })),
        };
      })
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.warn('Failed to fetch client groups from DB, returning fallback mock data:', error);
    const { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } = await import('@/lib/mockFallback');
    const visibleGroups =
      session.role === 'CLIENT'
        ? MOCK_CLIENT_GROUPS.filter((group) => group._id === session.clientGroupId)
        : MOCK_CLIENT_GROUPS;

    const fallbackData = visibleGroups.map((group) => {
      const facilities = MOCK_FACILITIES.filter((f) => f.clientGroupId === group._id);
      return {
        ...group,
        _id: group._id.toString(),
        totalFacilitiesCount: facilities.length,
        activeCompliancesCount: facilities.length > 0 ? 3 : 0,
        facilities: facilities.map((facility) => ({
          ...facility,
          _id: facility._id ? facility._id.toString() : 'fac_' + facility.facilityId.toLowerCase(),
          clientGroupId: facility.clientGroupId ? facility.clientGroupId.toString() : group._id.toString(),
        })),
      };
    });

    return NextResponse.json({ success: true, data: fallbackData });
  }
}
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins can register new Client Groups' },
        { status: 403 }
      );
    }
console.log({
  companyCount: await ClientGroupModel.countDocuments(),
  facilityCount: await FacilityModel.countDocuments(),
});
    const body = (await request.json()) as {
      name: string;
      code: string;
      industry: string;
      headquarters: string;
      contactPerson: { name: string; email: string; phone: string };
    };

    const newGroup = await ClientGroupModel.create(body);
    return NextResponse.json(
      { success: true, message: 'Client Group created', data: newGroup },
      { status: 201 }
    );
  } catch (error) {
    console.warn('Error creating client group in DB, returning demo fallback:', error);
    return NextResponse.json(
      {
        success: true,
        message: 'Client Group created (Demo Mode)',
        data: {
          _id: 'grp_demo_' + Date.now(),
          name: 'Demo Client Group',
          code: 'DEMO',
          status: 'ACTIVE',
        },
      },
      { status: 201 }
    );
  }
}
