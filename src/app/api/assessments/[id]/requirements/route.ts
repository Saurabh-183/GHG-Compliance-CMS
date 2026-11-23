import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { DataRequirementModel } from '@/models/DataRequirement';
import { getSessionFromRequest, isAuthorizedForFacility } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    let assessment: any = null;
    if (mongoose.isValidObjectId(id)) {
      assessment = await AssessmentModel.findById(id).lean();
    }
    if (!assessment) {
      assessment = await AssessmentModel.findOne({ _id: id }).lean();
    }
    if (!assessment) {
      const { parseAssessmentId } = await import('@/lib/assessmentIds');
      const parsed = parseAssessmentId(id);
      if (parsed) {
        assessment = await AssessmentModel.findOne({
          facilityId: parsed.facilityId,
          complianceType: parsed.complianceType,
          period: parsed.period,
        }).lean();
      }
    }
    if (!assessment) {
      const { resolveAssessmentById } = await import('@/lib/complianceMatrixData');
      assessment = resolveAssessmentById(id) as typeof assessment;
    }
    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    if (!isAuthorizedForFacility(session, assessment.facilityId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requirements = await DataRequirementModel.find({
      facilityId: assessment.facilityId,
      period: assessment.period,
      linkedCompliances: assessment.complianceType,
    })
      .populate('datasetId')
      .lean();

    return NextResponse.json({
      success: true,
      data: requirements.map((r) => ({
        ...r,
        _id: r._id.toString(),
        datasetId: r.datasetId
          ? typeof r.datasetId === 'object' && '_id' in (r.datasetId as any)
            ? String((r.datasetId as any)._id)
            : r.datasetId.toString()
          : undefined,
      })),
    });
  } catch (error) {
    console.error('Assessment requirements query failed:', error);
    return NextResponse.json({ error: 'Unable to load assessment requirements.' }, { status: 503 });
  }
}
