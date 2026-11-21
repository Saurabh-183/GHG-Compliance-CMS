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