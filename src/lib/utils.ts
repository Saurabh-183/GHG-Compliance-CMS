import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ReconciliationResult } from '@/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-IN');
}

export function formatPercentage(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return String(value);
  return `${num.toFixed(2)}%`;
}

export function calculateReconciliation(
  declaredValue: number,
  evidenceValue: number | null,
  tolerance = 0
): {
  variance: number;
  variancePercentage: number;
  result: ReconciliationResult;
} {
  if (evidenceValue === null || evidenceValue === undefined) {
    return {
      variance: declaredValue,
      variancePercentage: 100,
      result: 'EVIDENCE_MISSING',
    };
  }

  const variance = Math.abs(declaredValue - evidenceValue);
  const variancePercentage = declaredValue > 0 ? (variance / declaredValue) * 100 : 0;

  if (variance <= tolerance) {
    return {
      variance: 0,
      variancePercentage: 0,
      result: 'MATCHED',
    };
  }

  return {
    variance,
    variancePercentage,
    result: 'MISMATCH',
  };
}

export function generateClarificationEmailDraft(params: {
  facilityName: string;
  month: string;
  parameter: string;
  declaredValue: number;
  evidenceValue: number;
  variance: number;
  unit: string;
  sourceDocUrl?: string;
}): string {
  const {
    facilityName,
    month,
    parameter,
    declaredValue,
    evidenceValue,
    variance,
    unit,
  } = params;

  return `Subject: Action Required: Clarification on ${month} ${parameter} for ${facilityName}

Dear Client Compliance Team,

During our monthly regulatory compliance verification for ${facilityName}, we identified a discrepancy in the ${month} data:

- Parameter: ${parameter}
- Client Declared Value: ${formatNumber(declaredValue)} ${unit}
- Evidence (DISCOM Bill) Value: ${formatNumber(evidenceValue)} ${unit}
- Identified Variance: ${formatNumber(variance)} ${unit} (${((variance / declaredValue) * 100).toFixed(3)}%)

Please clarify the difference of ${formatNumber(variance)} ${unit} between the ${month} ${parameter} Excel and the corresponding electricity bill. Kindly share a revised Excel or supporting justification via the Carbon Crunch Client Portal.

Best regards,
Carbon Crunch Compliance Verification Team
support@carboncrunch.com`;
}

export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
