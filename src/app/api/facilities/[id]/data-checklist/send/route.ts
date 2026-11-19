import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { getFacilityDataChecklist, saveFacilityDataChecklist, checklistSummary } from '@/lib/facilityDataChecklistStore';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { Notification } from '@/models/Notification';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import type { ComplianceType } from '@/types';

const VALID_COMPLIANCES: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const facilityId = id.toUpperCase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Only consultants or admins can publish a checklist.' }, { status: 403 });
    }
    if (!isAuthorizedForFacility(session, facilityId)) {
      return NextResponse.json({ error: 'You are not authorized for this facility.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({})) as {
      period?: string; facilityName?: string; message?: string; linkedCompliances?: ComplianceType[];
    };
    const period = body.period?.trim() || DEFAULT_CHECKLIST_PERIOD;
    const linkedCompliances = Array.isArray(body.linkedCompliances)
      ? [...new Set(body.linkedCompliances)].filter((item): item is ComplianceType => VALID_COMPLIANCES.includes(item))
      : ['RCO' as ComplianceType];
    if (!linkedCompliances.length) {
      return NextResponse.json({ error: 'Select at least one compliance before publishing.' }, { status: 400 });
    }

    const facility = await FacilityModel.findOne({ facilityId }).lean();
    if (!facility) return NextResponse.json({ error: 'Facility not found.' }, { status: 404 });
    if (session!.role === 'CONSULTANT' && facility.assignedConsultantId && facility.assignedConsultantId.toString() !== session!.userId) {
      return NextResponse.json({ error: 'This facility is not assigned to your consultant account.' }, { status: 403 });
    }

    const checklist = await getFacilityDataChecklist(facilityId, period, body.facilityName || facility.name);
    const activeItems = checklist.items.filter((item) => item.status !== 'NOT_APPLICABLE' && item.status !== 'NOT_REQUIRED');
    let requirementsCreated = 0;

    for (const item of activeItems) {
      const key = `CHECKLIST:${item.itemKey}`;
      const category = /grid|electric|renewable|fuel|production|power|energy|oa purchase|dg set/i.test(item.label)
        ? 'COMMON_ENERGY' : 'COMPLIANCE_SPECIFIC';
      const result = await DataRequirementModel.updateOne(
        { facilityId, period, sourceChecklistItemKey: key },
        { $setOnInsert: {
          facilityId,
          period,
          sourceChecklistItemKey: key,
          title: item.label,
          category,
          linkedCompliances,
          description: item.notes?.trim() || `Please submit ${item.label} for ${period}. Provide the supporting Google Drive document link and any applicable source records.`,
          isApplicable: true,
          submissionStatus: 'REQUESTED',
          verificationStatus: 'NOT_STARTED',
          requestedAt: new Date(),
          requestedBy: session!.userId,
          requestedByName: session!.name,
        } },
        { upsert: true }
      );
      if (result.upsertedCount > 0) requirementsCreated += 1;
    }

    const summary = checklistSummary(checklist.items);
    const updated = await saveFacilityDataChecklist(facilityId, period, {
      sharedWithClient: true,
      sharedByName: session?.name,
      lastUpdatedByName: session?.name,
      facilityName: body.facilityName || checklist.facilityName || facility.name,
    });

    try {
      await Notification.create({
        recipientRole: 'CLIENT',
        senderRole: session?.role === 'ADMIN' ? 'ADMIN' : 'CONSULTANT',
        senderName: session?.name || 'Consultant',
        type: 'DATA_CHECKLIST_SHARED',
        title: `New data request — ${body.facilityName || facility.name}`,
        message: body.message?.trim() || `${session?.name || 'Consultant'} published ${requirementsCreated} new data request(s) for ${period}. ${summary.due} checklist item(s) due.`,
        facilityId,
        linkUrl: '/portal/requests',
        isRead: false,
      });
    } catch (notificationError) {
      console.error('Checklist requests were published but client notification failed:', notificationError);
    }

    return NextResponse.json({
      success: true,
      message: 'Checklist published and linked to client data requests.',
      requirementsCreated,
      data: updated,
    });
  } catch (error) {
    console.error('data-checklist publish failed:', error);
    return NextResponse.json({ error: 'Unable to publish checklist and create data requests. No success was reported.' }, { status: 500 });
  }
}
