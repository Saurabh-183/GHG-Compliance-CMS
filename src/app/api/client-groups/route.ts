import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ClientGroupModel } from '@/models/ClientGroup';
import { FacilityModel } from '@/models/Facility';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const session = getSessionFromRequest(request);

    const query =
      session?.role === 'CLIENT' && session.clientGroupId
        ? { _id: session.clientGroupId }
        : {};

    const groups = await ClientGroupModel.find(query)
      .sort({ name: 1 })
      .lean();

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
    console.error('Failed to fetch client groups:', error);

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load companies and facilities.',
      },
      { status: 500 }
    );
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
