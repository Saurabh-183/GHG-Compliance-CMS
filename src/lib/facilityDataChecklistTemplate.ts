import type { IFacilityDataChecklistItem } from '@/types';
import { DATA_REQUIREMENT_MASTER } from '@/lib/dataRequirementMaster';

/** @deprecated use DATA_REQUIREMENT_MASTER — re-exported for backward compatibility */
export const DATA_CHECKLIST_TEMPLATE_ITEMS: Omit<IFacilityDataChecklistItem, 'status' | 'notes'>[] =
  DATA_REQUIREMENT_MASTER.map((row) => ({
    itemKey: row.itemKey,
    label: row.name,
    sortOrder: Number(row.requirementId.replace(/\D/g, '')) || 0,
    masterRequirementId: row.requirementId,
    sourceColumnLabel: row.sourceColumnLabel,
    categoryKey: row.category,
  }));

export const DEFAULT_CHECKLIST_PERIOD = 'FY2025-26';

export function buildDefaultChecklistItems(): IFacilityDataChecklistItem[] {
  return DATA_REQUIREMENT_MASTER.map((row, index) => ({
    itemKey: row.itemKey,
    label: row.name,
    sortOrder: index + 1,
    status: 'NEEDS_VERIFICATION',
    applicability: 'NEEDS_VERIFICATION',
    masterRequirementId: row.requirementId,
    sourceColumnLabel: row.sourceColumnLabel,
    categoryKey: row.category,
    notes: '',
  }));
}