import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CalendarItemModel } from '@/models/CalendarItem';
import { FacilityModel } from '@/models/Facility';
import { DataRequirementModel } from '@/models/DataRequirement';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { ComplianceType, ICalendarItem } from '@/types';
import { buildComplianceCalendarView } from '@/lib/complianceCalendarView';
import { applyCalendarDueDateExtension } from '@/lib/complianceCalendarSync';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Authentication required.' },
      { status: 401 }
    );
  }

  if (session.role !== 'ADMIN' && !session.authorizedFacilityIds?.length) {
    return NextResponse.json(
      { success: false, error: 'No facilities are assigned to your account.' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session && session.role !== 'ADMIN') {
      query.facilityId = { $in: session.authorizedFacilityIds || [] };
    }

    if (status) query.status = status;

    const reqQuery: Record<string, unknown> = {
      isApplicable: { $ne: false },
      workflowStatus: { $nin: ['DRAFT'] },
      submissionStatus: { $ne: 'NOT_REQUESTED' },
    };
    if (facilityId) {
      reqQuery.facilityId = facilityId.toUpperCase();
    } else if (session.role === 'CLIENT' && session.authorizedFacilityIds?.length) {
      reqQuery.facilityId = { $in: session.authorizedFacilityIds };
    } else if (session.role === 'CONSULTANT') {
      const assignedFacilities = await FacilityModel.find({ assignedConsultantId: session.userId })
        .select('facilityId')
        .lean();
      const assignedIds = assignedFacilities.map((f) => f.facilityId);
      if (assignedIds.length > 0) {
        reqQuery.$or = [{ facilityId: { $in: assignedIds } }, { requestedBy: session.userId }];
      } else {
        reqQuery.requestedBy = session.userId;
      }
    }

    const [rawItems, requirements] = await Promise.all([
      CalendarItemModel.find(query).sort({ regulatoryDueDate: 1 }).lean(),
      DataRequirementModel.find(reqQuery)
        .select(
          '_id facilityId period dueDate linkedCompliances workflowStatus submissionStatus isApplicable title requestId'
        )
        .sort({ dueDate: 1 })
        .lean(),
    ]);

    const facilityCodes = new Set<string>();
    requirements.forEach((r) => facilityCodes.add(r.facilityId));

    const facilities = await FacilityModel.find({
      facilityId: { $in: [...facilityCodes] },
    })
      .select('facilityId name')
      .lean();
    const facilityNameById = new Map(facilities.map((f) => [f.facilityId, f.name]));

    const responseData = buildComplianceCalendarView({
      requirements,
      calendarItems: rawItems,
      facilityNameById,
    });

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Error fetching compliance calendar:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load compliance calendar' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: any = null;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    body = (await request.json()) as {
      facilityId: string;
      complianceType: ComplianceType;
      reportingPeriod: string;
      regulatoryDueDate: string;
      internalDeadline: string;
      clientDataSubmissionDeadline: string;
      isRecurringCEA?: boolean;
    };

    if (!isAuthorizedForFacility(session, body.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const newItem = await CalendarItemModel.create({
      facilityId: body.facilityId.toUpperCase(),
      complianceType: body.complianceType,
      reportingPeriod: body.reportingPeriod,
      regulatoryDueDate: new Date(body.regulatoryDueDate),
      internalDeadline: new Date(body.internalDeadline),
      clientDataSubmissionDeadline: new Date(body.clientDataSubmissionDeadline),
      assignedConsultantId: session?.userId,
      isRecurringCEA: !!body.isRecurringCEA,
      status: 'PENDING',
      extensionHistory: [],
    });

    return NextResponse.json(
      { success: true, message: 'Calendar deadline registered', data: newItem },
      { status: 201 }
    );
  } catch (error) {
    console.error('Calendar deadline creation failed:', error);
    return NextResponse.json({ error: 'Unable to create calendar deadline.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  let body: any = null;
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    body = (await request.json()) as {
      itemId: string;
      newDate: string;
      reason: string;
      notificationRef: string;
    };

    const newDate = new Date(body.newDate);
    if (Number.isNaN(newDate.getTime())) {
      return NextResponse.json({ error: 'Invalid due date' }, { status: 400 });
    }

    const result = await applyCalendarDueDateExtension({
      itemId: body.itemId,
      newDate,
      reason: body.reason,
      notificationRef: body.notificationRef,
    });

    try {
      const { Notification } = await import('@/models/Notification');
      await Notification.create({
        recipientRole: 'ALL',
        senderRole: session?.role || 'SYSTEM',
        senderName: session?.name || 'Compliance Officer',
        type: 'DEADLINE_EXTENDED',
        title: 'Statutory Due Date Extension Logged',
        message: `${result.complianceType} deadline for ${result.facilityId} (${result.reportingPeriod}) extended to ${newDate.toLocaleDateString()}. Linked data requests updated for the client portal.`,
        facilityId: result.facilityId,
        linkUrl: '/portal/requests',
        isRead: false,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Failed to dispatch deadline extension notification:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Deadline extended; data requests and client due dates updated',
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to extend deadline';
    if (message.toLowerCase().includes('not found')) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.warn('Error extending calendar deadline:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
