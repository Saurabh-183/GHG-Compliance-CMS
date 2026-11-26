import { isSoftwareSubmittedEvidence } from '@/lib/clientMonthlyEvidenceRows';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import { assertTransition } from '@/lib/requestWorkflow';
import type { ComplianceType, RequestFieldType, RequestWorkflowStatus } from '@/types';
import { Notification } from '@/models/Notification';
import { resolveRequirementDueDate } from '@/lib/dataRequestDueDate';

function serializeRequirement(r: Record<string, unknown>) {
  const doc = r as {
    _id: { toString: () => string };
    dueDate?: Date | string;
    reviewedAt?: Date;
    requestedAt?: Date;
    submittedDriveLinks?: Array<Record<string, unknown>>;
    datasetId?: { toString?: () => string };
  };
  const resolvedDue = resolveRequirementDueDate(
    doc.dueDate,
    String(r.period || ''),
    doc.requestedAt || (r.createdAt as string)
  );
  return {
    ...r,
    _id: doc._id.toString(),
    datasetId: doc.datasetId?.toString?.() ?? doc.datasetId,
    dueDate: resolvedDue,
    reviewedAt: doc.reviewedAt instanceof Date ? doc.reviewedAt.toISOString() : doc.reviewedAt ?? null,
    requestedAt: doc.requestedAt instanceof Date ? doc.requestedAt.toISOString() : doc.requestedAt ?? null,
    submittedDriveLinks: (doc.submittedDriveLinks || []).map((link) => ({
      ...link,
      submittedAt:
        link.submittedAt instanceof Date
          ? link.submittedAt.toISOString()
          : link.submittedAt
            ? new Date(String(link.submittedAt)).toISOString()
            : null,
    })),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const requirement = await DataRequirementModel.findById(id).populate('datasetId').lean();
    if (!requirement) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

    if (!isAuthorizedForFacility(session, requirement.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.role === 'CONSULTANT') {
      const facility = await FacilityModel.findOne({ facilityId: requirement.facilityId })
        .select('assignedConsultantId name')
        .lean();
      if (
        facility?.assignedConsultantId &&
        facility.assignedConsultantId.toString() !== session.userId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const facility = await FacilityModel.findOne({ facilityId: requirement.facilityId }).lean();
    const serialized = serializeRequirement(requirement as unknown as Record<string, unknown>);

    if (!requirement.dueDate && serialized.dueDate) {
      void DataRequirementModel.findByIdAndUpdate(id, { dueDate: new Date(serialized.dueDate) }).catch(() => undefined);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...serializeRequirement({
          ...requirement,
          submittedDriveLinks: session.role === 'CLIENT'
            ? (requirement.submittedDriveLinks || []).filter(isSoftwareSubmittedEvidence)
            : requirement.submittedDriveLinks,
        }),
        ...serialized,
        requestId:
          requirement.requestId || `REQ-${requirement._id.toString().slice(-8).toUpperCase()}`,
        facilityName: facility?.name,
        utilityConnection: facility?.utilityConnection,
      },
    });
  } catch (error) {
    console.error('GET requirement failed:', error);
    return NextResponse.json({ error: 'Unable to load request details.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const requirement = await DataRequirementModel.findById(id);
    if (!requirement) return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });

    if (!isAuthorizedForFacility(session, requirement.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (requirement.workflowStatus === 'ACCEPTED' || requirement.requirementItemStatus === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This data request has already been accepted and locked. No modifications or status changes are permitted.' },
        { status: 400 }
      );
    }

    const body = (await request.json()) as {
      action?:
        | 'SAVE_DRAFT'
        | 'SEND_TO_CLIENT'
        | 'CLIENT_SAVE_DRAFT'
        | 'CLOSE'
        | 'UPDATE';
      title?: string;
      description?: string;
      purpose?: string;
      dueDate?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      requiredFields?: Array<{
        key: string;
        label: string;
        type: RequestFieldType;
        required?: boolean;
        options?: string[];
      }>;
      requiredDocuments?: string[];
      submissionInstructions?: string;
      linkedCompliances?: ComplianceType[];
      structuredData?: Record<string, unknown>;
      comment?: string;
    };

    const actor = session.name;
    const now = new Date();
    const action = body.action || 'UPDATE';

    if (action === 'CLIENT_SAVE_DRAFT') {
      if (session.role !== 'CLIENT') {
        return NextResponse.json({ error: 'Only client users can save drafts.' }, { status: 403 });
      }
      requirement.clientDraftData = {
        structuredData: body.structuredData || {},
        comment: body.comment?.trim(),
        updatedAt: now,
        updatedBy: actor,
      };
      if (requirement.workflowStatus === 'REQUESTED' || requirement.workflowStatus === 'CHANGES_REQUESTED') {
        try {
          assertTransition(requirement.workflowStatus, 'IN_PROGRESS');
        } catch {
          /* keep current if transition invalid */
        }
        if (['REQUESTED', 'CHANGES_REQUESTED'].includes(requirement.workflowStatus || '')) {
          requirement.workflowStatus = 'IN_PROGRESS';
          requirement.history = requirement.history || [];
          requirement.history.push({
            status: 'IN_PROGRESS',
            changedAt: now,
            changedBy: actor,
            comment: 'Client started completing the request.',
          });
        }
      }
      await requirement.save();
      return NextResponse.json({ success: true, message: 'Draft saved.', data: requirement });
    }

    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.role === 'CONSULTANT') {
      const facility = await FacilityModel.findOne({ facilityId: requirement.facilityId }).lean();
      if (
        facility?.assignedConsultantId &&
        facility.assignedConsultantId.toString() !== session.userId
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (action === 'UPDATE' || action === 'SAVE_DRAFT') {
      if (body.title?.trim()) requirement.title = body.title.trim();
      if (body.description?.trim()) requirement.description = body.description.trim();
      if (body.purpose !== undefined) requirement.purpose = body.purpose?.trim();
      if (body.priority) requirement.priority = body.priority;
      if (body.requiredFields) {
        requirement.requiredFields = body.requiredFields.map((field) => ({
          ...field,
          required: Boolean(field.required),
        }));
      }
      if (body.requiredDocuments) requirement.requiredDocuments = body.requiredDocuments;
      if (body.submissionInstructions !== undefined) {
        requirement.submissionInstructions = body.submissionInstructions?.trim();
      }
      if (body.linkedCompliances?.length) requirement.linkedCompliances = body.linkedCompliances;
      if (body.dueDate) requirement.dueDate = new Date(body.dueDate);

      if (action === 'SAVE_DRAFT') {
        requirement.workflowStatus = 'DRAFT';
        requirement.submissionStatus = 'NOT_REQUESTED';
        requirement.history = requirement.history || [];
        requirement.history.push({ status: 'DRAFT', changedAt: now, changedBy: actor });
      }
      await requirement.save();
      return NextResponse.json({ success: true, message: 'Request updated.', data: requirement });
    }

    if (action === 'SEND_TO_CLIENT') {
      if (!requirement.dueDate && !body.dueDate?.trim()) {
        return NextResponse.json(
          { error: 'Set a client submission due date before sending this request.' },
          { status: 400 }
        );
      }
      if (body.dueDate?.trim()) {
        requirement.dueDate = new Date(body.dueDate);
      }
      const from = (requirement.workflowStatus || 'DRAFT') as RequestWorkflowStatus;
      assertTransition(from, 'REQUESTED');
      requirement.workflowStatus = 'REQUESTED';
      requirement.submissionStatus = 'REQUESTED';
      requirement.requestedAt = requirement.requestedAt || now;
      requirement.history = requirement.history || [];
      requirement.history.push({
        status: 'REQUESTED',
        changedAt: now,
        changedBy: actor,
        comment: 'Request sent to client.',
      });
      await requirement.save();

      try {
        await Notification.create({
          recipientRole: 'CLIENT',
          senderRole: session.role === 'ADMIN' ? 'ADMIN' : 'CONSULTANT',
          senderName: actor,
          type: 'DATA_CHECKLIST_SHARED',
          title: `New data request — ${requirement.title}`,
          message: `${actor} sent request ${requirement.requestId || id} for ${requirement.period}. Due ${requirement.dueDate ? new Date(requirement.dueDate).toLocaleDateString() : 'as per instruction'}.`,
          facilityId: requirement.facilityId,
          linkUrl: `/portal/requests/${id}`,
          isRead: false,
        });
      } catch (e) {
        console.warn('Send notification failed:', e);
      }

      return NextResponse.json({ success: true, message: 'Request sent to client.', data: requirement });
    }

    if (action === 'CLOSE') {
      assertTransition(requirement.workflowStatus as RequestWorkflowStatus, 'CLOSED');
      requirement.workflowStatus = 'CLOSED';
      requirement.history = requirement.history || [];
      requirement.history.push({ status: 'CLOSED', changedAt: now, changedBy: actor, comment: body.comment?.trim() });
      await requirement.save();

      try {
        await Notification.create({
          recipientRole: 'CLIENT',
          senderRole: session.role,
          senderName: actor,
          type: 'DATA_CHECKLIST_SHARED',
          title: `Request closed — ${requirement.title}`,
          message: body.comment?.trim() || 'This data request has been closed.',
          facilityId: requirement.facilityId,
          linkUrl: `/portal/requests/${id}`,
          isRead: false,
        });
      } catch (e) {
        console.warn('Close notification failed:', e);
      }

      return NextResponse.json({ success: true, message: 'Request closed.', data: requirement });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Update failed';
  console.error('PATCH requirement failed:', error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}