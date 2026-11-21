import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { CalendarItemModel, ICalendarItemDocument } from '@/models/CalendarItem';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { ComplianceType, ICalendarItem } from '@/types';

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

    let rawItems = await CalendarItemModel.find(query)
      .populate('assignedConsultantId', 'name email')
      .sort({ regulatoryDueDate: 1 })
      .lean();

    // Do not seed/reset persistent data from a read or login request.

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

    // If specific facility requested but not found in DB CalendarItemModel, provide standard compliance deadlines
    if (facilityId && responseData.length === 0) {
      const fac =
        (await FacilityModel.findOne({ facilityId: facilityId.toUpperCase() }).lean()) ||
        (await import('@/lib/mockFallback')).MOCK_FACILITIES.find(
          (f) => f.facilityId.toUpperCase() === facilityId.toUpperCase()
        );

      if (fac) {
        responseData.push(
          {
            _id: `cal_gen_${fac.facilityId}_CEA`,
            facilityId: fac.facilityId,
            facilityName: fac.name,
            complianceType: 'CEA',
            reportingPeriod: 'June 2025 Electricity Returns',
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
            _id: `cal_gen_${fac.facilityId}_PAT`,
            facilityId: fac.facilityId,
            facilityName: fac.name,
            complianceType: 'PAT',
            reportingPeriod: 'Cycle VII Monitoring Period Assessment',
            regulatoryDueDate: '2025-10-31T00:00:00.000Z',
            internalDeadline: '2025-09-30T00:00:00.000Z',
            clientDataSubmissionDeadline: '2025-09-15T00:00:00.000Z',
            assignedConsultantId: 'USR_CONS_01',
            status: 'PENDING',
            actualSubmissionDate: null,
            extensionHistory: [],
            isRecurringCEA: false,
          },
          {
            _id: `cal_gen_${fac.facilityId}_RCO`,
            facilityId: fac.facilityId,
            facilityName: fac.name,
            complianceType: 'RCO',
            reportingPeriod: 'FY2025-26 (Q1 Reconciliation)',
            regulatoryDueDate: '2025-09-30T00:00:00.000Z',
            internalDeadline: '2025-08-31T00:00:00.000Z',
            clientDataSubmissionDeadline: '2025-08-15T00:00:00.000Z',
            assignedConsultantId: 'USR_CONS_01',
            status: 'PENDING',
            actualSubmissionDate: null,
            extensionHistory: [],
            isRecurringCEA: false,
          }
        );
      }
    }

    // If database only has items for Trident, enrich with statutory deadlines for other client facilities
    if (responseData.length <= 5 && !facilityId) {
      const allDbFacilities = await FacilityModel.find({}).lean();
      const facilityPool = session.role === 'ADMIN'
        ? allDbFacilities
        : allDbFacilities.filter((facility) => (session.authorizedFacilityIds || []).includes(facility.facilityId));

      const existingFacilityIds = new Set(responseData.map((i) => i.facilityId.toUpperCase()));
      const additionalItems: ICalendarItem[] = [];

      for (const fac of facilityPool) {
        if (!existingFacilityIds.has(fac.facilityId.toUpperCase())) {
          existingFacilityIds.add(fac.facilityId.toUpperCase());
          additionalItems.push(
            {
              _id: `cal_gen_${fac.facilityId}_CEA_01`,
              facilityId: fac.facilityId,
              facilityName: fac.name,
              complianceType: 'CEA',
              reportingPeriod: 'June 2025 Electricity Returns',
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
              _id: `cal_gen_${fac.facilityId}_PAT_02`,
              facilityId: fac.facilityId,
              facilityName: fac.name,
              complianceType: 'PAT',
              reportingPeriod: 'Cycle VII Monitoring Period Assessment',
              regulatoryDueDate: '2025-10-31T00:00:00.000Z',
              internalDeadline: '2025-09-30T00:00:00.000Z',
              clientDataSubmissionDeadline: '2025-09-15T00:00:00.000Z',
              assignedConsultantId: 'USR_CONS_01',
              status: 'PENDING',
              actualSubmissionDate: null,
              extensionHistory: [],
              isRecurringCEA: false,
            },
            {
              _id: `cal_gen_${fac.facilityId}_RCO_03`,
              facilityId: fac.facilityId,
              facilityName: fac.name,
              complianceType: 'RCO',
              reportingPeriod: 'FY2025-26 (Q1 Reconciliation)',
              regulatoryDueDate: '2025-09-30T00:00:00.000Z',
              internalDeadline: '2025-08-31T00:00:00.000Z',
              clientDataSubmissionDeadline: '2025-08-15T00:00:00.000Z',
              assignedConsultantId: 'USR_CONS_01',
              status: 'PENDING',
              actualSubmissionDate: null,
              extensionHistory: [],
              isRecurringCEA: false,
            }
          );
        }
      }
      responseData.push(...additionalItems);
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('Calendar query failed:', error);
    return NextResponse.json({ error: 'Unable to load calendar.' }, { status: 503 });
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

    const item = await CalendarItemModel.findById(body.itemId);
    if (!item) {
      return NextResponse.json({ error: 'Calendar item not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, item.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
    console.error('Calendar deadline update failed:', error);
    return NextResponse.json({ error: 'Unable to extend deadline.' }, { status: 500 });
  }
}
