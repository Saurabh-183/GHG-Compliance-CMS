import { DEFAULT_CHECKLIST_PERIOD } from '@/lib/facilityDataChecklistTemplate';
import { COMPLIANCE_PERIODS } from '@/lib/complianceMatrixData';
import type { IAuthUserSession, IUser } from '@/types';

/** Demo Trident units — default client portal scope when JWT has no facility list */
export const DEFAULT_CLIENT_PORTAL_FACILITY_IDS = [
  'TRIDENT_PAPER',
  'TRIDENT_YARN',
  'TRIDENT_TEXTILES',
] as const;

export function authorizedFacilityIdsForPortal(
  session: IAuthUserSession | null
): string[] {
  if (!session) return [];
  if (session.role === 'CLIENT') {
    const fromSession = session.authorizedFacilityIds
      ?.map((id) => id.trim().toUpperCase())
      .filter(Boolean);
    return fromSession?.length ? fromSession : [...DEFAULT_CLIENT_PORTAL_FACILITY_IDS];
  }
  // Portal preview (consultant/admin): same demo client units, not the full directory
  return [...DEFAULT_CLIENT_PORTAL_FACILITY_IDS];
}

/** Client components: same allow-list as portal APIs from AuthContext user */
export function portalAllowListFromUser(user: Pick<IUser, 'role' | 'authorizedFacilityIds'> | null): string[] {
  if (!user) return [...DEFAULT_CLIENT_PORTAL_FACILITY_IDS];
  if (user.role === 'CLIENT') {
    const fromUser = user.authorizedFacilityIds
      ?.map((id) => id.trim().toUpperCase())
      .filter(Boolean);
    return fromUser?.length ? fromUser : [...DEFAULT_CLIENT_PORTAL_FACILITY_IDS];
  }
  return [...DEFAULT_CLIENT_PORTAL_FACILITY_IDS];
}

export function filterFacilitiesToPortalScope<T extends { facilityId: string }>(
  session: IAuthUserSession | null,
  list: T[]
): T[] {
  const allowed = new Set(authorizedFacilityIdsForPortal(session));
  return dedupeFacilitiesById(
    list.filter((f) => allowed.has((f.facilityId || '').trim().toUpperCase()))
  );
}

export const PORTAL_FACILITY_KEY = 'portalSelectedFacilityId';
export const PORTAL_PERIOD_KEY = 'portalSelectedPeriod';

export const PORTAL_PERIOD_OPTIONS = COMPLIANCE_PERIODS;

export function readPortalFacilityId(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(PORTAL_FACILITY_KEY) || '';
}

export function readPortalPeriod(): string {
  if (typeof window === 'undefined') return DEFAULT_CHECKLIST_PERIOD;
  return sessionStorage.getItem(PORTAL_PERIOD_KEY) || DEFAULT_CHECKLIST_PERIOD;
}

export function writePortalScope(facilityId: string, period: string): void {
  if (typeof window === 'undefined') return;
  if (facilityId) sessionStorage.setItem(PORTAL_FACILITY_KEY, facilityId);
  if (period) sessionStorage.setItem(PORTAL_PERIOD_KEY, period);
}

export function buildPortalScopeQuery(facilityId?: string, period?: string): string {
  const params = new URLSearchParams();
  if (facilityId?.trim()) params.set('facilityId', facilityId.trim());
  if (period?.trim()) params.set('period', period.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

/** One row per facilityId (API/mock sometimes returns duplicates). */
export function dedupeFacilitiesById<T extends { facilityId: string; name?: string }>(list: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of list) {
    const id = row.facilityId?.trim().toUpperCase();
    if (!id || byId.has(id)) continue;
    byId.set(id, row);
  }
  return Array.from(byId.values());
}