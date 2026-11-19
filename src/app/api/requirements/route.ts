import { NextRequest, NextResponse } from 'next/server';
import '@/models/Dataset';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { ComplianceType } from '@/types';
import { Notification } from '@/models/Notification';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role === 'CLIENT' && !session.authorizedFacilityIds?.length) {
      return NextResponse.json({ success: true, data: [] });
    }
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');
    const period = searchParams.get('period');

    const query: {
      facilityId?: string | { $in: string[] };
      period?: string;
    } = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session.role === 'CLIENT') {
      query.facilityId = { $in: session.authorizedFacilityIds || [] };
    } else if (!['ADMIN', 'CONSULTANT'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (period) query.period = period;

    if (session.role === 'CONSULTANT') {
      if (facilityId) {
        const assignedFacility = await FacilityModel.findOne({ facilityId: facilityId.toUpperCase() }).select('assignedConsultantId').lean();
        if (!assignedFacility || assignedFacility.assignedConsultantId?.toString() !== session.userId) {
          return NextResponse.json({ error: 'This facility is not assigned to your consultant account.' }, { status: 403 });
        }
      } else {
        const assignedFacilities = await FacilityModel.find({ assignedConsultantId: session.userId }).select('facilityId').lean();
        query.facilityId = { $in: assignedFacilities.map((facility) => facility.facilityId) };
      }
    }

    const requirements = await DataRequirementModel.find(query)
      .populate('datasetId')
      .sort({ dueDate: 1 })
      .lean();

    const facilityIds = [...new Set(requirements.map((r) => r.facilityId))];
    const facilities = await FacilityModel.find({ facilityId: { $in: facilityIds } }).lean();
    const connectionByFacility = new Map(facilities.map((f) => [f.facilityId, f.utilityConnection]));

    return NextResponse.json({
      success: true,
      data: requirements.map((r) => ({
        ...r,
        _id: r._id.toString(),
        datasetId: r.datasetId
          ? typeof r.datasetId === 'object' && '_id' in (r.datasetId as any)
            ? String((r.datasetId as any)._id)
            : r.datasetId.toString()
          : undefined,
        utilityConnection: connectionByFacility.get(r.facilityId) || undefined,
        dueDate: r.dueDate
          ? r.dueDate instanceof Date
            ? r.dueDate.toISOString()
            : new Date(r.dueDate).toISOString()
          : null,
        requestedAt: r.requestedAt
          ? r.requestedAt instanceof Date
            ? r.requestedAt.toISOString()
            : new Date(r.requestedAt).toISOString()
          : null,
        submittedDriveLinks: (r.submittedDriveLinks || []).map((link) => ({
          ...link,
          submittedAt:
            link.submittedAt instanceof Date
              ? link.submittedAt.toISOString()
              : link.submittedAt
              ? new Date(link.submittedAt).toISOString()
              : null,
          mappedAt:
            link.mappedAt instanceof Date
              ? link.mappedAt.toISOString()
              : link.mappedAt
              ? new Date(link.mappedAt).toISOString()
              : null,
          mappedDatasetId: link.mappedDatasetId?.toString?.() ?? link.mappedDatasetId,
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching client data requirements:', error);
    return NextResponse.json({ error: 'Unable to load data requests. Check the database connection.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Consultants or Admins can create requirements' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      facilityId: string;
      period: string;
      title: string;
      category: 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC';
      linkedCompliances: ComplianceType[];
      description: string;
      dueDate?: string;
      monthlyFrequency?: boolean;
      reportingMonths?: string[];
    };

    if (!body.facilityId?.trim() || !body.period?.trim() || !body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'facilityId, period, title and description are required.' }, { status: 400 });
    }
    if (!['COMMON_ENERGY', 'COMPLIANCE_SPECIFIC'].includes(body.category)) {
      return NextResponse.json({ error: 'Select a valid requirement category.' }, { status: 400 });
    }
    if (!Array.isArray(body.linkedCompliances) || body.linkedCompliances.length === 0 || body.linkedCompliances.some((c) => !['RCO', 'PAT', 'CCTS', 'CEA'].includes(c))) {
      return NextResponse.json({ error: 'Select at least one valid compliance.' }, { status: 400 });
    }
    const facility = await FacilityModel.findOne({ facilityId: body.facilityId.toUpperCase() }).lean();
    if (!facility) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
    if (session!.role === 'CONSULTANT' && facility.assignedConsultantId && facility.assignedConsultantId.toString() !== session!.userId) {
      return NextResponse.json({ error: 'This facility is not assigned to your consultant account.' }, { status: 403 });
    }
    if (body.dueDate && Number.isNaN(Date.parse(body.dueDate))) {
      return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
    }
    if (body.monthlyFrequency && (!Array.isArray(body.reportingMonths) || body.reportingMonths.length === 0 || body.reportingMonths.some((month) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)))) {
      return NextResponse.json({ error: 'Monthly requests require reporting months in YYYY-MM format.' }, { status: 400 });
    }

    const newReq = await DataRequirementModel.create({
      ...body,
      title: body.title.trim(),
      description: body.description.trim(),
      requestedBy: session!.userId,
      requestedByName: session!.name,
      facilityId: body.facilityId.toUpperCase(),
      submissionStatus: 'REQUESTED',
      verificationStatus: 'NOT_STARTED',
      requestedAt: new Date(),
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });

    try {
      await Notification.create({
        recipientRole: 'CLIENT',
        senderRole: session!.role === 'ADMIN' ? 'ADMIN' : 'CONSULTANT',
        senderName: session!.name,
        type: 'DATA_CHECKLIST_SHARED',
        title: `New data request — ${facility.name}`,
        message: `${session!.name} requested ${body.title.trim()} for ${body.period}. Please open the Data Requests page to submit the required evidence.`,
        facilityId: facility.facilityId,
        linkUrl: '/portal/requests',
        isRead: false,
      });
    } catch (notificationError) {
      console.error('Data request was saved but client notification failed:', notificationError);
    }

    return NextResponse.json(
      { success: true, message: 'Data requirement created and client notified', data: newReq },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating requirement:', error);
    return NextResponse.json({ error: 'Unable to create data request. Check database connection and request details.' }, { status: 500 });
  }
}
