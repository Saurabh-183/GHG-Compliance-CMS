import { resolveRequirementDueDate } from '@/lib/dataRequestDueDate';
import type { IDataRequirement } from '@/types';

export interface DeadlineAlertItem {
  id: string;
  facilityId: string;
  title: string;
  period: string;
  dueDate: string;
  daysRemaining: number;
  isOverdue: boolean;
  isToday: boolean;
  urgency: 'critical' | 'urgent' | 'warning';
  linkUrl: string;
}

/**
 * Calculates remaining calendar days between today and the due date.
 * Returns:
 *   negative integer: overdue (e.g. -1 is 1 day overdue)
 *   0: due today
 *   positive integer: days remaining (e.g. 3 is 3 days remaining)
 *   null: invalid or missing date
 */
export function calculateDaysRemaining(
  dueDate?: Date | string | null,
  now = new Date()
): number | null {
  if (!dueDate) return null;
  const due = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffMs = startOfDueDay.getTime() - startOfToday.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function isDueWithinFiveDaysOrOverdue(dueDate?: Date | string | null): boolean {
  const days = calculateDaysRemaining(dueDate);
  return days !== null && days <= 5;
}

/**
 * Extracts urgent deadline alert items from a list of data requirements for instant UI banners.
 * Pure function: safe to call from both Client and Server components.
 */
export function extractPortalDeadlineAlerts(
  requirements: IDataRequirement[]
): DeadlineAlertItem[] {
  const alerts: DeadlineAlertItem[] = [];

  for (const req of requirements) {
    if (req.isApplicable === false) continue;
    if (['ACCEPTED', 'CLOSED'].includes(req.workflowStatus || '')) continue;
    if (['APPROVED', 'RECEIVED'].includes(req.submissionStatus || '')) continue;

    const rawDue =
      req.dueDate ||
      (req.period ? resolveRequirementDueDate(req.dueDate, req.period, req.requestedAt) : null);
    if (!rawDue) continue;

    const daysRemaining = calculateDaysRemaining(rawDue);
    if (daysRemaining === null || daysRemaining > 5) continue;

    const isOverdue = daysRemaining < 0;
    const isToday = daysRemaining === 0;

    alerts.push({
      id: req._id,
      facilityId: req.facilityId,
      title: req.title,
      period: req.period,
      dueDate: new Date(rawDue).toISOString(),
      daysRemaining,
      isOverdue,
      isToday,
      urgency: isOverdue ? 'critical' : isToday ? 'urgent' : 'warning',
      linkUrl: `/portal/requests?facilityId=${encodeURIComponent(
        req.facilityId
      )}&period=${encodeURIComponent(req.period)}#req-${req._id}`,
    });
  }

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);
}
