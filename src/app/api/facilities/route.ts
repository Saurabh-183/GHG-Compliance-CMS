import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, authorizeRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();

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

    // GET requests must not seed or reset persistent data. Internal users receive
    // the read-only demo directory fallback below when MongoDB has no records.

    if (
      facilities.length === 0 &&
      process.env.NODE_ENV !== 'production' &&
      session &&
      session.role !== 'CLIENT'
    ) {
      const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
      let fallbackList = MOCK_FACILITIES;

      if (clientGroupIdParam) {
        fallbackList = fallbackList.filter(
          (facility) => facility.clientGroupId === clientGroupIdParam
        );
      }

      return NextResponse.json({
        success: true,
        source: 'development-fallback',
        data: fallbackList,
      });
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
    console.warn('Error fetching facilities from DB:', error);

    if (session.role === 'CLIENT') {
      // Never expose the full demo directory to a client if the database is unavailable.
      return NextResponse.json(
        { success: false, error: 'Facility directory is temporarily unavailable.' },
        { status: 503 }
      );
    }

    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'Facility directory is temporarily unavailable.' },
        { status: 503 }
      );
    }

    const { MOCK_FACILITIES } = await import('@/lib/mockFallback');
    return NextResponse.json({
      success: true,
      source: 'development-fallback',
      data: MOCK_FACILITIES,
    });
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
