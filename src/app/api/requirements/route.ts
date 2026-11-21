import { NextRequest, NextResponse } from 'next/server';
import '@/models/Dataset';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel, type IDataRequirementDocument } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import { ClientGroupModel } from '@/models/ClientGroup';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { ComplianceType, RequestFieldType, ReportingFrequency } from '@/types';
import { Notification } from '@/models/Notification';
import { validateRequirementCreatePayload } from '@/lib/validateRequirementPayload';
import { ALLOWED_FIELD_TYPES } from '@/lib/requestFieldUtils';

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
    const facilityMeta = new Map(
      facilities.map((f) => [
        f.facilityId,
        { name: f.name, location: f.location, clientGroupId: f.clientGroupId?.toString() },
      ])
    );
    const groupIds = [...new Set(facilities.map((f) => f.clientGroupId?.toString()).filter(Boolean))];
    const groups = await ClientGroupModel.find({ _id: { $in: groupIds } }).select('name code').lean();
    const groupNameById = new Map(groups.map((g) => [g._id.toString(), g.name]));

    return NextResponse.json({
      success: true,
      data: requirements.map((r) => {
        const meta = facilityMeta.get(r.facilityId);
        const clientGroupName = meta?.clientGroupId
          ? groupNameById.get(meta.clientGroupId)
          : undefined;
        return {
        ...r,
        _id: r._id.toString(),
        requestId: r.requestId || `REQ-${r._id.toString().slice(-8).toUpperCase()}`,
        facilityName: meta?.name,
        facilityLocation: meta?.location,
        clientGroupName,
        utilityConnection: connectionByFacility.get(r.facilityId) || undefined,
        dueDate: r.dueDate
          ? r.dueDate instanceof Date
            ? r.dueDate.toISOString()
            : new Date(r.dueDate).toISOString()
          : null,
        reviewedAt: r.reviewedAt
          ? r.reviewedAt instanceof Date
            ? r.reviewedAt.toISOString()
            : new Date(r.reviewedAt).toISOString()
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
      };
      }),
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
      facilityIds?: string[];
      period: string;
      title: string;
      category: 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC';
      linkedCompliances?: ComplianceType[];
      description: string;
      dueDate?: string;
      monthlyFrequency?: boolean;
      reportingMonths?: string[];
      purpose?: string;
      dataCategory?: string;
      templateId?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      requiredFields?: Array<{ key: string; label: string; type: RequestFieldType; required?: boolean; options?: string[]; unit?: string; helpText?: string }>;
      requiredDocuments?: string[];
      submissionInstructions?: string;
      saveAsDraft?: boolean;
      templateIds?: string[];
      reportingFrequency?: ReportingFrequency;
      reportingPeriodStart?: string;
      reportingPeriodEnd?: string;
      requiredDocumentSpecs?: Array<{
        name: string;
        description?: string;
        required?: boolean;
        acceptedFileTypes?: string[];
        sampleUrl?: string;
      }>;
      submissionFormat?: string;
      allowPartialSubmission?: boolean;
      assignedClientContact?: string;
    };

  const payloadError = validateRequirementCreatePayload({
    facilityId: body.facilityId,
    period: body.period,
    title: body.title,
    description: body.description,
    dataCategory: body.dataCategory,
    requiredFields: body.requiredFields?.map((field) => ({ ...field, required: Boolean(field.required) })),
    requiredDocuments: body.requiredDocuments,
    requiredDocumentSpecs: body.requiredDocumentSpecs?.map((doc) => ({ ...doc, required: doc.required !== false })),
    saveAsDraft: body.saveAsDraft,
    dueDate: body.dueDate,
    reportingFrequency: body.reportingFrequency,
    reportingMonths: body.reportingMonths,
    monthlyFrequency: body.monthlyFrequency ?? body.reportingFrequency === 'MONTHLY',
    reportingPeriodStart: body.reportingPeriodStart,
    reportingPeriodEnd: body.reportingPeriodEnd,
  });
  if (payloadError) {
    return NextResponse.json({ error: payloadError }, { status: 400 });
  }

    if (!body.facilityId?.trim() || !body.period?.trim() || !body.title?.trim() || !body.description?.trim()) {
      return NextResponse.json({ error: 'facilityId, period, title and description are required.' }, { status: 400 });
    }
    if (!['COMMON_ENERGY', 'COMPLIANCE_SPECIFIC'].includes(body.category)) {
      return NextResponse.json({ error: 'Select a valid requirement category.' }, { status: 400 });
    }
    const linkedCompliances: ComplianceType[] =
      Array.isArray(body.linkedCompliances) && body.linkedCompliances.length > 0
        ? body.linkedCompliances
        : ['RCO'];
    if (linkedCompliances.some((c) => !['RCO', 'PAT', 'CCTS', 'CEA'].includes(c))) {
      return NextResponse.json({ error: 'Select valid compliance frameworks.' }, { status: 400 });
    }
    if (body.priority && !['LOW', 'MEDIUM', 'HIGH'].includes(body.priority)) {
      return NextResponse.json({ error: 'Select a valid priority.' }, { status: 400 });
    }
    if (
      body.requiredFields?.some(
        (field) =>
          !field.key?.trim() ||
          !field.label?.trim() ||
          !ALLOWED_FIELD_TYPES.includes(field.type as RequestFieldType)
      )
    ) {
      return NextResponse.json({ error: 'Every required field must have a valid key, label and type.' }, { status: 400 });
    }
    const facility = await FacilityModel.findOne({ facilityId: body.facilityId.toUpperCase() }).lean();
    if (!facility) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
    if (session!.role === 'CONSULTANT' && facility.assignedConsultantId && facility.assignedConsultantId.toString() !== session!.userId) {
      return NextResponse.json({ error: 'This facility is not assigned to your consultant account.' }, { status: 403 });
    }
    if (body.dueDate && Number.isNaN(Date.parse(body.dueDate))) {
      return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
    }
    const reportingFrequency = body.reportingFrequency || (body.monthlyFrequency ? 'MONTHLY' : 'ONE_TIME');
    const monthlyFrequency = reportingFrequency === 'MONTHLY' || body.monthlyFrequency === true;

    const targetFacilities = [
      ...new Set(
        [body.facilityId, ...(body.facilityIds || [])]
          .filter(Boolean)
          .map((id) => id.toUpperCase())
      ),
    ];

    const created: IDataRequirementDocument[] = [];
    for (const fid of targetFacilities) {
      const targetFacility = await FacilityModel.findOne({ facilityId: fid }).lean();
      if (!targetFacility) {
        return NextResponse.json({ error: `Facility not found: ${fid}` }, { status: 404 });
      }
      if (
        session!.role === 'CONSULTANT' &&
        targetFacility.assignedConsultantId &&
        targetFacility.assignedConsultantId.toString() !== session!.userId
      ) {
        return NextResponse.json({ error: `Facility ${fid} is not assigned to you.` }, { status: 403 });
      }

      const requestId = `DR-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const workflowStatus = body.saveAsDraft ? 'DRAFT' : 'REQUESTED';
      const submissionStatus = body.saveAsDraft ? 'NOT_REQUESTED' : 'REQUESTED';

      const docNames = [
        ...(body.requiredDocuments || []),
        ...(body.requiredDocumentSpecs || []).map((d) => d.name),
      ].filter(Boolean);

      const newReq = await DataRequirementModel.create({
        ...body,
        linkedCompliances,
        requestId,
        title: body.title.trim(),
        description: body.description.trim(),
        submissionInstructions: body.submissionInstructions || body.description.trim(),
        requiredDocuments: [...new Set(docNames)],
        requiredDocumentSpecs: body.requiredDocumentSpecs,
        reportingFrequency,
        monthlyFrequency,
        requestedBy: session!.userId,
        requestedByName: session!.name,
        assignedClientContact: body.assignedClientContact,
        allowPartialSubmission: body.allowPartialSubmission !== false,
        facilityId: fid,
        submissionStatus,
        verificationStatus: 'NOT_STARTED',
        workflowStatus,
        history: [{ status: workflowStatus, changedAt: new Date(), changedBy: session!.name }],
        requestedAt: body.saveAsDraft ? undefined : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      });
      created.push(newReq);

      if (!body.saveAsDraft) {
        try {
          await Notification.create({
            recipientRole: 'CLIENT',
            senderRole: session!.role === 'ADMIN' ? 'ADMIN' : 'CONSULTANT',
            senderName: session!.name,
            type: 'DATA_CHECKLIST_SHARED',
            title: `New data request — ${targetFacility.name}`,
            message: `${session!.name} requested ${body.title.trim()} (${requestId}) for ${body.period}. Open Data Requests to respond.`,
            facilityId: targetFacility.facilityId,
            linkUrl: `/portal/requests/${newReq._id.toString()}`,
            isRead: false,
          });
        } catch (notificationError) {
          console.error('Data request was saved but client notification failed:', notificationError);
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: body.saveAsDraft
          ? 'Draft data request saved.'
          : `Data requirement created for ${created.length} facility(ies) and client notified`,
        data: created.length === 1 ? created[0] : created,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating requirement:', error);
    return NextResponse.json({ error: 'Unable to create data request. Check database connection and request details.' }, { status: 500 });
  }
}
