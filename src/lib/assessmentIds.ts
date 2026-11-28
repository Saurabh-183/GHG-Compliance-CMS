import type { ComplianceType } from '@/types';

/** FY2024-25 → fy2425; FY2026-27 → fy2627 */
export function periodToCompactSlug(period: string): string {
  const trimmed = period.trim();
  const match = /^(?:FY)?(\d{4})-(\d{2})$/i.exec(trimmed);
  if (!match) return trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `fy${match[1].slice(2)}${match[2]}`;
}

export function compactSlugToPeriod(slug: string): string | null {
  const normalized = slug.toLowerCase();
  let match = /^fy(\d{2})(\d{2})$/.exec(normalized);
  if (match) return `FY20${match[1]}-${match[2]}`;
  match = /^fy(\d{4})(\d{2})$/.exec(normalized);
  if (match) return `FY${match[1]}-${match[2]}`;
  match = /^(\d{2})(\d{2})$/.exec(normalized);
  if (match) return `FY20${match[1]}-${match[2]}`;
  match = /^(\d{4})(\d{2})$/.exec(normalized);
  if (match) return `FY${match[1]}-${match[2]}`;
  return null;
}

export function buildAssessmentId(
  facilityId: string,
  complianceType: ComplianceType | string,
  period: string
): string {
  return `asm_${facilityId.toLowerCase()}_${complianceType.toLowerCase()}_${periodToCompactSlug(period)}`;
}

export function parseAssessmentId(id: string): {
  facilityId: string;
  complianceType: ComplianceType;
  period: string;
} | null {
  const slug = id.replace(/^asm_/, '').toLowerCase();
  const frameworks = ['rco', 'rpo', 'pat', 'ccts'] as const;
  for (const framework of frameworks) {
    const marker = `_${framework}_`;
    const idx = slug.lastIndexOf(marker);
    if (idx === -1) continue;
    const facilitySlug = slug.slice(0, idx);
    const periodSlug = slug.slice(idx + marker.length);
    const period = compactSlugToPeriod(periodSlug);
    if (!period || !facilitySlug) continue;
    return {
      facilityId: facilitySlug.toUpperCase(),
      complianceType: framework.toUpperCase() as ComplianceType,
      period,
    };
  }
  return null;
}