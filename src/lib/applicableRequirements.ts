import type {
  ChecklistApplicabilityStatus,
  DataChecklistItemStatus,
  IFacilityApplicableRequirement,
  IFacilityDataChecklistItem,
  IMasterRequirementRowPublic,
} from '@/types';
import {
  DATA_REQUIREMENT_MASTER,
  MASTER_REQUIREMENT_CATEGORIES,
  getMasterRequirement,
  isRequestableApplicability,
  legacyChecklistStatusToApplicability,
} from '@/lib/dataRequirementMaster';
import type { IFacilityDataChecklist } from '@/types';

function toPublicMaster(row: (typeof DATA_REQUIREMENT_MASTER)[number]): IMasterRequirementRowPublic {
  return {
    requirementId: row.requirementId,
    itemKey: row.itemKey,
    name: row.name,
    sourceColumnLabel: row.sourceColumnLabel,
    category: row.category,
    categoryLabel: MASTER_REQUIREMENT_CATEGORIES[row.category],
    description: row.description,
    requiredEvidence: row.requiredEvidence,
    inputType: row.inputType,
    reportingFrequency: row.reportingFrequency,
    unit: row.unit,
    mandatory: row.mandatory,
    specialInstructions: row.specialInstructions,
    defaultCompliances: row.defaultCompliances,
  };
}

export function mergeChecklistItemsWithMaster(
  items: IFacilityDataChecklistItem[]
): IFacilityDataChecklistItem[] {
  const byKey = new Map(items.map((i) => [i.itemKey, i]));
  const merged: IFacilityDataChecklistItem[] = [];

  for (const row of DATA_REQUIREMENT_MASTER) {
    const existing = byKey.get(row.itemKey);
    const legacy = existing?.status || 'NEEDS_VERIFICATION';
    const applicability: ChecklistApplicabilityStatus =
      existing?.applicability ||
      legacyChecklistStatusToApplicability(legacy, existing?.notes);

    merged.push({
      itemKey: row.itemKey,
      label: row.name,
      sortOrder: Number(row.requirementId.replace(/\D/g, '')) || merged.length + 1,
      status: legacy,
      applicability,
      importedApplicability: existing?.importedApplicability ?? applicability,
      masterRequirementId: row.requirementId,
      sourceColumnLabel: row.sourceColumnLabel,
      categoryKey: row.category,
      specialInstruction: existing?.specialInstruction ?? row.specialInstructions,
      notes: existing?.notes || '',
    });
  }

  // Preserve custom rows
  for (const item of items) {
    if (!getMasterRequirement(item.itemKey)) {
      merged.push(item);
    }
  }

  return merged.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveApplicabilityForItem(item: IFacilityDataChecklistItem): ChecklistApplicabilityStatus {
  if (item.applicability) return item.applicability;
  return legacyChecklistStatusToApplicability(item.status, item.notes);
}

export function buildApplicableRequirementsList(
  checklist: IFacilityDataChecklist | null
): IFacilityApplicableRequirement[] {
  const items = mergeChecklistItemsWithMaster(checklist?.items || []);

  return items.map((item) => {
    const masterRow = getMasterRequirement(item.itemKey);
    if (!masterRow) {
      return {
        master: {
          requirementId: item.itemKey,
          itemKey: item.itemKey,
          name: item.label,
          sourceColumnLabel: item.label,
          category: 'PRODUCTION',
          categoryLabel: 'Custom',
          description: item.notes || '',
          requiredEvidence: '',
          inputType: 'MIXED',
          reportingFrequency: 'ANNUAL',
          mandatory: false,
        },
        applicability: resolveApplicabilityForItem(item),
        checklistStatus: item.status,
        notes: item.notes,
        requestable: item.status === 'DUE' || resolveApplicabilityForItem(item) === 'APPLICABLE',
        needsVerification: resolveApplicabilityForItem(item) === 'NEEDS_VERIFICATION',
      };
    }

    const applicability = resolveApplicabilityForItem(item);
    return {
      master: toPublicMaster(masterRow),
      applicability,
      checklistStatus: item.status as DataChecklistItemStatus,
      notes: item.notes,
      requestable: isRequestableApplicability(applicability) && item.status !== 'NOT_APPLICABLE' && item.status !== 'NOT_REQUIRED',
      needsVerification: applicability === 'NEEDS_VERIFICATION' || applicability === 'UNSELECTED',
    };
  });
}

export function dataReadinessByCategory(list: IFacilityApplicableRequirement[]) {
  const buckets = new Map<string, { applicable: number; accepted: number; pending: number; na: number; verify: number }>();

  for (const row of list) {
    const key = row.master.categoryLabel;
    const bucket = buckets.get(key) || { applicable: 0, accepted: 0, pending: 0, na: 0, verify: 0 };
    if (row.applicability === 'NOT_APPLICABLE' || row.applicability === 'NOT_REQUIRED') {
      bucket.na += 1;
    } else if (row.needsVerification) {
      bucket.verify += 1;
    } else if (row.applicability === 'APPLICABLE') {
      bucket.applicable += 1;
      if (row.checklistStatus === 'RECEIVED') bucket.accepted += 1;
      else if (row.checklistStatus === 'DUE' || row.checklistStatus === 'NEEDS_VERIFICATION') bucket.pending += 1;
    }
    buckets.set(key, bucket);
  }

  return [...buckets.entries()].map(([category, stats]) => ({
    category,
    ...stats,
    percentComplete: stats.applicable > 0 ? Math.round((stats.accepted / stats.applicable) * 100) : 0,
  }));
}