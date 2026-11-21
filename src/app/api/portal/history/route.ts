import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { DataRequirementModel } from '@/models/DataRequirement';
import { AssessmentModel } from '@/models/Assessment';
import { ClientGroupModel } from '@/models/ClientGroup';
import { getSessionFromRequest } from '@/lib/auth';
import { resolveDataCategoryLabel } from '@/lib/dataRequestDisplay';
import { formatSubmittedFieldValue, getLatestSubmissionStructuredData } from '@/lib/clientPortalSubmission';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'CLIENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const facilityIds = session.authorizedFacilityIds || [];
  if (!facilityIds.length) {
    return NextResponse.json({
      success: true,
      data: { approvedRequests: [], approvedAssessments: [] },
    });
  }

  try {
    await connectToDatabase();

    const facilities = await FacilityModel.find({ facilityId: { $in: facilityIds } })
      .select('facilityId name clientGroupId')
      .lean();
    const facilityMeta = new Map(facilities.map((f) => [f.facilityId, f]));

    const groupIds = [...new Set(facilities.map((f) => f.clientGroupId?.toString()).filter(Boolean))];
    const groups = await ClientGroupModel.find({ _id: { $in: groupIds } }).select('name').lean();
    const groupNameById = new Map(groups.map((g) => [g._id.toString(), g.name]));

    const requirements = await DataRequirementModel.find({
      facilityId: { $in: facilityIds },
      workflowStatus: { $in: ['ACCEPTED', 'CLOSED'] },
    })
      .sort({ reviewedAt: -1, updatedAt: -1 })
      .lean();

    const approvedRequests = requirements.map((req) => {
      const meta = facilityMeta.get(req.facilityId);
      const clientGroupName = meta?.clientGroupId
        ? groupNameById.get(meta.clientGroupId.toString())
        : undefined;
      const structured = getLatestSubmissionStructuredData(req as unknown as import('@/types').IDataRequirement);
      const fieldSummary = (req.requiredFields || [])
        .map((field) => {
          const value = structured[field.key];
          if (value === undefined || value === null || value === '') return null;
          return { key: field.key, label: field.label, value: formatSubmittedFieldValue(value) };
        })
        .filter(Boolean) as Array<{ key: string; label: string; value: string }>;

      if (!fieldSummary.length && Object.keys(structured).length > 0) {
        Object.entries(structured).slice(0, 8).forEach(([key, value]) => {
          fieldSummary.push({
            key,
            label: key.replace(/_/g, ' '),
            value: formatSubmittedFieldValue(value),
          });
        });
      }

      return {
        requirementId: req._id.toString(),
        requestId: req.requestId || `REQ-${req._id.toString().slice(-8).toUpperCase()}`,
        title: req.title,
        facilityId: req.facilityId,
        facilityName: meta?.name,
        clientGroupName,
        period: req.period,
        dataCategory: resolveDataCategoryLabel({
          dataCategory: req.dataCategory,
          category: req.category,
          title: req.title,
          sourceChecklistItemKey: req.sourceChecklistItemKey,
        }),
        workflowStatus: req.workflowStatus,
        reviewedByName: req.reviewedByName,
        reviewedAt: req.reviewedAt
          ? req.reviewedAt instanceof Date
            ? req.reviewedAt.toISOString()
            : String(req.reviewedAt)
          : null,
        reviewNote: req.reviewNote,
        linkedCompliances: req.linkedCompliances || [],
        submissionVersion: req.submissionVersion,
        fieldSummary,
        submittedDriveLinks: (req.submittedDriveLinks || []).map((link) => ({
          url: link.url,
          sourceUrl: link.sourceUrl,
          vaultUrl: link.vaultUrl,
          description: link.description,
          fileName: link.fileName,
          submittedAt:
            link.submittedAt instanceof Date
              ? link.submittedAt.toISOString()
              : link.submittedAt
                ? String(link.submittedAt)
                : null,
          submittedBy: link.submittedBy,
          mappingStatus: link.mappingStatus,
        })),
      };
    });

    const rawAssessments = await AssessmentModel.find({
      facilityId: { $in: facilityIds },
      workflowStatus: 'APPROVED',
    })
      .populate('approvedBy', 'name designation')
      .sort({ period: -1 })
      .lean();

    const approvedAssessments = rawAssessments.map((a) => ({
      _id: a._id.toString(),
      facilityId: a.facilityId,
      facilityName: facilityMeta.get(a.facilityId)?.name,
      complianceType: a.complianceType,
      period: a.period,
      complianceOutcome: a.complianceOutcome,
      documentLinks: a.documentLinks,
      version: a.version,
      approvedByName: (a.approvedBy as { name?: string })?.name,
      approvedAt: a.approvedAt ? a.approvedAt.toISOString() : null,
      metrics: (a.metrics || []).filter((m) => m.approvalStatus === 'APPROVED'),
    }));

    return NextResponse.json({
      success: true,
      data: { approvedRequests, approvedAssessments },
    });
  } catch (error) {
    console.error('portal history GET failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load approved history.', data: { approvedRequests: [], approvedAssessments: [] } },
      { status: 500 }
    );
  }
}