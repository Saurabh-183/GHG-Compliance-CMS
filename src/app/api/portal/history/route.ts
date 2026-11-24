import { isSoftwareSubmittedEvidence } from '@/lib/clientMonthlyEvidenceRows';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { FacilityModel } from '@/models/Facility';
import { DataRequirementModel } from '@/models/DataRequirement';
import { UserModel } from '@/models/User';
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
      data: { approvedRequests: [] },
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
      $or: [
        { workflowStatus: 'ACCEPTED' },
        { workflowStatus: 'CLOSED', verificationStatus: 'APPROVED' },
      ],
      approvedByRole: { $ne: 'ADMIN' },
    })
      .sort({ reviewedAt: -1, updatedAt: -1 })
      .lean();

    // Older records store only the reviewer's name. Match it only when the
    // corresponding staff accounts consistently identify a consultant.
    const legacyNames = [...new Set(requirements
      .filter((req) => !req.approvedByRole)
      .map((req) => req.reviewedByName)
      .filter((name): name is string => Boolean(name)))];
    const reviewers = legacyNames.length
      ? await UserModel.find({ name: { $in: legacyNames }, role: { $in: ['CONSULTANT', 'ADMIN'] } })
        .select('name role').lean()
      : [];
    const staffRoles = new Map<string, Set<string>>();
    for (const reviewer of reviewers) {
      const roles = staffRoles.get(reviewer.name) || new Set<string>();
      roles.add(reviewer.role);
      staffRoles.set(reviewer.name, roles);
    }
    const consultantRequests = requirements.filter((req) => {
      if (req.approvedByRole) return req.approvedByRole === 'CONSULTANT';
      const roles = staffRoles.get(req.reviewedByName || '');
      return roles?.size === 1 && roles.has('CONSULTANT');
    });

    const approvedRequests = consultantRequests.map((req) => {
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
        submittedDriveLinks: (req.submittedDriveLinks || []).filter(isSoftwareSubmittedEvidence).map((link) => ({
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

    return NextResponse.json({
      success: true,
      data: { approvedRequests },
    });
  } catch (error) {
    console.error('portal history GET failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load approved history.', data: { approvedRequests: [] } },
      { status: 500 }
    );
  }
}