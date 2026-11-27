/**
 * Shared Indian financial-year helpers.
 * Indian financial years run from 1 April through 31 March.
 */

export const FINANCIAL_YEAR_WINDOW_SIZE = 3;

export function getFinancialYearStart(date: Date = new Date()): number {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

export function formatFinancialYear(startYear: number, includePrefix = true): string {
  const label = `${startYear}-${String(startYear + 1).slice(-2)}`;
  return includePrefix ? `FY${label}` : label;
}

/** Previous, current and upcoming FY, in chronological order. */
export function getRollingFinancialYears(
  date: Date = new Date(),
  count = FINANCIAL_YEAR_WINDOW_SIZE
): string[] {
  const currentStart = getFinancialYearStart(date);
  const safeCount = Math.max(1, Math.floor(count));
  const firstStart = currentStart - Math.floor((safeCount - 1) / 2);

  return Array.from({ length: safeCount }, (_, index) =>
    formatFinancialYear(firstStart + index)
  );
}

export function getCurrentFinancialYear(date: Date = new Date()): string {
  return formatFinancialYear(getFinancialYearStart(date));
}

/** Accepts FY2026-27 or 2026-27 and returns canonical FY-prefixed form. */
export function normalizeFinancialYearPeriod(period: string): string | null {
  const match = String(period || '').trim().match(/^(?:FY)?(20\d{2})-(\d{2})$/i);
  if (!match) return null;

  const startYear = Number(match[1]);
  const expectedEnd = String(startYear + 1).slice(-2);
  if (match[2] !== expectedEnd) return null;

  return formatFinancialYear(startYear);
}

export function isRollingFinancialYear(period: string, date: Date = new Date()): boolean {
  const normalized = normalizeFinancialYearPeriod(period);
  return normalized !== null && getRollingFinancialYears(date).includes(normalized);
}
