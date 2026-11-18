import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { getFacilityDataChecklist } from '@/lib/facilityDataChecklistStore';
import { buildFacilityChecklistPdfBuffer } from '@/lib/facilityDataChecklistPdf';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const facilityId = id.toUpperCase();
    const session = getSessionFromRequest(request);
    const period = request.nextUrl.searchParams.get('period') || DEFAULT_CHECKLIST_PERIOD;
    const facilityName = request.nextUrl.searchParams.get('facilityName') || undefined;

    if (!isAuthorizedForFacility(session, facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const checklist = await getFacilityDataChecklist(facilityId, period, facilityName);

    if (session?.role === 'CLIENT' && !checklist.sharedWithClient) {
      return NextResponse.json({ error: 'Checklist not shared with client' }, { status: 403 });
    }

    const buffer = await buildFacilityChecklistPdfBuffer(checklist);
    const safeName = (checklist.facilityName || facilityId).replace(/[^\w\-]+/g, '_');
    const filename = `Data_Checklist_${safeName}_${period}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.warn('data-checklist pdf failed:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}