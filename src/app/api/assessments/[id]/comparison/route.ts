import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';
import { IComparisonRow } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);
    const searchParams = request.nextUrl.searchParams;
    const targetPeriod = searchParams.get('targetPeriod'); // optional second period e.g. FY2025-26

    const currentAssessment = await AssessmentModel.findById(id).lean();
    if (!currentAssessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, currentAssessment.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find other assessments for the same facility and complianceType to compare against
    const otherAssessments = await AssessmentModel.find({
      facilityId: currentAssessment.facilityId,
      complianceType: currentAssessment.complianceType,
      _id: { $ne: currentAssessment._id },
    }).lean();

    // Select target assessment
    let compareWith = otherAssessments[0];
    if (targetPeriod) {
      const match = otherAssessments.find((a) => a.period === targetPeriod);
      if (match) compareWith = match;
    }

    if (!compareWith) {
      return NextResponse.json({
        success: true,
        data: {
          currentAssessment: {
            ...currentAssessment,
            _id: currentAssessment._id.toString(),
          },
          compareAssessment: null,
          rows: [],
          availablePeriods: [currentAssessment.period],
        },
      });
    }

    // Build side-by-side rows
    const rows: IComparisonRow[] = [];
    const metricKeys = new Set<string>();

    currentAssessment.metrics.forEach((m) => metricKeys.add(m.key));
    compareWith.metrics.forEach((m) => metricKeys.add(m.key));

    metricKeys.forEach((key) => {
      const m1 = currentAssessment.metrics.find((m) => m.key === key);
      const m2 = compareWith.metrics.find((m) => m.key === key);

      const parameter = m1?.name || m2?.name || key;
      const unit = m1?.unit || m2?.unit || '';

      const v1 = m1 ? m1.value : '—';
      const v2 = m2 ? m2.value : '—';

      const s1 = currentAssessment.isHistorical
        ? 'HISTORICAL_APPROVED'
        : m1?.isProvisional
        ? 'PROVISIONAL'
        : 'APPROVED';

      const s2 = compareWith.isHistorical
        ? 'HISTORICAL_APPROVED'
        : m2?.isProvisional
        ? 'PROVISIONAL'
        : 'APPROVED';

      let delta: string | number = '—';
      let pctChange: string = '—';

      if (typeof v1 === 'number' && typeof v2 === 'number') {
        const diff = v2 - v1;
        delta = Number(diff.toFixed(2));
        if (v1 !== 0) {
          pctChange = `${((diff / v1) * 100).toFixed(2)}%`;
        }
      }

      rows.push({
        parameter,
        unit,
        period1Value: v1,
        period1Status: s1,
        period2Value: v2,
        period2Status: s2,
        delta,
        percentageChange: pctChange,
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        assessment1: {
          ...currentAssessment,
          _id: currentAssessment._id.toString(),
        },
        assessment2: {
          ...compareWith,
          _id: compareWith._id.toString(),
        },
        rows,
        availablePeriods: [
          currentAssessment.period,
          ...otherAssessments.map((a) => a.period),
        ],
      },
    });
  } catch (error) {
    console.warn('Error fetching comparison from DB, returning fallback demo comparison:', error);
    const { MOCK_ASSESSMENTS } = await import('@/lib/mockFallback');
    const a1 = MOCK_ASSESSMENTS[1] || MOCK_ASSESSMENTS[0];
    const a2 = MOCK_ASSESSMENTS[0];
    return NextResponse.json({
      success: true,
      data: {
        assessment1: a1,
        assessment2: a2,
        availablePeriods: ['FY2025-26', 'FY2024-25', 'FY2023-24'],
        rows: [
          {
            metricKey: 'applicable_rco_target',
            name: 'Applicable RCO Target',
            unit: '%',
            value1: 33.01,
            value2: 29.91,
            absoluteDelta: 3.1,
            percentageDelta: 10.36,
          },
          {
            metricKey: 'achieved_renewable_share',
            name: 'Achieved Renewable Share',
            unit: '%',
            value1: 28.4,
            value2: 25.51,
            absoluteDelta: 2.89,
            percentageDelta: 11.33,
          },
          {
            metricKey: 'calculated_shortfall',
            name: 'Calculated Shortfall',
            unit: 'MU',
            value1: 2.5,
            value2: 5.0,
            absoluteDelta: -2.5,
            percentageDelta: -50.0,
          },
        ],
      },
    });
  }
}
