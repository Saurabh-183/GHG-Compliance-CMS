import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { DataRequirementModel } from '@/models/DataRequirement';
import { FacilityModel } from '@/models/Facility';
import { ClientGroupModel } from '@/models/ClientGroup';
import { getSessionFromRequest, authorizeRole, isAuthorizedForFacility } from '@/lib/auth';
import { getMasterRequirement } from '@/lib/dataRequirementMaster';
import { resolveDataCategoryLabel } from '@/lib/dataRequestDisplay';
import {
  resolveClientUploadWorkflowDisplay,
  resolveEffectiveMappingStatus,
  type EffectiveMappingStatus,
} from '@/lib/clientUploadStatus';
import { activeSubmissionLinkIndexes } from '@/lib/clientSubmissionLinkUpsert';
import {
  resolveComplianceVaultFolderUrl,
  rewriteLegacyVaultUrlsInText,
} from '@/lib/gdrive';

export interface ClientUploadListItem {
  requirementId: string;
  requirementTitle: string;
  facilityId: string;
  facilityName?: string;
  clientGroupName?: string;
  period: string;
  dataCategory?: string;
  sourceChecklistItemKey?: string;
  workflowStatus?: string;
  linkIndex: number;
  url: string;
  sourceUrl?: string;
  vaultUrl?: string;
  vaultFolderPath?: string;
  vaultFolderUrl?: string;
  vaultCategory?: string;
  vaultFileId?: string;
  driveFolderId?: string;
  vaultTargetFolderId?: string;
  fileName?: string;
  ingestionMode?: string;
  description: string;
  submittedAt: string;
  submittedBy: string;
  mappingStatus?: string;
  effectiveMappingStatus: EffectiveMappingStatus;
  displayWorkflowStatus: string;
  mappedMonth?: string;
  mappedDatasetId?: string;
  verificationNotes?: string;
  verificationStatus: string;
  submissionStatus: string;
  requestId?: string;
  bundleId?: string;
  requiredFields?: Array<{ key: string; label: string; type: string; required: boolean }>;
  fieldReviews?: Array<{ fieldKey: string; status: string; comment?: string }>;
}

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!authorizeRole(session, ['ADMIN', 'CONSULTANT'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const facilityIdParam = request.nextUrl.searchParams.get('facilityId')?.toUpperCase();
  const facilityIdsParam = request.nextUrl.searchParams
    .get('facilityIds')
    ?.split(',')
    .map((id) => id.trim().toUpperCase())
    .filter(Boolean);
  const clientGroupId = request.nextUrl.searchParams.get('clientGroupId');
  const mappingStatus = request.nextUrl.searchParams.get('mappingStatus');

  try {
    await connectToDatabase();

    type FacilityFilter = string | { $in: string[] };

    const query: {
      facilityId?: FacilityFilter;
      'submittedDriveLinks.0': { $exists: boolean };
    } = {
      'submittedDriveLinks.0': { $exists: true },
    };

    if (facilityIdParam) {
      if (!isAuthorizedForFacility(session, facilityIdParam)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query.facilityId = facilityIdParam;
    } else if (facilityIdsParam?.length) {
      query.facilityId = { $in: facilityIdsParam };
    } else if (clientGroupId) {
      let groupFacilities = await FacilityModel.find({ clientGroupId }).select('facilityId').lean();
      if (!groupFacilities.length) {
        const { ClientGroupModel } = await import('@/models/ClientGroup');
        const group = await ClientGroupModel.findOne({
          $or: [{ _id: clientGroupId }, { code: clientGroupId.toUpperCase() }],
        })
          .select('_id')
          .lean();
        if (group?._id) {
          groupFacilities = await FacilityModel.find({ clientGroupId: group._id })
            .select('facilityId')
            .lean();
        }
      }
      const ids = groupFacilities.map((f) => f.facilityId);
      if (!ids.length) {
        return NextResponse.json({ success: true, data: [], total: 0 });
      }
      query.facilityId = { $in: ids };
    } else if (session!.role === 'CONSULTANT') {
      const assigned = await FacilityModel.find({ assignedConsultantId: session!.userId })
        .select('facilityId')
        .lean();
      const ids = assigned.map((f) => f.facilityId);
      if (!ids.length) {
        return NextResponse.json({ success: true, data: [], total: 0 });
      }
      query.facilityId = { $in: ids };
    }

    const requirements = await DataRequirementModel.find(query).sort({ updatedAt: -1 }).lean();

    const facilityIds = [...new Set(requirements.map((r) => r.facilityId))];
    const facilities = await FacilityModel.find({ facilityId: { $in: facilityIds } })
      .select('facilityId name clientGroupId')
      .lean();
    const facilityMeta = new Map(facilities.map((f) => [f.facilityId, f]));

    const groupIds = [...new Set(facilities.map((f) => f.clientGroupId?.toString()).filter(Boolean))];
    const groups = await ClientGroupModel.find({ _id: { $in: groupIds } }).select('name').lean();
    const groupNameById = new Map(groups.map((g) => [g._id.toString(), g.name]));

    const items: ClientUploadListItem[] = [];

    for (const req of requirements) {
      const meta = facilityMeta.get(req.facilityId);
      const clientGroupName = meta?.clientGroupId
        ? groupNameById.get(meta.clientGroupId.toString())
        : undefined;
      const category = resolveDataCategoryLabel({
        dataCategory: req.dataCategory,
        category: req.category,
        title: req.title,
        sourceChecklistItemKey: req.sourceChecklistItemKey,
      });

      for (const linkIndex of activeSubmissionLinkIndexes(req)) {
        const link = req.submittedDriveLinks[linkIndex];
        if (!link) continue;
        const effectiveMapping = resolveEffectiveMappingStatus({
          linkMappingStatus: link.mappingStatus,
          workflowStatus: req.workflowStatus,
          verificationStatus: req.verificationStatus,
        });
        const displayWorkflow = resolveClientUploadWorkflowDisplay({
          workflowStatus: req.workflowStatus,
          verificationStatus: req.verificationStatus,
          submissionStatus: req.submissionStatus,
        });
        if (mappingStatus && mappingStatus !== 'ALL' && effectiveMapping !== mappingStatus) return;

        const master = req.sourceChecklistItemKey
          ? getMasterRequirement(req.sourceChecklistItemKey)
          : undefined;

        items.push({
          requirementId: req._id.toString(),
          requirementTitle: req.title,
          facilityId: req.facilityId,
          facilityName: meta?.name,
          clientGroupName,
          period: req.period,
          dataCategory: category,
          sourceChecklistItemKey: req.sourceChecklistItemKey,
          workflowStatus: req.workflowStatus,
          bundleId: req.bundleId,
          linkIndex,
          url: rewriteLegacyVaultUrlsInText(link.url),
          sourceUrl: rewriteLegacyVaultUrlsInText(link.sourceUrl),
          vaultUrl: rewriteLegacyVaultUrlsInText(link.vaultUrl),
          vaultFolderPath: link.vaultFolderPath || master?.name,
          vaultFolderUrl: resolveComplianceVaultFolderUrl(link.vaultFolderUrl),
          vaultCategory: link.vaultCategory || category,
          vaultFileId: link.vaultFileId,
          driveFolderId: link.driveFolderId,
          vaultTargetFolderId: link.vaultTargetFolderId,
          fileName: link.fileName || link.description,
          ingestionMode: link.ingestionMode,
          description: link.description,
          submittedAt:
            link.submittedAt instanceof Date
              ? link.submittedAt.toISOString()
              : String(link.submittedAt),
          submittedBy: link.submittedBy,
          mappingStatus: link.mappingStatus || 'PENDING',
          effectiveMappingStatus: effectiveMapping,
          displayWorkflowStatus: displayWorkflow,
          mappedMonth: link.mappedMonth,
          mappedDatasetId: link.mappedDatasetId?.toString(),
          verificationNotes: link.verificationNotes,
          verificationStatus: req.verificationStatus,
          submissionStatus: req.submissionStatus,
          requestId: req.requestId,
          requiredFields: req.requiredFields,
          fieldReviews: req.fieldReviews,
        });
      }
    }

    items.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    const stats = {
      total: items.length,
      pending: items.filter((i) => i.effectiveMappingStatus === 'PENDING').length,
      mapped: items.filter((i) => i.effectiveMappingStatus === 'MAPPED').length,
      verified: items.filter((i) => i.effectiveMappingStatus === 'VERIFIED').length,
      rejected: items.filter((i) => i.effectiveMappingStatus === 'REJECTED').length,
    };

    return NextResponse.json({ success: true, data: items, total: items.length, stats });
  } catch (error) {
    console.error('client-uploads GET failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load client uploads from database.', data: [], total: 0 },
      { status: 500 }
    );
  }
}