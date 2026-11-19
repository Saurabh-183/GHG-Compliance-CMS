import { DataRequirementModel } from '@/models/DataRequirement';
import type { ComplianceType, IFacilityDataChecklistItem } from '@/types';

const ENERGY_ITEM_KEYS = new Set([
  'GRID_BILLS',
  'OA_PURCHASE',
  'DG_SET',
  'POWER_PER_MACHINE',
  'AUX_POWER',
  'TURBINE_POWER',
]);

function categoryForItem(itemKey: string): 'COMMON_ENERGY' | 'COMPLIANCE_SPECIFIC' {
  return ENERGY_ITEM_KEYS.has(itemKey) ? 'COMMON_ENERGY' : 'COMPLIANCE_SPECIFIC';
}

const DEFAULT_COMPLIANCES: ComplianceType[] = ['RCO', 'PAT', 'CCTS', 'CEA'];

/**
 * Creates or refreshes portal data requests for each checklist row still marked Due,
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

  const dueItems = items.filter((row) => row.status === 'DUE');

  for (const row of dueItems) {
    const title = row.label.trim();
    if (!title) continue;

    const description =
      row.notes?.trim() ||
      (consultantNotes?.trim()
        ? `${consultantNotes.trim()} — Please submit via the client portal with a Google Drive link.`
        : 'Please submit this report or dataset for your facility via the client portal with a Google Drive link.');

    const existing = await DataRequirementModel.findOne({
      facilityId: cleanFacility,
      period,
      title,
    });

    if (existing) {
      if (existing.submissionStatus === 'REQUESTED' || existing.submissionStatus === 'NOT_REQUESTED') {
        existing.submissionStatus = 'REQUESTED';
        existing.verificationStatus = 'NOT_STARTED';
        existing.requestedAt = new Date();
        existing.description = description;
        await existing.save();
        refreshed += 1;
      }
      continue;
    }

    await DataRequirementModel.create({
      facilityId: cleanFacility,
      period,
      title,
      category: categoryForItem(row.itemKey),
      linkedCompliances: DEFAULT_COMPLIANCES,
      description,
      isApplicable: true,
      submissionStatus: 'REQUESTED',
      verificationStatus: 'NOT_STARTED',
      requestedAt: new Date(),
    });
    created += 1;
  }

  return { created, refreshed };
}