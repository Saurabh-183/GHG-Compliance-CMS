import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import { syncDriveLinksAfterRequestReview } from '@/lib/syncRequirementDriveLinks';

const allowedStatuses = ['PENDING', 'VERIFIED', 'MISSING', 'INCORRECT', 'CLARIFICATION_REQUIRED'] as const;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = getSessionFromRequest(request);
  if (session?.role === 'ADMIN') {
    return NextResponse.json(
      { error: 'Admins have view-only access to data requests. Only consultants can accept, reject, or request changes.' },
      { status: 403 }
    );
  }
  if (!authorizeRole(session, ['CONSULTANT'])) {
    return NextResponse.json({ error: 'Only consultants can review requests.' }, { status: 403 });
  }

  try {
    await connectToDatabase();
    const { id } = await params;
    const requirement = await DataRequirementModel.findById(id);
    if (!requirement) return NextResponse.json({ error: 'Requirement not found.' }, { status: 404 });
    if (!isAuthorizedForFacility(session, requirement.facilityId)) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

    const body = (await request.json()) as {
      action?: 'START_REVIEW' | 'REQUEST_CHANGES' | 'ACCEPT' | 'REJECT';
      comment?: string;
      dueDate?: string;
      fieldReviews?: Array<{ fieldKey: string; status: string; comment?: string }>;
    };
    const reviewer = session!.name;
    const now = new Date();
    if (body.dueDate && !isNaN(new Date(body.dueDate).getTime())) {
      if (requirement.workflowStatus !== 'SUBMITTED') {
        requirement.dueDate = new Date(body.dueDate);
      }
    }
    if (body.fieldReviews) {
      if (body.fieldReviews.some((review) => !review.fieldKey?.trim() || !allowedStatuses.includes(review.status as typeof allowedStatuses[number]))) {
        return NextResponse.json({ error: 'Each field review needs a valid field and status.' }, { status: 400 });
      }
      requirement.fieldReviews = body.fieldReviews.map((review) => ({
        fieldKey: review.fieldKey.trim(), status: review.status as typeof allowedStatuses[number], comment: review.comment?.trim(), reviewedBy: reviewer, reviewedAt: now,
      }));
    }

    const action = body.action || (requirement.fieldReviews?.some((review) => ['MISSING', 'INCORRECT', 'CLARIFICATION_REQUIRED'].includes(review.status)) ? 'REQUEST_CHANGES' : 'START_REVIEW');
    const nextStatus = action === 'ACCEPT' ? 'ACCEPTED' : action === 'REJECT' ? 'REJECTED' : action === 'REQUEST_CHANGES' ? 'CHANGES_REQUESTED' : 'UNDER_REVIEW';
    if (['REQUEST_CHANGES', 'REJECT'].includes(action) && !body.comment?.trim() && !requirement.fieldReviews?.some((review) => review.comment?.trim())) {
      return NextResponse.json({ error: 'Add a review comment before returning this request.' }, { status: 400 });
    }
    if (action === 'ACCEPT') {
      const fields = requirement.requiredFields || [];
      const reviews = requirement.fieldReviews || [];
      if (fields.length > 0) {
        const unverified = fields.some((f) => {
          const rev = reviews.find((r) => r.fieldKey === f.key);
          return !rev || rev.status !== 'VERIFIED';
        });
        if (unverified) {
          return NextResponse.json(
            { error: 'All fields must be marked as Verified before accepting the submission.' },
            { status: 400 }
          );
        }
      } else if (reviews.length > 0 && reviews.some((r) => r.status !== 'VERIFIED')) {
        return NextResponse.json(
          { error: 'All fields must be marked as Verified before accepting the submission.' },
          { status: 400 }
        );
      }
    }
    try {
      const { assertTransition } = await import('@/lib/requestWorkflow');
      assertTransition(requirement.workflowStatus as import('@/types').RequestWorkflowStatus, nextStatus);
    } catch (transitionError) {
      const message = transitionError instanceof Error ? transitionError.message : 'Invalid transition';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    requirement.workflowStatus = nextStatus;
    requirement.requirementItemStatus =
      action === 'ACCEPT'
        ? 'ACCEPTED'
        : action === 'REJECT'
          ? 'REJECTED'
          : action === 'REQUEST_CHANGES'
            ? 'CHANGES_REQUESTED'
            : 'UNDER_REVIEW';
    requirement.verificationStatus = action === 'ACCEPT' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : action === 'REQUEST_CHANGES' ? 'CLARIFICATION_REQUIRED' : 'UNDER_REVIEW';
    if (action === 'ACCEPT') {
      requirement.approvedByRole = session!.role === 'CONSULTANT' ? 'CONSULTANT' : 'ADMIN';
      const latest = requirement.submissionHistory?.[requirement.submissionHistory.length - 1];
      if (latest?.structuredData) {
        requirement.latestStructuredData = latest.structuredData;
      }
    }
    requirement.reviewNote = body.comment?.trim() || requirement.fieldReviews?.map((review) => review.comment).filter(Boolean).join(' ') || undefined;
    requirement.reviewedByName = reviewer;
    requirement.reviewedAt = now;
    requirement.history = requirement.history || [];
    requirement.history.push({ status: nextStatus, changedAt: now, changedBy: reviewer, comment: requirement.reviewNote });

    syncDriveLinksAfterRequestReview(requirement, action, body.comment?.trim());

    await requirement.save();

    try {
      const { Notification } = await import('@/models/Notification');
      await Notification.create({ recipientRole: 'CLIENT', senderRole: session!.role, senderName: reviewer, type: 'EVIDENCE_SUBMITTED', title: `Request ${nextStatus.replace('_', ' ').toLowerCase()}`, message: `${reviewer} updated ${requirement.title} (${requirement.requestId || id}) to ${nextStatus.replaceAll('_', ' ')}.${requirement.reviewNote ? ` ${requirement.reviewNote}` : ''}`, facilityId: requirement.facilityId, linkUrl: `/portal/requests/${id}`, isRead: false });
    } catch (error) { console.warn('Review notification failed:', error); }

    return NextResponse.json({ success: true, data: requirement, message: `Request marked ${nextStatus.replaceAll('_', ' ')}.` });
  } catch (error) {
    console.error('Request review failed:', error);
    return NextResponse.json({ error: 'Unable to save request review.' }, { status: 500 });
  }
}
