/** Client submission cutoff: end of the due date (local calendar day). */
export function isDataRequestPastDue(dueDate?: string | Date | null, now = new Date()): boolean {
  if (!dueDate) return false;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const endOfDueDay = new Date(due);
  endOfDueDay.setHours(23, 59, 59, 999);
  return now.getTime() > endOfDueDay.getTime();
}

export function clientSubmissionDueBlockedMessage(dueDate?: string | Date | null): string | null {
  if (!isDataRequestPastDue(dueDate)) return null;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate!);
  const label = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `The submission due date (${label}) has passed. Ask your consultant to extend the deadline from the compliance calendar if you still need to submit.`;
}

export function assertClientCanSubmitRequirement(dueDate?: string | Date | null): void {
  const msg = clientSubmissionDueBlockedMessage(dueDate);
  if (msg) {
    throw new Error(msg);
  }
}

/**
 * Resolves an effective due date for a requirement. If not set, derives a standard statutory deadline
 * based on compliance reporting period, or defaults to 30 days from request/creation date.
 */
export function resolveRequirementDueDate(
  dueDate?: string | Date | null,
  period?: string,
  requestedAt?: string | Date | null
): string {
  if (dueDate) {
    const d = new Date(dueDate);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  if (period?.includes('2025-26') || period?.includes('25-26')) {
    return '2025-07-20T00:00:00.000Z';
  }
  if (period?.includes('2024-25') || period?.includes('24-25')) {
    return '2024-07-20T00:00:00.000Z';
  }
  if (period?.includes('2026-27') || period?.includes('26-27')) {
    return '2026-07-20T00:00:00.000Z';
  }
  const base = requestedAt ? new Date(requestedAt) : new Date();
  const fallback = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  return fallback.toISOString();
}
