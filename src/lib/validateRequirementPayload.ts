import type { IRequestDocumentSpec, IRequestField, ReportingFrequency } from '@/types';
import { ALLOWED_FIELD_TYPES, validateFields } from '@/lib/requestFieldUtils';

export type RequirementCreatePayload = {
  facilityId: string;
  period: string;
  title: string;
  description: string;
  dataCategory?: string;
  requiredFields?: IRequestField[];
  requiredDocuments?: string[];
  requiredDocumentSpecs?: IRequestDocumentSpec[];
  saveAsDraft?: boolean;
  dueDate?: string;
  reportingFrequency?: ReportingFrequency;
  reportingMonths?: string[];
  monthlyFrequency?: boolean;
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
};

export function validateRequirementCreatePayload(body: RequirementCreatePayload): string | null {
  if (!body.facilityId?.trim()) return 'Select a facility.';
  if (!body.period?.trim()) return 'Reporting financial year is required.';
  if (!body.title?.trim()) return 'Request title is required.';
  if (!body.saveAsDraft && !body.description?.trim()) return 'Instructions for the client are required.';
  if (!body.saveAsDraft && !body.dataCategory?.trim()) return 'Data category is required.';

  const fields = body.requiredFields || [];
  const docSpecs = body.requiredDocumentSpecs || [];
  const docNames = body.requiredDocuments || [];

  if (!body.saveAsDraft && fields.length === 0 && docSpecs.length === 0 && docNames.length === 0) {
    return 'Add at least one information field or document requirement.';
  }

  const fieldError = validateFields(fields);
  if (fieldError) return fieldError;

  for (const field of fields) {
    if (!ALLOWED_FIELD_TYPES.includes(field.type)) {
      return `Unsupported field type: ${field.type}`;
    }
  }

  if (body.dueDate) {
    const due = new Date(body.dueDate);
    if (Number.isNaN(due.getTime())) return 'Invalid due date.';
    if (!body.saveAsDraft) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (due < today) return 'Due date cannot be in the past for a new request being sent.';
    }
  }

  const isMonthly =
    body.reportingFrequency === 'MONTHLY' || body.monthlyFrequency === true;
  if (isMonthly) {
    const months = body.reportingMonths || [];
    if (!months.length) return 'Select at least one reporting month for monthly frequency.';
    if (months.some((m) => !/^\d{4}-(0[1-9]|1[0-2])$/.test(m))) {
      return 'Reporting months must use YYYY-MM format.';
    }
  }

  if (body.reportingPeriodStart && !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.reportingPeriodStart)) {
    return 'Invalid reporting start period.';
  }
  if (body.reportingPeriodEnd && !/^\d{4}-(0[1-9]|1[0-2])$/.test(body.reportingPeriodEnd)) {
    return 'Invalid reporting end period.';
  }
  if (
    body.reportingPeriodStart &&
    body.reportingPeriodEnd &&
    body.reportingPeriodStart > body.reportingPeriodEnd
  ) {
    return 'Reporting start cannot be after reporting end.';
  }

  return null;
}