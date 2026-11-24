import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { getClientFacilityIds } from '@/lib/clientFacilityAccess';
import { getSessionFromRequest, isAuthorizedForFacility, authorizeRole } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;
    const session = getSessionFromRequest(request);

    let assessment: any = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      assessment = await AssessmentModel.findById(id)
        .populate('approvedBy', 'name email designation')
        .populate('assignedConsultantId', 'name email designation')
        .populate('assignedReviewerId', 'name email designation')
        .lean();
    }

    if (!assessment) {
      assessment = await AssessmentModel.findOne({ _id: id }).lean();
    }

    if (!assessment) {
      const { resolveAssessmentById } = await import('@/lib/complianceMatrixData');
      assessment = resolveAssessmentById(id) as typeof assessment;
    }

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    let facilityAuthorized = isAuthorizedForFacility(session, assessment.facilityId);
    if (!facilityAuthorized && session?.role === 'CLIENT' && session.clientGroupId) {
      const companyFacilityIds = await getClientFacilityIds(session.clientGroupId);
      facilityAuthorized = companyFacilityIds.includes(assessment.facilityId.toUpperCase());
    }
    if (!facilityAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const approvedBy = assessment.approvedBy as { name?: string } | undefined;
    const approvedAt =
      assessment.approvedAt instanceof Date
        ? assessment.approvedAt.toISOString()
        : assessment.approvedAt;

    // Client portal permission enforcement: unapproved metrics and internal notes hidden
    if (session && session.role === 'CLIENT') {
      return NextResponse.json({
        success: true,
        data: {
          ...assessment,
          _id: assessment._id.toString(),
          approvedByName: approvedBy?.name,
          approvedAt,
          metrics: (assessment.metrics || []).filter((m: any) => m.approvalStatus === 'APPROVED'),
          notes: undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...assessment,
        _id: assessment._id.toString(),
        approvedByName: approvedBy?.name,
        approvedAt,
      },
    });
  } catch (error) {
    console.warn('Error fetching assessment from DB, returning fallback assessment:', error);
    const { id } = await params;
    const { resolveAssessmentById } = await import('@/lib/complianceMatrixData');
    const fallback = resolveAssessmentById(id);
    if (!fallback) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: fallback });
  }
}

export async function PATCH(
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

    const existing = await AssessmentModel.findById(id);
    if (!existing) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    if (!isAuthorizedForFacility(session, existing.facilityId)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = (await request.json()) as Record<string, unknown>;

    // Increment version when updating assessment records
    const updated = await AssessmentModel.findByIdAndUpdate(
      id,
      {
        $set: body,
        $inc: { version: 1 },
      },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Assessment updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Assessment update failed:', error);
    return NextResponse.json({ error: 'Unable to update assessment.' }, { status: 500 });
  }
}
