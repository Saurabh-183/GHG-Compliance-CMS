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

    let query = {};
    // If client user, can only view their own client group
    if (session && session.role === 'CLIENT' && session.clientGroupId) {
      query = { _id: session.clientGroupId };
    }

    const groups = await ClientGroupModel.find(query).sort({ name: 1 }).lean();

    // Enrich with facility counts and active compliances
    const enriched = await Promise.all(
      groups.map(async (group) => {
        const facilities = await FacilityModel.find({ clientGroupId: group._id }).lean();
        const facilityIds = facilities.map((f) => f.facilityId);
        const compliancesCount = await ComplianceApplicabilityModel.countDocuments({
          facilityId: { $in: facilityIds },
          isApplicable: true,
        });

        return {
          ...group,
          _id: group._id.toString(),
          totalFacilitiesCount: facilities.length,
          activeCompliancesCount: compliancesCount,
          facilities: facilities.map((f) => ({
            ...f,
            _id: f._id.toString(),
            clientGroupId: f.clientGroupId.toString(),
          })),
        };
      })
    );

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('Error fetching client groups:', error);
    return NextResponse.json({ error: 'Failed to fetch client groups' }, { status: 500 });
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
    return NextResponse.json(
      { success: true, message: 'Client Group created', data: newGroup },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating client group:', error);
    return NextResponse.json({ error: 'Failed to create client group' }, { status: 500 });
  }
}
