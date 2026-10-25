import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CalendarItemModel, ICalendarItemDocument } from '@/models/CalendarItem';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { ComplianceType, ICalendarItem } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session && session.role === 'CLIENT' && session.authorizedFacilityIds) {
      query.facilityId = { $in: session.authorizedFacilityIds };
    }

    if (status) query.status = status;

    let rawItems = await CalendarItemModel.find(query)
      .populate('assignedConsultantId', 'name email')
      .sort({ regulatoryDueDate: 1 })
      .lean();

    if (rawItems.length === 0 && !facilityId) {
      const totalCount = await CalendarItemModel.countDocuments();
      if (totalCount === 0) {
        const { seedDatabase } = await import('@/lib/seedData');
        await seedDatabase();
        rawItems = await CalendarItemModel.find(query)
          .populate('assignedConsultantId', 'name email')
          .sort({ regulatoryDueDate: 1 })
          .lean();
      }
    }

    const items = rawItems as unknown as (ICalendarItemDocument & { _id: { toString(): string } })[];

    // Map facility names
    const facilityCodes = Array.from(new Set(items.map((i) => i.facilityId)));
    const facilities = await FacilityModel.find({ facilityId: { $in: facilityCodes } }).lean();
    const facilityNameMap = new Map<string, string>();
    facilities.forEach((f) => facilityNameMap.set(f.facilityId, f.name));

    const responseData: ICalendarItem[] = items.map((i) => ({
      _id: i._id.toString(),
      facilityId: i.facilityId,
      facilityName: facilityNameMap.get(i.facilityId) || i.facilityId,
      complianceType: i.complianceType,
      reportingPeriod: i.reportingPeriod,
      regulatoryDueDate: new Date(i.regulatoryDueDate).toISOString(),
      internalDeadline: new Date(i.internalDeadline).toISOString(),
      clientDataSubmissionDeadline: new Date(i.clientDataSubmissionDeadline).toISOString(),
      assignedConsultantId: i.assignedConsultantId ? i.assignedConsultantId.toString() : '',
      status: i.status,
      actualSubmissionDate: i.actualSubmissionDate ? new Date(i.actualSubmissionDate).toISOString() : null,
      extensionHistory: (i.extensionHistory || []).map((h) => ({
        oldDate: new Date(h.oldDate).toISOString(),
        newDate: new Date(h.newDate).toISOString(),
        reason: h.reason,
        notificationRef: h.notificationRef,
        revisedAt: new Date(h.revisedAt).toISOString(),
      })),
      isRecurringCEA: i.isRecurringCEA,
    }));

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.warn('Error fetching calendar from DB, returning fallback demo calendar:', error);
    const demoCalendarItems: ICalendarItem[] = [
      {
        _id: 'cal_demo_01',
        facilityId: 'TRIDENT_PAPER',
        facilityName: 'Trident Paper Complex',
        complianceType: 'CEA',
        reportingPeriod: 'June 2025',
        regulatoryDueDate: '2025-07-15T00:00:00.000Z',
        internalDeadline: '2025-07-10T00:00:00.000Z',
        clientDataSubmissionDeadline: '2025-07-05T00:00:00.000Z',
        assignedConsultantId: 'USR_CONS_01',
        status: 'PENDING',
        actualSubmissionDate: null,
        extensionHistory: [],
        isRecurringCEA: true,
      },
      {
        _id: 'cal_demo_02',
        facilityId: 'TRIDENT_PAPER',
        facilityName: 'Trident Paper Complex',
        complianceType: 'PAT',
        reportingPeriod: 'Cycle VII (FY2024-25)',
        regulatoryDueDate: '2025-08-31T00:00:00.000Z',
        internalDeadline: '2025-08-15T00:00:00.000Z',
        clientDataSubmissionDeadline: '2025-08-01T00:00:00.000Z',
        assignedConsultantId: 'USR_CONS_01',
        status: 'PENDING',
        actualSubmissionDate: null,
        extensionHistory: [
          {
            oldDate: '2025-07-31T00:00:00.000Z',
            newDate: '2025-08-31T00:00:00.000Z',
            reason: 'BEE notification granting 30-day reporting extension for Pulp & Paper DCs',
            notificationRef: 'BEE/PAT/VII/EXT-2025/14',
            revisedAt: '2025-07-20T10:00:00.000Z',
          },
        ],
        isRecurringCEA: false,
      },
      {
        _id: 'cal_demo_03',
        facilityId: 'TRIDENT_PAPER',
        facilityName: 'Trident Paper Complex',
        complianceType: 'CCTS',
        reportingPeriod: 'FY2024-25',
        regulatoryDueDate: '2025-09-30T00:00:00.000Z',
        internalDeadline: '2025-09-15T00:00:00.000Z',
        clientDataSubmissionDeadline: '2025-09-01T00:00:00.000Z',
        assignedConsultantId: 'USR_CONS_01',
        status: 'PENDING',
        actualSubmissionDate: null,
        extensionHistory: [],
        isRecurringCEA: false,
      },
      {
        _id: 'cal_demo_04',
        facilityId: 'TRIDENT_PAPER',
        facilityName: 'Trident Paper Complex',
        complianceType: 'RCO',
        reportingPeriod: 'FY2025-26',
        regulatoryDueDate: '2026-06-30T00:00:00.000Z',
        internalDeadline: '2026-06-15T00:00:00.000Z',
        clientDataSubmissionDeadline: '2026-06-01T00:00:00.000Z',
        assignedConsultantId: 'USR_CONS_01',
        status: 'PENDING',
        actualSubmissionDate: null,
        extensionHistory: [],
        isRecurringCEA: false,
      },
    ];

    return NextResponse.json({
      success: true,
      data: demoCalendarItems,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      facilityId: string;
      complianceType: ComplianceType;
      reportingPeriod: string;
      regulatoryDueDate: string;
      internalDeadline: string;
      clientDataSubmissionDeadline: string;
      isRecurringCEA?: boolean;
    };

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
    console.error('Error creating calendar deadline:', error);
    return NextResponse.json({ error: 'Failed to create calendar deadline' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as {
      itemId: string;
      newDate: string;
      reason: string;
      notificationRef: string;
    };

    const item = await CalendarItemModel.findById(body.itemId);
    if (!item) {
      return NextResponse.json({ error: 'Calendar item not found' }, { status: 404 });
    }

    const oldDate = item.regulatoryDueDate;
    item.extensionHistory.push({
      oldDate,
      newDate: new Date(body.newDate),
      reason: body.reason,
      notificationRef: body.notificationRef,
      revisedAt: new Date(),
    });

    item.regulatoryDueDate = new Date(body.newDate);
    item.status = 'EXTENDED';
    await item.save();

    // Trigger notification to all users regarding statutory deadline extension
    try {
      const { Notification } = await import('@/models/Notification');
      await Notification.create({
        recipientRole: 'ALL',
        senderRole: session?.role || 'SYSTEM',
        senderName: session?.name || 'Compliance Officer',
        type: 'DEADLINE_EXTENDED',
        title: 'Statutory Due Date Extension Logged',
        message: `${item.complianceType} compliance deadline for ${item.facilityId} has been extended to ${body.newDate}. Reason: "${body.reason}".`,
        facilityId: item.facilityId,
        linkUrl: '/calendar',
        isRead: false,
        createdAt: new Date(),
      });
    } catch (e) {
      console.warn('Failed to dispatch deadline extension notification:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Deadline extended and revision history logged',
      data: item,
    });
  } catch (error) {
    console.error('Error extending deadline:', error);
    return NextResponse.json({ error: 'Failed to extend deadline' }, { status: 500 });
  }
}
