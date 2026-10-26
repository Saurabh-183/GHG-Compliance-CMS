import { MOCK_CLIENT_GROUPS, MOCK_FACILITIES } from '@/lib/mockFallback';
import { SHEET_STRUCTURE } from '@/lib/sheetStructure';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const slug = (s: string) =>
  s.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');

/**
 * Builds the final company + facility lists from the sheet structure.
 * - Company names/contact details are reused from mockFallback when a match exists.
 * - Companies that only exist as their own row in the sheet get a new record.
 * - Throws if any facility is missing, duplicated, or unassigned.
 */
export function buildClientData() {
  const mockGroupByName = new Map<string, any>(
    MOCK_CLIENT_GROUPS.map((g: any) => [norm(g.name), g])
  );
  const mockFacilityById = new Map<string, any>(
    MOCK_FACILITIES.map((f: any) => [f.facilityId, f])
  );

  const groups: any[] = [];
  const facilities: any[] = [];
  const usedCodes = new Set<string>();
  const seenFacilityIds = new Set<string>();
  let seq = 0;

  for (const spec of SHEET_STRUCTURE) {
    const existing = mockGroupByName.get(norm(spec.company));
    let group: any;

    if (existing) {
      group = { ...existing };
    } else {
      seq += 1;
      const first = mockFacilityById.get(spec.facilityIds[0]);
      let code = slug(spec.company).slice(0, 40);
      group = {
        _id: '672' + String(seq).padStart(21, '0'), // valid 24-char ObjectId
        name: spec.company,
        code,
        industry: first
          ? first.category.replace(/^(Designated Consumer \(DC\)|Commercial Industrial Unit) - /, '')
          : 'Industrial / manufacturing (confirm with client)',
        headquarters: first?.location ?? 'Not provided in source PDF',
        contactPerson: {
          name: 'Not provided',
          email: `compliance+${code.toLowerCase()}@example.com`,
          phone: 'Not provided',
        },
      };
    }

    while (usedCodes.has(group.code)) group.code += '_X';
    usedCodes.add(group.code);
    groups.push(group);

    for (const fid of spec.facilityIds) {
      const mf = mockFacilityById.get(fid);
      if (!mf) throw new Error(`sheetStructure references unknown facility ${fid}`);
      if (seenFacilityIds.has(fid)) throw new Error(`Facility ${fid} assigned twice`);
      seenFacilityIds.add(fid);
      facilities.push({ ...mf, clientGroupId: group._id, clientGroupName: group.name });
    }
  }

  const unassigned = MOCK_FACILITIES.filter((f: any) => !seenFacilityIds.has(f.facilityId));
  if (unassigned.length) {
    throw new Error(`Facilities not in sheetStructure: ${unassigned.map((f: any) => f.facilityId).join(', ')}`);
  }

  return { groups, facilities, droppedParents: [] as string[] };
}
