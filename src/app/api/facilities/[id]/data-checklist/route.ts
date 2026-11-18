import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';
import { getFacilityDataChecklist, saveFacilityDataChecklist } from '@/lib/facilityDataChecklistStore';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import type { IFacilityDataChecklistItem } from '@/types';

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
      return NextResponse.json(
        {
          success: true,
          data: null,
          message: 'Checklist has not been shared with the client yet.',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: true, data: checklist },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    );
  } catch (error) {
    console.warn('data-checklist GET failed:', error);
    return NextResponse.json({ error: 'Failed to load data checklist' }, { status: 500 });
  }
}

export async function PUT(
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

    const body = (await request.json()) as {
      period?: string;
      facilityName?: string;
      items?: IFacilityDataChecklistItem[];
      consultantNotes?: string;
    };

    const period = body.period || DEFAULT_CHECKLIST_PERIOD;

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    const normalizedItems = body.items.map((item, index) => ({
      itemKey: item.itemKey || `custom_${index}`,
      label: (item.label || '').trim() || 'Untitled item',
      status: item.status || 'DUE',
      notes: item.notes || '',
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : index + 1,
    }));

    const updated = await saveFacilityDataChecklist(facilityId, period, {
      items: normalizedItems,
      consultantNotes: body.consultantNotes,
      facilityName: body.facilityName,
      lastUpdatedByName: session?.name,
    });

    return NextResponse.json(
      { success: true, data: updated },
      { headers: { 'Cache-Control': 'no-store, must-revalidate' } }
    );
  } catch (error) {
    console.warn('data-checklist PUT failed:', error);
    return NextResponse.json({ error: 'Failed to save data checklist' }, { status: 500 });
  }
}