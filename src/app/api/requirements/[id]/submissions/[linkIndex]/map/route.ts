import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { DatasetModel } from '@/models/Dataset';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkIndex: string }> }
) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, linkIndex: linkIndexStr } = await params;
  const linkIndex = Number.parseInt(linkIndexStr, 10);
  if (Number.isNaN(linkIndex) || linkIndex < 0) {
    return NextResponse.json({ error: 'Invalid link index' }, { status: 400 });
  }

  const body = (await request.json()) as {
    action: 'map' | 'verify' | 'reject';
    datasetId?: string;
    month?: string;
    verificationNotes?: string;
  };

  if (!body.action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const requirement = await DataRequirementModel.findById(id);
    if (!requirement) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, requirement.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (requirement.workflowStatus === 'ACCEPTED' || requirement.requirementItemStatus === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'This data request has already been accepted and locked. No further modifications to submissions are allowed.' },
        { status: 400 }
      );
    }

    const link = requirement.submittedDriveLinks[linkIndex];
    if (!link) {
      return NextResponse.json({ error: 'Upload link not found' }, { status: 404 });
    }

    const verifierName = session?.name || 'Consultant';
    const evidenceUrl = link.vaultUrl || link.url;

    if (body.action === 'reject') {
      if (!body.verificationNotes?.trim()) {
        return NextResponse.json({ error: 'Add a clear reason or missing-item note before returning this submission.' }, { status: 400 });
      }
      link.mappingStatus = 'REJECTED';
      link.verificationNotes = body.verificationNotes.trim();
      link.mappedBy = verifierName;
      link.mappedAt = new Date();
      requirement.verificationStatus = 'CLARIFICATION_REQUIRED';
      requirement.workflowStatus = 'CHANGES_REQUESTED';
      requirement.reviewNote = link.verificationNotes;
      requirement.reviewedByName = verifierName;
      requirement.reviewedAt = new Date();
      await requirement.save();
      try {
        const { Notification } = await import('@/models/Notification');
        await Notification.create({
          recipientRole: 'CLIENT', senderRole: session!.role, senderName: verifierName,
          type: 'DATA_CHECKLIST_SHARED', title: 'Action required on submitted evidence',
          message: `${verifierName} returned “${requirement.title}”. Reason: ${link.verificationNotes}`,
          facilityId: requirement.facilityId, linkUrl: '/portal/requests', isRead: false,
        });
      } catch (notificationError) { console.warn('Client review notification failed:', notificationError); }
      return NextResponse.json({ success: true, message: 'Document rejected', data: requirement });
    }

    if ((body.action === 'map' || body.action === 'verify') && body.datasetId && body.month) {
      const dataset = await DatasetModel.findById(body.datasetId);
      if (!dataset) {
        return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
      }

      const monthIdx = dataset.months.findIndex((m) => m.month === body.month);
      if (monthIdx === -1) {
        return NextResponse.json({ error: 'Month not found on dataset' }, { status: 404 });
      }

      dataset.months[monthIdx].evidenceDocumentUrl = evidenceUrl;
      if (!dataset.months[monthIdx].sourceDocumentUrl) {
        dataset.months[monthIdx].sourceDocumentUrl = link.sourceUrl || link.url;
      }
      dataset.months[monthIdx].consultantNotes = [
        dataset.months[monthIdx].consultantNotes,
        body.verificationNotes || `Mapped client upload (${link.fileName || 'drive link'})`,
      ]
        .filter(Boolean)
        .join(' · ');

      dataset.auditTrail.push({
        timestamp: new Date(),
        userId: session?.userId || 'consultant',
        userName: verifierName,
        action: 'CLIENT_DRIVE_MAPPED',
        details: `Linked client vault document to ${body.month} — ${requirement.title}`,
      });

      await dataset.save();

      link.mappingStatus = body.action === 'verify' ? 'VERIFIED' : 'MAPPED';
      link.mappedMonth = body.month;
      link.mappedDatasetId = dataset._id;
      link.mappedAt = new Date();
      link.mappedBy = verifierName;
      link.verificationNotes = body.verificationNotes;
      requirement.datasetId = dataset._id;
      requirement.verificationStatus =
        body.action === 'verify' ? 'AWAITING_APPROVAL' : 'UNDER_REVIEW';
      requirement.workflowStatus = body.action === 'verify' ? 'UNDER_REVIEW' : 'UNDER_REVIEW';
      requirement.reviewNote = body.verificationNotes?.trim() || (body.action === 'verify' ? 'Evidence verified and sent for approval.' : 'Evidence mapped to the verification record.');
      requirement.reviewedByName = verifierName;
      requirement.reviewedAt = new Date();

      await requirement.save();

      return NextResponse.json({
        success: true,
        message:
          body.action === 'verify'
            ? 'Document verified and mapped to reconciliation month'
            : 'Document mapped to dataset month',
        data: { requirement, datasetId: dataset._id.toString(), month: body.month },
      });
    }

    if (body.action === 'verify' && !body.datasetId) {
      link.mappingStatus = 'VERIFIED';
      link.mappedBy = verifierName;
      link.mappedAt = new Date();
      link.verificationNotes = body.verificationNotes;
      requirement.verificationStatus = 'AWAITING_APPROVAL';
      requirement.workflowStatus = 'UNDER_REVIEW';
      requirement.reviewNote = body.verificationNotes?.trim() || 'Evidence verified and sent for approval.';
      requirement.reviewedByName = verifierName;
      requirement.reviewedAt = new Date();
      await requirement.save();
      return NextResponse.json({ success: true, message: 'Document marked verified', data: requirement });
    }

    return NextResponse.json(
      { error: 'For map/verify with dataset, provide datasetId and month' },
      { status: 400 }
    );
  } catch (error) {
    console.error('map client upload error:', error);
    return NextResponse.json({ error: 'Failed to update mapping' }, { status: 500 });
  }
}
