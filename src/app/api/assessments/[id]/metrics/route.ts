import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import { IMetricValue } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);
    if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as { metrics: IMetricValue[] };
    if (!body.metrics || !Array.isArray(body.metrics)) {
      return NextResponse.json({ error: 'Invalid metrics payload' }, { status: 400 });
    }

    let assessment: any = null;
    if (mongoose.isValidObjectId(id)) {
      assessment = await AssessmentModel.findById(id);
    }
    if (!assessment) {
      assessment = await AssessmentModel.findOne({ _id: id });
    }
    if (!assessment) {
      const { parseAssessmentId } = await import('@/lib/assessmentIds');
      const parsed = parseAssessmentId(id);
      if (parsed) {
        assessment = await AssessmentModel.findOne({
          facilityId: parsed.facilityId,
          complianceType: parsed.complianceType,
          period: parsed.period,
        });
      }
    }
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, assessment.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Merge or append metrics with versioning
    const existingMetricsMap = new Map<string, IMetricValue>();
    (assessment.metrics || []).forEach((m: IMetricValue) => existingMetricsMap.set(m.key, m));

    body.metrics.forEach((newM) => {
      const existing = existingMetricsMap.get(newM.key);
      const version = existing ? existing.version + 1 : 1;
      existingMetricsMap.set(newM.key, {
        ...newM,
        version,
      });
    });

    assessment.metrics = Array.from(existingMetricsMap.values());
    assessment.version += 1;
    await assessment.save();

    return NextResponse.json({
      success: true,
      message: 'Metrics recorded and versioned successfully',
      data: assessment,
    });
  } catch (error) {
    console.error('Metrics update failed:', error);
    return NextResponse.json({ error: 'Unable to save metrics.' }, { status: 500 });
  }
}
