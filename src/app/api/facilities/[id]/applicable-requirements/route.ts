import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { getFacilityDataChecklist } from '@/lib/facilityDataChecklistStore';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { buildApplicableRequirementsList, dataReadinessByCategory } from '@/lib/applicableRequirements';
import { CHECKLIST_MASTER_VERSION } from '@/lib/dataRequirementMaster';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const facilityId = id.toUpperCase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAuthorizedForFacility(session, facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const period = request.nextUrl.searchParams.get('period') || DEFAULT_CHECKLIST_PERIOD;
    const facilityName = request.nextUrl.searchParams.get('facilityName') || undefined;
    const checklist = await getFacilityDataChecklist(facilityId, period, facilityName);
    const items = buildApplicableRequirementsList(checklist);
    const readiness = dataReadinessByCategory(items);

    const stats = {
      totalMaster: items.length,
      applicable: items.filter((i) => i.applicability === 'APPLICABLE').length,
      notApplicable: items.filter((i) => i.applicability === 'NOT_APPLICABLE' || i.applicability === 'NOT_REQUIRED').length,
      needsVerification: items.filter((i) => i.needsVerification).length,
      requestable: items.filter((i) => i.requestable).length,
    };

    return NextResponse.json({
      success: true,
      data: {
        facilityId,
        period,
        checklistVersion: CHECKLIST_MASTER_VERSION,
        stats,
        readiness,
        requirements: items,
      },
    });
  } catch (error) {
    console.error('applicable-requirements GET failed:', error);
    return NextResponse.json({ error: 'Failed to load applicable requirements' }, { status: 500 });
  }
}