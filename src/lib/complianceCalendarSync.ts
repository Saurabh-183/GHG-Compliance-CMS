import mongoose from 'mongoose';
import { CalendarItemModel } from '@/models/CalendarItem';
import { DataRequirementModel } from '@/models/DataRequirement';
import type { ComplianceType } from '@/types';
import { deriveMilestoneDates, parseCalendarItemId } from '@/lib/complianceCalendarView';

export type CalendarExtensionInput = {
  itemId: string;
  newDate: Date;
  reason: string;
  notificationRef: string;
};

export async function applyCalendarDueDateExtension(input: CalendarExtensionInput): Promise<{
  facilityId: string;
  complianceType: ComplianceType;
  reportingPeriod: string;
  regulatoryDueDate: Date;
}> {
  const parsed = parseCalendarItemId(input.itemId);
  const milestones = deriveMilestoneDates(input.newDate);
  const extensionEntry = {
    oldDate: input.newDate,
    newDate: input.newDate,
    reason: input.reason,
    notificationRef: input.notificationRef,
    revisedAt: new Date(),
  };

  let facilityId = '';
  let complianceType: ComplianceType = 'RCO';
  let reportingPeriod = '';

  if (parsed.kind === 'requirement' && parsed.requirementId) {
    const requirement = await DataRequirementModel.findById(parsed.requirementId);
    if (!requirement) {
      throw new Error('Linked data request not found');
    }

    if (requirement.workflowStatus === 'ACCEPTED' || requirement.workflowStatus === 'CLOSED') {
      throw new Error('Cannot extend due date for an accepted submission');
    }

    const previousDue = requirement.dueDate ? new Date(requirement.dueDate) : input.newDate;
    extensionEntry.oldDate = previousDue;
    requirement.dueDate = input.newDate;
    requirement.updatedAt = new Date();
    await requirement.save();

    facilityId = requirement.facilityId;
    reportingPeriod = requirement.period;
    complianceType =
      parsed.complianceType ||
      (requirement.linkedCompliances?.[0] as ComplianceType) ||
      'RCO';

    const requirementOid = requirement._id;

    // Strictly find or create CalendarItem for this specific requirement
    let calendarRow = await CalendarItemModel.findOne({ dataRequirementId: requirementOid });

    if (!calendarRow) {
      calendarRow = await CalendarItemModel.create({
        facilityId,
        complianceType,
        reportingPeriod,
        dataRequirementId: requirementOid,
        regulatoryDueDate: input.newDate,
        clientDataSubmissionDeadline: milestones.clientDataSubmissionDeadline,
        internalDeadline: milestones.internalDeadline,
        status: 'EXTENDED',
        extensionHistory: [
          {
            oldDate: extensionEntry.oldDate,
            newDate: input.newDate,
            reason: input.reason,
            notificationRef: input.notificationRef,
            revisedAt: new Date(),
          },
        ],
        isRecurringCEA: complianceType === 'CEA',
      });
    } else {
      calendarRow.extensionHistory.push({
        oldDate: extensionEntry.oldDate,
        newDate: input.newDate,
        reason: input.reason,
        notificationRef: input.notificationRef,
        revisedAt: new Date(),
      });
      calendarRow.regulatoryDueDate = input.newDate;
      calendarRow.clientDataSubmissionDeadline = milestones.clientDataSubmissionDeadline;
      calendarRow.internalDeadline = milestones.internalDeadline;
      calendarRow.status = 'EXTENDED';
      await calendarRow.save();
    }

    return {
      facilityId,
      complianceType,
      reportingPeriod,
      regulatoryDueDate: input.newDate,
    };

  } else if (parsed.calendarId && mongoose.Types.ObjectId.isValid(parsed.calendarId)) {
    const item = await CalendarItemModel.findById(parsed.calendarId);
    if (!item) {
      throw new Error('Calendar item not found');
    }

    extensionEntry.oldDate = item.regulatoryDueDate;
    item.extensionHistory.push({
      oldDate: item.regulatoryDueDate,
      newDate: input.newDate,
      reason: input.reason,
      notificationRef: input.notificationRef,
      revisedAt: new Date(),
    });
    item.regulatoryDueDate = input.newDate;
    item.clientDataSubmissionDeadline = milestones.clientDataSubmissionDeadline;
    item.internalDeadline = milestones.internalDeadline;
    item.status = 'EXTENDED';
    await item.save();

    facilityId = item.facilityId;
    complianceType = item.complianceType;
    reportingPeriod = item.reportingPeriod;

    if (item.dataRequirementId) {
      await DataRequirementModel.findByIdAndUpdate(item.dataRequirementId, {
        $set: { dueDate: input.newDate, updatedAt: new Date() },
      });
    } else {
      await DataRequirementModel.updateMany(
        {
          facilityId: item.facilityId,
          period: item.reportingPeriod,
          linkedCompliances: item.complianceType,
          isApplicable: { $ne: false },
        },
        { $set: { dueDate: input.newDate, updatedAt: new Date() } }
      );
    }

    return {
      facilityId,
      complianceType,
      reportingPeriod,
      regulatoryDueDate: input.newDate,
    };
  }

  throw new Error('Calendar item not found');
}