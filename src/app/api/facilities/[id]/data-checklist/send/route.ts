import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { getFacilityDataChecklist, saveFacilityDataChecklist, checklistSummary } from '@/lib/facilityDataChecklistStore';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { Notification } from '@/models/Notification';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const facilityId = id.toUpperCase();
    const session = getSessionFromRequest(request);

    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!isAuthorizedForFacility(session, facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      period?: string;
      facilityName?: string;
      message?: string;
    };
    const period = body.period || DEFAULT_CHECKLIST_PERIOD;

    const checklist = await getFacilityDataChecklist(facilityId, period, body.facilityName);
    const summary = checklistSummary(checklist.items);

    const updated = await saveFacilityDataChecklist(facilityId, period, {
      sharedWithClient: true,
      sharedByName: session?.name,
      lastUpdatedByName: session?.name,
      facilityName: body.facilityName || checklist.facilityName,
    });

    const title = body.facilityName || checklist.facilityName || facilityId;
    const note =
      body.message?.trim() ||
      `${session?.name || 'Consultant'} shared the facility data checklist. ${summary.due} item(s) due · ${summary.received} received.`;

    try {
      await connectToDatabase();
      await Notification.create({
        recipientRole: 'CLIENT',
        senderRole: session?.role === 'ADMIN' ? 'ADMIN' : 'CONSULTANT',
        senderName: session?.name || 'Consultant',
        type: 'DATA_CHECKLIST_SHARED',
        title: `Data checklist updated — ${title}`,
        message: note,
        facilityId,
        linkUrl: `/portal/facilities/${facilityId}`,
        isRead: false,
      });
    } catch (notifyErr) {
      console.warn('Notification create failed (demo continues):', notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Checklist published to client portal',
      data: updated,
    });
  } catch (error) {
    console.warn('data-checklist send failed:', error);
    return NextResponse.json({ error: 'Failed to send checklist to client' }, { status: 500 });
  }
}