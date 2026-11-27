import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { connectToDatabase } from '@/lib/db';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { CHECKLIST_MASTER_VERSION, getMasterRequirement } from '@/lib/dataRequirementMaster';
import { normalizeFinancialYearPeriod } from '@/lib/financialYears';
import { getFacilityDataChecklist } from '@/lib/facilityDataChecklistStore';
import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { buildApplicableRequirementsList, dataReadinessByCategory } from '@/lib/applicableRequirements';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const facilityId = id.toUpperCase();
    const session = getSessionFromRequest(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAuthorizedForFacility(session, facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestedPeriod = request.nextUrl.searchParams.get('period') || DEFAULT_CHECKLIST_PERIOD;
    const normalizedPeriod = normalizeFinancialYearPeriod(requestedPeriod);
    const period = normalizedPeriod || requestedPeriod;
    const facilityName = request.nextUrl.searchParams.get('facilityName') || undefined;
    const checklist = await getFacilityDataChecklist(facilityId, period, facilityName);
    let items = buildApplicableRequirementsList(checklist);

    // Consultants only receive checklist rows linked to frameworks that Admin
    // enabled for this exact facility and financial year.
    if (session.role === 'CONSULTANT') {
      if (!normalizedPeriod) {
        return NextResponse.json({ error: 'Select a valid financial year.' }, { status: 400 });
      }
      await connectToDatabase();
      const frameworkRows = await ComplianceApplicabilityModel.find({
        facilityId,
        period: { $in: [normalizedPeriod, normalizedPeriod.replace(/^FY/, '')] },
        isApplicable: true,
      }).select('complianceType').lean();
      const allowedFrameworks = new Set(frameworkRows.map((row) => row.complianceType));
      items = items.filter((row) => {
        const master = getMasterRequirement(row.master.itemKey);
        const frameworks = row.master.defaultCompliances || master?.defaultCompliances || [];
        return frameworks.some((framework) => allowedFrameworks.has(framework));
      });
    }

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