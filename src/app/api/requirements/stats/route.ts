import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import type { RequestWorkflowStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const facilityId = request.nextUrl.searchParams.get('facilityId');
    const query: { facilityId?: string | { $in: string[] } } = {};

    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    } else if (session.role === 'CLIENT') {
      query.facilityId = { $in: session.authorizedFacilityIds || [] };
    } else if (session.role === 'CONSULTANT') {
      const assigned = await FacilityModel.find({ assignedConsultantId: session.userId })
        .select('facilityId')
        .lean();
      query.facilityId = { $in: assigned.map((f) => f.facilityId) };
    } else if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = await DataRequirementModel.find(query).select('workflowStatus submissionStatus dueDate').lean();

    const byWorkflow: Record<string, number> = {};
    for (const row of rows) {
      const key = (row.workflowStatus || 'REQUESTED') as RequestWorkflowStatus;
      byWorkflow[key] = (byWorkflow[key] || 0) + 1;
    }

    const today = new Date();
    const overdue = rows.filter((r) => {
      if (!r.dueDate) return false;
      const due = r.dueDate instanceof Date ? r.dueDate : new Date(r.dueDate);
      const open = !['ACCEPTED', 'CLOSED', 'REJECTED'].includes(r.workflowStatus || '');
      return open && due.getTime() < today.getTime();
    }).length;

    const stats = {
      total: rows.length,
      draft: byWorkflow.DRAFT || 0,
      requested: byWorkflow.REQUESTED || 0,
      inProgress: byWorkflow.IN_PROGRESS || 0,
      submitted: (byWorkflow.SUBMITTED || 0) + (byWorkflow.RESUBMITTED || 0),
      underReview: byWorkflow.UNDER_REVIEW || 0,
      changesRequested: byWorkflow.CHANGES_REQUESTED || 0,
      accepted: byWorkflow.ACCEPTED || 0,
      rejected: byWorkflow.REJECTED || 0,
      closed: byWorkflow.CLOSED || 0,
      overdue,
      pendingSubmission:
        (byWorkflow.REQUESTED || 0) +
        (byWorkflow.IN_PROGRESS || 0) +
        (byWorkflow.CHANGES_REQUESTED || 0),
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Requirement stats failed:', error);
    return NextResponse.json({ error: 'Unable to load statistics.' }, { status: 500 });
  }
}