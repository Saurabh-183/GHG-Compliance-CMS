import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ClientGroupModel } from '@/models/ClientGroup';
import { FacilityModel } from '@/models/Facility';
import { UserModel } from '@/models/User';
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

    let query: Record<string, unknown> = {};
    if (session.role === 'CLIENT' && session.clientGroupId) {
      query = { _id: session.clientGroupId };
    }

    let groups = await ClientGroupModel.find(query)
      .sort({ createdAt: -1, name: 1 })
      .lean();

    // Do not seed/reset persistent data from a read or login request.

    if (groups.length === 0) return NextResponse.json({ success: true, data: [] });

    const data = await Promise.all(
      groups.map(async (group) => {
        const facilityQuery: Record<string, unknown> = { clientGroupId: group._id };
        if (session.role === 'CLIENT') {
          facilityQuery.facilityId = { $in: session.authorizedFacilityIds || [] };
        }
        const facilities = await FacilityModel.find(facilityQuery)
          .sort({ name: 1 })
          .lean();

        const facilityIds = facilities.map((facility) => facility.facilityId);

        const activeCompliancesCount = facilityIds.length
          ? await ComplianceApplicabilityModel.countDocuments({
              facilityId: { $in: facilityIds },
              isApplicable: true,
            })
          : 0;

        const facFws = Array.from(
          new Set(
            facilities.flatMap((facility) =>
              Array.isArray(facility.enabledFrameworks) && facility.enabledFrameworks.length > 0
                ? facility.enabledFrameworks
                : []
            )
          )
        );

        const enabledFrameworks =
          facFws.length > 0
            ? facFws
            : Array.isArray(group.enabledFrameworks) && group.enabledFrameworks.length > 0
            ? group.enabledFrameworks
            : ['RCO', 'PAT', 'CCTS'];

        if (facFws.length > 0 && JSON.stringify(facFws) !== JSON.stringify(group.enabledFrameworks)) {
          ClientGroupModel.updateOne({ _id: group._id }, { $set: { enabledFrameworks: facFws } }).catch(() => {});
        }

        return {
          ...group,
          _id: group._id.toString(),
          enabledFrameworks,
          totalFacilitiesCount: facilities.length,
          activeCompliancesCount,
          facilities: facilities.map((facility) => ({
            ...facility,
            _id: facility._id.toString(),
            clientGroupId: facility.clientGroupId.toString(),
            enabledFrameworks:
              Array.isArray(facility.enabledFrameworks) && facility.enabledFrameworks.length > 0
                ? facility.enabledFrameworks
                : enabledFrameworks,
          })),
        };
      })
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Client group query failed:', error);
    return NextResponse.json({ error: 'Unable to load client groups.' }, { status: 503 });
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
    const body = (await request.json()) as {
      name: string;
      code: string;
      industry: string;
      headquarters: string;
      contactPerson: { name: string; email: string; phone: string };
    };

    const newGroup = await ClientGroupModel.create(body);
    await UserModel.updateMany(
      { role: 'CONSULTANT' },
      { $addToSet: { clientGroupIds: newGroup._id } }
    );
    return NextResponse.json(
      { success: true, message: 'Client Group created', data: newGroup },
      { status: 201 }
    );
  } catch (error) {
    console.error('Client group creation failed:', error);
    return NextResponse.json({ error: 'Unable to create client group.' }, { status: 500 });
  }
}
