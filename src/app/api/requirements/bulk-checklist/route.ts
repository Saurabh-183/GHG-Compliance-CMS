import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import { FacilityModel } from '@/models/Facility';
import { createBulkChecklistRequirements } from '@/lib/bulkChecklistRequests';
import { isRequestableApplicability } from '@/lib/dataRequirementMaster';
import { getFacilityDataChecklist } from '@/lib/facilityDataChecklistStore';
import { buildApplicableRequirementsList } from '@/lib/applicableRequirements';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    let session = getSessionFromRequest(request);
    if (!session && process.env.NODE_ENV === 'development') {
      session = {
        userId: '6afe993562c738b0be61bd57',
        name: 'Priya Sharma',
        email: 'consultant@carboncrunch.com',
        role: 'CONSULTANT',
        authorizedFacilityIds: ['TRIDENT_PAPER', 'TRIDENT_YARN', 'TRIDENT_TEXTILES'],
      };
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized: Session expired or invalid. Please sign in again.' }, { status: 401 });
    }
    if (!authorizeRole(session, ['CONSULTANT', 'ADMIN'])) {
      return NextResponse.json({ error: 'Forbidden: Only Consultants and Administrators can create requirements' }, { status: 403 });
    }

    const body = (await request.json()) as {
      facilityId: string;
      period: string;
      itemKeys: string[];
      bundleTitle: string;
      purpose?: string;
      instructions?: string;
      dueDate?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      linkedCompliances?: string[];
      reportingPeriodStart?: string;
      reportingPeriodEnd?: string;
      selectedMonths?: string[];
      notifyClient?: boolean;
      saveAsDraft?: boolean;
    };

    const facilityId = body.facilityId?.toUpperCase();
    if (!facilityId || !body.period?.trim() || !body.bundleTitle?.trim() || !Array.isArray(body.itemKeys)) {
      return NextResponse.json({ error: 'facilityId, period, bundleTitle and itemKeys are required.' }, { status: 400 });
    }
    if (!body.itemKeys.length) {
      return NextResponse.json({ error: 'Select at least one checklist requirement.' }, { status: 400 });
    }

    if (!isAuthorizedForFacility(session, facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const facility = await FacilityModel.findOne({ facilityId }).lean();
    if (!facility) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
    if (
      session!.role === 'CONSULTANT' &&
      facility.assignedConsultantId &&
      facility.assignedConsultantId.toString() !== session!.userId
    ) {
      return NextResponse.json({ error: 'This facility is not assigned to you.' }, { status: 403 });
    }

    const checklist = await getFacilityDataChecklist(facilityId, body.period, facility.name);
    const applicable = buildApplicableRequirementsList(checklist);
    const byKey = new Map(applicable.map((row) => [row.master.itemKey, row]));

  const blocked: string[] = [];
  for (const key of body.itemKeys) {
    const row = byKey.get(key);
    if (!row) {
      blocked.push(key);
      continue;
    }
    if (row.needsVerification || !isRequestableApplicability(row.applicability)) {
      blocked.push(key);
    }
  }

    if (!body.saveAsDraft && !body.dueDate?.trim()) {
      return NextResponse.json({ error: 'Client submission due date is required when sending data requests.' }, { status: 400 });
    }
    if (body.dueDate && Number.isNaN(Date.parse(body.dueDate))) {
      return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
    }

    if (blocked.length > 0 && !body.saveAsDraft) {
    return NextResponse.json(
      {
        error:
          'Some selected items are not applicable or need admin verification before sending: ' + blocked.join(', '),
        blocked,
      },
      { status: 400 }
    );
  }

    const result = await createBulkChecklistRequirements({
      facilityId,
      period: body.period,
      itemKeys: body.itemKeys,
      bundleTitle: body.bundleTitle.trim(),
      purpose: body.purpose,
      instructions: body.instructions,
      dueDate: body.dueDate,
      priority: body.priority,
      linkedCompliances: body.linkedCompliances as ('RCO' | 'PAT' | 'CCTS')[] | undefined,
      reportingPeriodStart: body.reportingPeriodStart,
      reportingPeriodEnd: body.reportingPeriodEnd,
      selectedMonths: body.selectedMonths,
      notifyClient: body.notifyClient !== false,
      saveAsDraft: body.saveAsDraft === true,
      requestedBy: session!.userId,
      requestedByName: session!.name,
    });

    return NextResponse.json({
      success: true,
      message: body.saveAsDraft
        ? `Saved ${result.count} draft requirements in bundle ${result.bundleId}`
        : `Sent ${result.count} checklist requirements to client`,
      data: result,
    });
  } catch (error) {
    console.error('bulk-checklist POST failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bulk checklist request' },
      { status: 500 }
    );
  }
}