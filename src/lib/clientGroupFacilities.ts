import type { IClientGroup, IFacility } from '@/types';

export function flattenGroupFacilities(groups: IClientGroup[]): IFacility[] {
  return groups.flatMap((group) => group.facilities || []);
}

/** Resolve facilities for dashboard / data-review company filter (handles _id vs code mismatches). */
export function resolveCompanyScope(
  selectedCompanyId: string,
  groups: IClientGroup[]
): { selectedGroup: IClientGroup | undefined; currentFacilities: IFacility[] } {
  const allFacilities = flattenGroupFacilities(groups);

  if (!selectedCompanyId || selectedCompanyId === 'ALL') {
    return { selectedGroup: undefined, currentFacilities: allFacilities };
  }

  const selectedGroup = groups.find(
    (group) => group._id === selectedCompanyId || group.code === selectedCompanyId
  );

  if (!selectedGroup) {
    return { selectedGroup: undefined, currentFacilities: allFacilities };
  }

  const embedded = selectedGroup.facilities?.length ? selectedGroup.facilities : [];
  if (embedded.length > 0) {
    return { selectedGroup, currentFacilities: embedded };
  }

  const matched = allFacilities.filter(
    (facility) =>
      facility.clientGroupId === selectedGroup._id ||
      facility.clientGroupId === selectedGroup.code ||
      (selectedGroup.code &&
        facility.clientGroupId?.toUpperCase() === selectedGroup.code.toUpperCase()) ||
      (selectedGroup.name &&
        facility.clientGroupName &&
        facility.clientGroupName.toLowerCase() === selectedGroup.name.toLowerCase())
  );

  return { selectedGroup, currentFacilities: matched };
}

export function facilityIdsCsv(facilities: IFacility[]): string | undefined {
  const ids = facilities.map((f) => f.facilityId?.trim().toUpperCase()).filter(Boolean);
  if (!ids.length) return undefined;
  return ids.join(',');
}