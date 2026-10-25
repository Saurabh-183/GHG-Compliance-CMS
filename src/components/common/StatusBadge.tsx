import React from 'react';
import {
  WorkflowStatus,
  ComplianceOutcome,
  SubmissionStatus,
  VerificationStatus,
  ReconciliationResult,
} from '@/types';

interface StatusBadgeProps {
  status:
    | WorkflowStatus
    | ComplianceOutcome
    | SubmissionStatus
    | VerificationStatus
    | ReconciliationResult
    | string;
  type?: 'workflow' | 'outcome' | 'submission' | 'verification' | 'result';
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'workflow',
  size = 'md',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  // Workflow Status styling
  if (type === 'workflow' || ['NOT_STARTED', 'DATA_COLLECTION', 'UNDER_REVIEW', 'APPROVED', 'SUBMITTED'].includes(status)) {
    switch (status) {
      case 'APPROVED':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-success ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Approved
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-info ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Submitted
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-warning ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Under Review
          </span>
        );
      case 'DATA_COLLECTION':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Data Collection
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Not Started
          </span>
        );
    }
  }

  // Compliance Outcome styling
  if (type === 'outcome' || ['COMPLIANT', 'SHORTFALL', 'SURPLUS', 'PENDING_DETERMINATION', 'NOT_APPLICABLE'].includes(status)) {
    switch (status) {
      case 'COMPLIANT':
        return (
          <span className={`inline-flex items-center rounded-md font-semibold border cc-badge-success ${sizeClasses}`}>
            Compliant
          </span>
        );
      case 'SURPLUS':
        return (
          <span className={`inline-flex items-center rounded-md font-semibold border cc-badge-success ${sizeClasses}`}>
            Surplus
          </span>
        );
      case 'SHORTFALL':
        return (
          <span className={`inline-flex items-center rounded-md font-semibold border cc-badge-error ${sizeClasses}`}>
            Shortfall Recorded
          </span>
        );
      case 'PENDING_DETERMINATION':
        return (
          <span className={`inline-flex items-center rounded-md font-medium border cc-badge-warning ${sizeClasses}`}>
            Pending Determination
          </span>
        );
      case 'NOT_APPLICABLE':
      default:
        return (
          <span className={`inline-flex items-center rounded-md border cc-badge-neutral ${sizeClasses}`}>
            Not Applicable
          </span>
        );
    }
  }

  // Reconciliation Result
  if (type === 'result' || ['MATCHED', 'MISMATCH', 'EVIDENCE_MISSING'].includes(status)) {
    switch (status) {
      case 'MATCHED':
        return (
          <span className={`inline-flex items-center rounded-md font-semibold border cc-badge-success ${sizeClasses}`}>
            MATCHED
          </span>
        );
      case 'MISMATCH':
        return (
          <span className={`inline-flex items-center rounded-md font-semibold border cc-badge-error ${sizeClasses}`}>
            MISMATCH
          </span>
        );
      case 'EVIDENCE_MISSING':
      default:
        return (
          <span className={`inline-flex items-center rounded-md border cc-badge-neutral ${sizeClasses}`}>
            EVIDENCE MISSING
          </span>
        );
    }
  }

  // Verification status
  if (['CLARIFICATION_REQUIRED', 'AWAITING_APPROVAL', 'EVIDENCE_PENDING'].includes(status)) {
    switch (status) {
      case 'CLARIFICATION_REQUIRED':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-error ${sizeClasses}`}>
            Clarification Required
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-warning ${sizeClasses}`}>
            Awaiting Approval
          </span>
        );
      case 'EVIDENCE_PENDING':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-warning ${sizeClasses}`}>
            Evidence Pending
          </span>
        );
    }
  }

  return (
    <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>
      {status}
    </span>
  );
};
