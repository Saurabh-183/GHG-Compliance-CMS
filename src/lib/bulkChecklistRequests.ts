import crypto from 'crypto';
import { DataRequirementModel } from '@/models/DataRequirement';
import { Notification } from '@/models/Notification';
import type { ComplianceType } from '@/types';
import { getMasterRequirement, energyCategoryForItem, MASTER_REQUIREMENT_CATEGORIES } from '@/lib/dataRequirementMaster';
import { assertTransition } from '@/lib/requestWorkflow';
import { DEFAULT_SUBMISSION_FORMAT, normalizeDocumentSpecsForDriveXlsx } from '@/lib/submissionPolicy';
import type { RequestWorkflowStatus } from '@/types';

export interface BulkChecklistSendInput {
  facilityId: string;
  period: string;
  itemKeys: string[];
  bundleTitle: string;
  purpose?: string;
  instructions?: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  linkedCompliances?: ComplianceType[];
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
  selectedMonths?: string[];
  notifyClient?: boolean;
  saveAsDraft?: boolean;
  requestedBy?: string;
  requestedByName?: string;
  assignedClientContact?: string;
  checklistVersion?: string;
}

export async function createBulkChecklistRequirements(input: BulkChecklistSendInput) {
  const facilityId = input.facilityId.toUpperCase();
  const bundleId = `BND-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const workflow: RequestWorkflowStatus = input.saveAsDraft ? 'DRAFT' : 'REQUESTED';
  const createdIds: string[] = [];

  for (const itemKey of input.itemKeys) {
    const master = getMasterRequirement(itemKey);
    if (!master) continue;

    const title = master.name;
    const reportingFrequency = master.reportingFrequency;
    const monthlyFrequency = reportingFrequency === 'MONTHLY';

    const existing = await DataRequirementModel.findOne({
      facilityId,
      period: input.period,
      sourceChecklistItemKey: itemKey,
    });

    const description = [
      input.instructions?.trim(),
      master.description,
      master.specialInstructions ? `Note: ${master.specialInstructions}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const matchedCompliances = input.linkedCompliances?.length
      ? master.defaultCompliances.filter((c) => input.linkedCompliances!.includes(c))
      : master.defaultCompliances;
    const itemLinkedCompliances = matchedCompliances.length > 0 ? matchedCompliances : master.defaultCompliances;

    const payload = {
      facilityId,
      period: input.period,
      bundleId,
      bundleTitle: input.bundleTitle,
      sourceChecklistItemKey: itemKey,
      masterRequirementId: master.requirementId,
      title,
      category: energyCategoryForItem(itemKey),
      linkedCompliances: itemLinkedCompliances,
      description: description || master.description,
      purpose: input.purpose,
      dataCategory: MASTER_REQUIREMENT_CATEGORIES[master.category],
      reportingFrequency,
      reportingPeriodStart: input.reportingPeriodStart,
      reportingPeriodEnd: input.reportingPeriodEnd,
      monthlyFrequency,
      reportingMonths: monthlyFrequency ? input.selectedMonths : undefined,
      requiredFields: master.structuredFields,
      requiredDocumentSpecs: normalizeDocumentSpecsForDriveXlsx(master.documentSpecs || []),
      requiredDocuments: master.documentSpecs?.map((d) => d.name),
      submissionFormat: DEFAULT_SUBMISSION_FORMAT,
      submissionInstructions: input.instructions,
      priority: input.priority || 'MEDIUM',
      assignedClientContact: input.assignedClientContact,
      requestedBy: input.requestedBy,
      requestedByName: input.requestedByName,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      isApplicable: true,
      submissionStatus: input.saveAsDraft ? ('NOT_REQUESTED' as const) : ('REQUESTED' as const),
      verificationStatus: 'NOT_STARTED' as const,
      workflowStatus: workflow,
      requirementItemStatus: 'PENDING' as const,
      requestedAt: input.saveAsDraft ? undefined : new Date(),
    };

    if (existing) {
      const from = (existing.workflowStatus || 'REQUESTED') as RequestWorkflowStatus;
      if (!input.saveAsDraft) {
        assertTransition(from, workflow);
      }
      Object.assign(existing, payload);
      await existing.save();
      createdIds.push(existing._id.toString());
      continue;
    }

    const doc = await DataRequirementModel.create(payload);
    createdIds.push(doc._id.toString());
  }

  if (input.notifyClient && !input.saveAsDraft && createdIds.length > 0) {
    await Notification.create({
      recipientRole: 'CLIENT',
      senderRole: input.requestedBy ? 'CONSULTANT' : 'SYSTEM',
      senderName: input.requestedByName || 'System',
      facilityId,
      title: `New data request: ${input.bundleTitle}`,
      message: `${createdIds.length} checklist requirements were sent for ${input.period}.`,
      linkUrl: '/portal/requests',
      type: 'DATA_CHECKLIST_SHARED',
      isRead: false,
    });
  }

  return { bundleId, createdIds, count: createdIds.length };
}