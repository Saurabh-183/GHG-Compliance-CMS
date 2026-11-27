import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
import { FacilityModel } from '@/models/Facility';
import { AssessmentModel } from '@/models/Assessment';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import type { ComplianceType, WorkflowStatus, ComplianceOutcome } from '@/types';
import { normalizeFinancialYearPeriod, isRollingFinancialYear } from '@/lib/financialYears';

type FrameworkSetting = {
  complianceType: ComplianceType;
  isApplicable: boolean;
};

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    const facilityId = request.nextUrl.searchParams.get('facilityId');
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const query: { facilityId?: string | { $in: string[] } } = {};
    if (!facilityId && session.role !== 'ADMIN') {
      const scopedIds = new Set((session.authorizedFacilityIds || []).map((id) => id.toUpperCase()));
      if (session.role === 'CLIENT' && session.clientGroupId) {
        const groupFacilities = await FacilityModel.find({ clientGroupId: session.clientGroupId })
          .select('facilityId')
          .lean();
        groupFacilities.forEach((facility: { facilityId: string }) => scopedIds.add(facility.facilityId.toUpperCase()));
      }
      query.facilityId = { $in: Array.from(scopedIds) };
    }
    if (facilityId) {
      if (!isAuthorizedForFacility(session, facilityId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityId.toUpperCase();
    }

    const records = await ComplianceApplicabilityModel.find(query)
      .populate('assignedConsultantId', 'name email')
      .populate('assignedReviewerId', 'name email')
      .sort({ period: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: records.map((record) => ({
        ...record,
        _id: record._id.toString(),
        deadline: record.deadline ? new Date(record.deadline).toISOString() : null,
      })),
    });
  } catch (error) {
    console.error('Compliance applicability query failed:', error);
    return NextResponse.json({ error: 'Unable to load compliance applicability.' }, { status: 503 });
  }
}

/**
 * Admin endpoint for configuring one or many facilities for one financial year.
 * The old single-facility/single-framework payload remains supported.
 */
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN'])) {
      return NextResponse.json(
        { error: 'Forbidden: Only Admins can configure facility compliance applicability.' },
        { status: 403 }
      );
    }

    const body = (await request.json()) as Record<string, any>;
    const normalizedPeriod = normalizeFinancialYearPeriod(body.period);
    if (!normalizedPeriod) {
      return NextResponse.json({ error: 'Use a valid financial year, for example FY2026-27.' }, { status: 400 });
    }
    if (!isRollingFinancialYear(normalizedPeriod)) {
      return NextResponse.json(
        { error: 'You can configure only the previous, current or upcoming financial year.' },
        { status: 400 }
      );
    }

    const facilityIds: string[] = Array.isArray(body.facilityIds)
      ? [...new Set(body.facilityIds.map((id: unknown) => String(id).trim().toUpperCase()).filter(Boolean))]
      : body.facilityId
        ? [String(body.facilityId).trim().toUpperCase()]
        : [];

    const frameworks: FrameworkSetting[] = Array.isArray(body.frameworks)
      ? body.frameworks
      : body.complianceType
        ? [{ complianceType: body.complianceType, isApplicable: body.isApplicable === true }]
        : [];

    if (!facilityIds.length || !frameworks.length) {
      return NextResponse.json(
        { error: 'Select at least one facility and one compliance framework setting.' },
        { status: 400 }
      );
    }

    const allowedFrameworks: ComplianceType[] = ['RCO', 'RPO', 'PAT', 'CCTS'];
    if (frameworks.some((item) => !allowedFrameworks.includes(item.complianceType) || typeof item.isApplicable !== 'boolean')) {
      return NextResponse.json({ error: 'Invalid compliance framework settings.' }, { status: 400 });
    }

    if (facilityIds.some((id) => !isAuthorizedForFacility(session, id))) {
      return NextResponse.json({ error: 'You are not authorized to configure one or more selected facilities.' }, { status: 403 });
    }

    const facilities = await FacilityModel.find({ facilityId: { $in: facilityIds } });
    const foundIds = new Set<string>(facilities.map((facility: { facilityId: string }) => facility.facilityId.toUpperCase()));
    const missingIds = facilityIds.filter((id) => !foundIds.has(id));
    if (missingIds.length) {
      return NextResponse.json({ error: `Facility not found: ${missingIds.join(', ')}` }, { status: 404 });
    }

    const frameworkTypes = frameworks.map((item) => item.complianceType);
    const existingRecords = await ComplianceApplicabilityModel.find({
      facilityId: { $in: facilityIds },
      period: { $in: [normalizedPeriod, normalizedPeriod.replace(/^FY/, '')] },
      complianceType: { $in: frameworkTypes },
    }).lean();
    const existingByKey = new Map<string, any>();
    for (const record of existingRecords as any[]) {
      const key = `${record.facilityId.toUpperCase()}|${record.complianceType}`;
      const current = existingByKey.get(key);
      // Prefer an already-canonical record if legacy prefixless and canonical rows coexist.
      if (!current || record.period === normalizedPeriod) existingByKey.set(key, record);
    }

    const operations = facilityIds.flatMap((facilityId) =>
      frameworks.map((setting) => {
        const existing = existingByKey.get(`${facilityId}|${setting.complianceType}`);
        const isApplicable = setting.isApplicable;
        const complianceOutcome: ComplianceOutcome = !isApplicable
          ? 'NOT_APPLICABLE'
          : existing?.isApplicable
            ? existing.complianceOutcome
            : 'PENDING_DETERMINATION';
        const workflowStatus: WorkflowStatus =
          isApplicable && !existing?.isApplicable
            ? 'NOT_STARTED'
            : existing?.workflowStatus || 'NOT_STARTED';

        return {
          updateOne: {
            filter: existing?._id
              ? { _id: existing._id }
              : { facilityId, complianceType: setting.complianceType, period: normalizedPeriod },
            update: {
              $set: {
                period: normalizedPeriod,
                isApplicable,
                authority: body.authority || existing?.authority || 'BEE',
                ministry: body.ministry || existing?.ministry || 'Ministry of Power',
                notificationReference: body.notificationReference ?? existing?.notificationReference,
                targetValue: body.targetValue ?? existing?.targetValue ?? null,
                targetUnit: body.targetUnit || existing?.targetUnit || '%',
                targetMethodology: body.targetMethodology ?? existing?.targetMethodology,
                deadline: body.deadline ? new Date(body.deadline) : existing?.deadline || null,
                assignedConsultantId: body.assignedConsultantId ?? existing?.assignedConsultantId,
                assignedReviewerId: body.assignedReviewerId ?? existing?.assignedReviewerId,
                workflowStatus,
                complianceOutcome,
                notes: body.notes ?? existing?.notes,
              },
            },
            upsert: true,
          },
        };
      })
    );

    await ComplianceApplicabilityModel.bulkWrite(operations, { ordered: true });

    // Every newly enabled facility + framework + FY must have a real assessment
    // so the matrix cell can open the report immediately after Admin saves.
    // Existing assessments are reused and their workflow/evidence is preserved.
    for (const facility of facilities) {
      for (const setting of frameworks) {
        if (!setting.isApplicable) continue;
        const legacyPeriods: string[] = [normalizedPeriod, normalizedPeriod.replace(/^FY/, '')];
        const matchingAssessments: any[] = await AssessmentModel.find({
          facilityId: facility.facilityId,
          complianceType: setting.complianceType,
          period: { $in: legacyPeriods },
        });
        const existingAssessment: any =
          matchingAssessments.find((assessment) => assessment.period === normalizedPeriod) ||
          matchingAssessments[0];
        if (existingAssessment) {
          if (existingAssessment.period !== normalizedPeriod) {
            existingAssessment.period = normalizedPeriod;
            await existingAssessment.save();
          }
          continue;
        }
        await AssessmentModel.create({
          facilityId: facility.facilityId,
          complianceType: setting.complianceType,
          period: normalizedPeriod,
          workflowStatus: 'NOT_STARTED',
          complianceOutcome: 'PENDING_DETERMINATION',
          isHistorical: false,
          metrics: [],
          assignedConsultantId: facility.assignedConsultantId,
          assignedReviewerId: facility.assignedReviewerId,
          version: 1,
        });
      }
    }

    // Keep the facility-wide allow-list as the union across all financial years.
    // The year-specific ComplianceApplicability records remain the source of truth.
    for (const facility of facilities) {
      const activeFrameworks = await ComplianceApplicabilityModel.distinct('complianceType', {
        facilityId: facility.facilityId,
        isApplicable: true,
      });
      facility.enabledFrameworks = activeFrameworks as ComplianceType[];
      await facility.save();
    }

    return NextResponse.json({
      success: true,
      message: `Compliance settings saved for ${facilityIds.length} facility/facilities and ${normalizedPeriod}.`,
      data: { facilityIds, period: normalizedPeriod, frameworks },
    });
  } catch (error) {
    console.error('Compliance applicability save failed:', error);
    return NextResponse.json({ error: 'Unable to save compliance applicability.' }, { status: 500 });
  }
}
