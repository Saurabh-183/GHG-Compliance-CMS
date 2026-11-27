import { Notification } from '@/models/Notification';
import { DataRequirementModel } from '@/models/DataRequirement';
import { CalendarItemModel } from '@/models/CalendarItem';
import { resolveRequirementDueDate } from '@/lib/dataRequestDueDate';
import {
  calculateDaysRemaining,
  isDueWithinFiveDaysOrOverdue,
  extractPortalDeadlineAlerts,
  type DeadlineAlertItem,
} from './deadlineAlertsShared';

export {
  calculateDaysRemaining,
  isDueWithinFiveDaysOrOverdue,
  extractPortalDeadlineAlerts,
  type DeadlineAlertItem,
};

/**
 * Checks and creates deadline reminder notifications for all applicable client data requirements
 * and calendar milestones that are within 5 days of their due date or already overdue.
 */
export async function syncClientDeadlineNotifications(session?: {
  role?: string;
  userId?: string;
  authorizedFacilityIds?: string[];
}): Promise<{ created: number }> {
  let createdCount = 0;
  const now = new Date();
  const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const facilityFilter: Record<string, unknown> = {};
  if (session?.role !== 'ADMIN' && session?.authorizedFacilityIds?.length) {
    facilityFilter.facilityId = { $in: session.authorizedFacilityIds };
  } else if (session?.role !== 'ADMIN' && session?.role === 'CLIENT') {
    return { created: 0 };
  }

  // 1. Check DataRequirementModel (Direct Client Submissions)
  const pendingRequirements = (await DataRequirementModel.find({
    ...facilityFilter,
    isApplicable: { $ne: false },
    workflowStatus: { $nin: ['ACCEPTED', 'CLOSED'] },
    submissionStatus: { $nin: ['APPROVED', 'RECEIVED', 'NOT_REQUESTED'] },
  } as any).lean()) as any[];

  for (const req of pendingRequirements) {
    const rawDue =
      req.dueDate ||
      (req.period ? resolveRequirementDueDate(req.dueDate, req.period, req.requestedAt) : null);
    if (!rawDue) continue;

    const daysRemaining = calculateDaysRemaining(rawDue, now);
    if (daysRemaining === null || daysRemaining > 5) continue;

    const reqIdStr = String(req._id);
    const linkUrl = `/portal/requests?facilityId=${encodeURIComponent(
      req.facilityId
    )}&period=${encodeURIComponent(req.period)}#req-${reqIdStr}`;

    const isOverdue = daysRemaining < 0;
    const isToday = daysRemaining === 0;

    // For overdue requirements (due date passed): strictly only allow ONE reminder notification ever.
    // For upcoming requirements (<= 5 days): deduplicate within the past 24 hours.
    const existing = await Notification.findOne({
      recipientRole: 'CLIENT',
      type: 'DEADLINE_REMINDER',
      facilityId: req.facilityId,
      linkUrl,
      ...(isOverdue ? {} : { createdAt: { $gte: past24h } }),
    });

    if (existing) continue;

    const dueObj = new Date(rawDue);
    const formattedDueDate = dueObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let title = '';
    let message = '';

    if (isOverdue) {
      const pastDays = Math.abs(daysRemaining);
      title = `${req.title} (${req.facilityId}) — ${pastDays}d overdue`;
      message = `Submission deadline expired on ${formattedDueDate} (${pastDays} day${pastDays === 1 ? '' : 's'} ago). Please upload required compliance files and submit.`;
    } else if (isToday) {
      title = `${req.title} (${req.facilityId}) — due today`;
      message = `Submission is due today (${formattedDueDate}). Please submit your data before the cut-off.`;
    } else {
      title = `${req.title} (${req.facilityId}) — due in ${daysRemaining} days`;
      message = `Upcoming client submission deadline is on ${formattedDueDate} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining).`;
    }

    try {
      await Notification.create({
        recipientRole: 'CLIENT',
        recipientUserId: session?.role === 'CLIENT' ? session.userId : undefined,
        senderRole: 'SYSTEM',
        senderName: 'Compliance Deadline',
        type: 'DEADLINE_REMINDER',
        title,
        message,
        facilityId: req.facilityId,
        linkUrl,
        isRead: false,
        createdAt: now,
      });
      createdCount++;
    } catch (err) {
      console.warn('Failed to insert deadline notification:', err);
    }
  }

  // 2. Check CalendarItemModel (Statutory Client Submission Deadlines)
  const pendingCalendarItems = (await CalendarItemModel.find({
    ...facilityFilter,
    status: { $in: ['UPCOMING', 'PENDING', 'EXTENDED'] },
  } as any).lean()) as any[];

  for (const item of pendingCalendarItems) {
    const rawDue = item.clientDataSubmissionDeadline || item.regulatoryDueDate;
    if (!rawDue) continue;

    const daysRemaining = calculateDaysRemaining(rawDue, now);
    if (daysRemaining === null || daysRemaining > 5) continue;

    const linkUrl = `/calendar?facilityId=${encodeURIComponent(item.facilityId)}`;
    const calKey = `cal-${String(item._id)}`;

    const isOverdue = daysRemaining < 0;
    const isToday = daysRemaining === 0;

    const existing = await Notification.findOne({
      recipientRole: 'CLIENT',
      type: 'DEADLINE_REMINDER',
      facilityId: item.facilityId,
      linkUrl: { $regex: encodeURIComponent(item.facilityId) },
      title: { $regex: item.complianceType, $options: 'i' },
      ...(isOverdue ? {} : { createdAt: { $gte: past24h } }),
    });

    if (existing) continue;

    const dueObj = new Date(rawDue);
    const formattedDueDate = dueObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let title = '';
    let message = '';

    if (isOverdue) {
      const pastDays = Math.abs(daysRemaining);
      title = `${item.complianceType} filing overdue: ${item.facilityId}`;
      message = `Client submission deadline for ${item.complianceType} (${item.reportingPeriod}) passed on ${formattedDueDate} (${pastDays} day${pastDays === 1 ? '' : 's'} ago).`;
    } else if (isToday) {
      title = `${item.complianceType} filing due today: ${item.facilityId}`;
      message = `Client submission deadline for ${item.complianceType} (${item.reportingPeriod}) is today (${formattedDueDate}).`;
    } else {
      title = `${item.complianceType} filing due in ${daysRemaining} days: ${item.facilityId}`;
      message = `Client submission deadline for ${item.complianceType} (${item.reportingPeriod}) is on ${formattedDueDate} (${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining).`;
    }

    try {
      await Notification.create({
        recipientRole: 'CLIENT',
        recipientUserId: session?.role === 'CLIENT' ? session.userId : undefined,
        senderRole: 'SYSTEM',
        senderName: 'Statutory Calendar',
        type: 'DEADLINE_REMINDER',
        title,
        message,
        facilityId: item.facilityId,
        linkUrl,
        isRead: false,
        createdAt: now,
      });
      createdCount++;
    } catch (err) {
      console.warn('Failed to insert calendar deadline notification:', err);
    }
  }

  return { created: createdCount };
}
