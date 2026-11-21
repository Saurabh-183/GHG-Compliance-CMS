import { DataRequirementModel } from '@/models/DataRequirement';
import type { ComplianceType, IFacilityDataChecklistItem } from '@/types';
import {
  getMasterRequirement,
  energyCategoryForItem,
  isRequestableApplicability,
  legacyChecklistStatusToApplicability,
} from '@/lib/dataRequirementMaster';

const DEFAULT_COMPLIANCES: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];

/**
 * Creates or refreshes portal data requests for each checklist row marked applicable (Due),
 * scoped to a single facility and reporting period.
 */
export async function syncDueChecklistItemsToRequirements(
  facilityId: string,
  period: string,
  items: IFacilityDataChecklistItem[],
  consultantNotes?: string
): Promise<{ created: number; refreshed: number }> {
  const cleanFacility = facilityId.toUpperCase();
  let created = 0;
  let refreshed = 0;

  const dueItems = items.filter((row) => {
    const applicability =
      row.applicability || legacyChecklistStatusToApplicability(row.status, row.notes);
    return row.status === 'DUE' && isRequestableApplicability(applicability);
  });

  for (const row of dueItems) {
    const master = getMasterRequirement(row.itemKey);
    const title = (master?.name || row.label).trim();
    if (!title) continue;

    const description =
      row.notes?.trim() ||
      master?.description ||
      (consultantNotes?.trim()
        ? `${consultantNotes.trim()} — Please submit via the client portal with a Google Drive link.`
        : 'Please submit this report or dataset for your facility via the client portal with a Google Drive link.');

    const existing = await DataRequirementModel.findOne({
      facilityId: cleanFacility,
      period,
      sourceChecklistItemKey: row.itemKey,
    });

    if (existing) {
      if (existing.submissionStatus === 'REQUESTED' || existing.submissionStatus === 'NOT_REQUESTED') {
        existing.submissionStatus = 'REQUESTED';
        existing.verificationStatus = 'NOT_STARTED';
        existing.workflowStatus = existing.workflowStatus === 'DRAFT' ? 'REQUESTED' : existing.workflowStatus;
        existing.requestedAt = new Date();
        existing.description = description;
        existing.masterRequirementId = master?.requirementId;
        existing.title = title;
        await existing.save();
        refreshed += 1;
      }
      continue;
    }

    await DataRequirementModel.create({
      facilityId: cleanFacility,
      period,
      title,
      sourceChecklistItemKey: row.itemKey,
      masterRequirementId: master?.requirementId,
      category: energyCategoryForItem(row.itemKey),
      linkedCompliances: master?.defaultCompliances || DEFAULT_COMPLIANCES,
      description,
      dataCategory: master?.category,
      reportingFrequency: master?.reportingFrequency,
      requiredFields: master?.structuredFields,
      requiredDocumentSpecs: master?.documentSpecs,
      requiredDocuments: master?.documentSpecs?.map((d) => d.name),
      isApplicable: true,
      submissionStatus: 'REQUESTED',
      verificationStatus: 'NOT_STARTED',
      workflowStatus: 'REQUESTED',
      requirementItemStatus: 'PENDING',
      requestedAt: new Date(),
    });
    created += 1;
  }

  return { created, refreshed };
}