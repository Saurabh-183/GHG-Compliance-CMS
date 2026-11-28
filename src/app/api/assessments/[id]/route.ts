import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import { AssessmentModel } from '@/models/Assessment';
import { ComplianceApplicabilityModel } from '@/models/ComplianceApplicability';
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
      const { parseAssessmentId } = await import('@/lib/assessmentIds');
      const parsed = parseAssessmentId(id);
      if (parsed) {
        const periodNorm = parsed.period.replace(/^FY/i, '').trim();
        assessment = await AssessmentModel.findOne({
          facilityId: new RegExp(`^${parsed.facilityId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
          complianceType: parsed.complianceType,
          $or: [
            { period: parsed.period },
            { period: `FY${periodNorm}` },
            { period: periodNorm },
            { period: new RegExp(`^FY\\s*${periodNorm}$`, 'i') },
          ],
        })
          .populate('approvedBy', 'name email designation')
          .populate('assignedConsultantId', 'name email designation')
          .populate('assignedReviewerId', 'name email designation')
          .lean();

        if (!assessment) {
          let authorized = isAuthorizedForFacility(session, parsed.facilityId);
          if (!authorized && session?.role === 'CLIENT' && session.clientGroupId) {
            const companyFacilityIds = await getClientFacilityIds(session.clientGroupId);
            authorized = companyFacilityIds.includes(parsed.facilityId.toUpperCase());
          }
          if (!authorized) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
          }

          const { FacilityModel } = await import('@/models/Facility');
          const facility = await FacilityModel.findOne({
            facilityId: new RegExp(`^${parsed.facilityId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
          }).populate('clientGroupId', 'name').lean();

          const clientGroupName = (facility?.clientGroupId as any)?.name || (facility as any)?.clientGroupName;

          const virtualAssessment = {
            _id: id,
            facilityId: parsed.facilityId,
            facilityName: facility?.name || parsed.facilityId,
            clientGroupId: facility?.clientGroupId?._id || facility?.clientGroupId,
            clientGroupName,
            complianceType: parsed.complianceType,
            period: parsed.period,
            workflowStatus: 'NOT_STARTED',
            complianceOutcome: 'PENDING_DETERMINATION',
            metrics: [],
            isHistorical: false,
            documentLinks: {},
            version: 0,
          };
          return NextResponse.json({
            success: true,
            data: virtualAssessment,
          });
        }
      }
    }

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }

    const applicability = await ComplianceApplicabilityModel.find({
      facilityId: String(assessment.facilityId).toUpperCase(),
      complianceType: assessment.complianceType,
      isApplicable: true,
    }).select('period').lean();
    const assessmentPeriod = String(assessment.period).toLowerCase();
    const assessmentYear = assessmentPeriod.match(/20\d{2}-\d{2}/)?.[0];
    const isConfigured = applicability.some((row) => {
      const configuredPeriod = String(row.period).toLowerCase();
      return configuredPeriod === assessmentPeriod || (!!assessmentYear && configuredPeriod.includes(assessmentYear));
    });
    if (!isConfigured && session?.role === 'CLIENT') {
      return NextResponse.json({ error: 'This assessment is not configured as applicable for the selected facility and financial year.' }, { status: 404 });
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
    console.error('Assessment lookup failed:', error);
    return NextResponse.json({ error: 'Unable to load assessment.' }, { status: 503 });
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
    const applicability = await ComplianceApplicabilityModel.findOne({
      facilityId: String(existing.facilityId).toUpperCase(),
      complianceType: existing.complianceType,
      period: existing.period,
      isApplicable: true,
    }).lean();
    if (!applicability) {
      return NextResponse.json({ error: 'This assessment is not applicable for the selected facility and financial year.' }, { status: 409 });
    }
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
