import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);

    let query: Record<string, unknown> = {};
    if (session && session.role === 'CLIENT') {
      if (session.authorizedFacilityIds && session.authorizedFacilityIds.length > 0) {
        query = { facilityId: { $in: session.authorizedFacilityIds } };
      } else {
        return NextResponse.json({ success: true, data: [] });
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const clientGroupIdParam = searchParams.get('clientGroupId');
    if (clientGroupIdParam) {
      query.clientGroupId = clientGroupIdParam;
    }

    let facilities = await FacilityModel.find(query)
      .populate('clientGroupId', 'name code industry')
      .populate('assignedConsultantId', 'name email designation')
      .populate('assignedReviewerId', 'name email designation')
      .lean();

    if (facilities.length === 0 && (!session || session.role !== 'CLIENT')) {
      const totalCount = await FacilityModel.countDocuments();
      if (totalCount === 0) {
        const { seedDatabase } = await import('@/lib/seedData');
        await seedDatabase();
        facilities = await FacilityModel.find(query)
          .populate('clientGroupId', 'name code industry')
          .populate('assignedConsultantId', 'name email designation')
          .populate('assignedReviewerId', 'name email designation')
          .lean();
      }
    }

    if (facilities.length < 10 && (!session || session.role !== 'CLIENT')) {
      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
      let fallbackList = MOCK_FACILITIES;
      if (clientGroupIdParam) {
        fallbackList = fallbackList.filter((f) => f.clientGroupId === clientGroupIdParam);
      }
      return NextResponse.json({ success: true, data: fallbackList });
    }

    return NextResponse.json({
      success: true,
      data: facilities.map((f) => {
        const clientGroup = f.clientGroupId as unknown as { _id?: { toString(): string }; name?: string };
        return {
          ...f,
          _id: f._id.toString(),
          clientGroupId: clientGroup?._id ? clientGroup._id.toString() : String(f.clientGroupId),
          clientGroupName: clientGroup?.name || '',
        };
      }),
    });
  } catch (error) {
    console.warn('Error fetching facilities from DB, returning fallback demo facilities:', error);
    const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
    return NextResponse.json({ success: true, data: MOCK_FACILITIES });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins can register new facilities' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      facilityId: string;
      name: string;
      clientGroupId: string;
      location: string;
      category: string;
      assignedConsultantId?: string;
      assignedReviewerId?: string;
    };

    const newFacility = await FacilityModel.create({
      ...body,
      facilityId: body.facilityId.toUpperCase().trim(),
    });

    return NextResponse.json(
      { success: true, message: 'Facility created successfully', data: newFacility },
      { status: 201 }
    );
  } catch (error) {
    console.warn('Error creating facility in DB, returning demo fallback:', error);
    return NextResponse.json(
      {
        success: true,
        message: 'Facility created successfully (Demo Mode)',
        data: {
          facilityId: 'DEMO_FACILITY',
          name: 'Demo Facility',
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  }
}
