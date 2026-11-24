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
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs whitespace-nowrap shrink-0'
      : 'px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0';

  // Client submission status (data request collection)
  if (type === 'submission') {
    switch (status) {
      case 'RECEIVED':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-success ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Received
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-warning ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Partially Received
          </span>
        );
      case 'REQUESTED':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-info ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Awaiting Client
          </span>
        );
      case 'NOT_REQUESTED':
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full mr-1.5 cc-dot"></span>
            Not Requested
          </span>
        );
      default:
        return (
          <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>
            {String(status).replaceAll('_', ' ')}
          </span>
        );
    }
  }

  // Workflow Status styling (assessment lifecycle)
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
          <span className={`inline-flex items-center rounded-md lborder cc-badge-neutral ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-md mr-1.5 cc-dot"></span>
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
  if (['CLARIFICATION_REQUIRED', 'AWAITING_APPROVAL', 'EVIDENCE_PENDING', 'UNDER_REVIEW', 'APPROVED', 'ACCEPTED', 'REJECTED', 'NOT_STARTED', 'REQUESTED', 'IN_PROGRESS', 'SUBMITTED', 'RESUBMITTED', 'CHANGES_REQUESTED', 'CLOSED', 'DRAFT'].includes(status)) {
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
      case 'UNDER_REVIEW':
        return <span className={`inline-flex items-center rounded-full border cc-badge-warning ${sizeClasses}`}>Under Consultant Review</span>;
      case 'APPROVED':
      case 'ACCEPTED':
        return <span className={`inline-flex items-center rounded-full border cc-badge-success ${sizeClasses}`}>Accepted</span>;
      case 'DRAFT':
        return <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>Draft</span>;
      case 'REJECTED':
        return <span className={`inline-flex items-center rounded-full border cc-badge-error ${sizeClasses}`}>Returned for Correction</span>;
      case 'NOT_STARTED':
        return <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>Not Reviewed</span>;
      case 'REQUESTED':
        return <span className={`inline-flex items-center rounded-full border cc-badge-info ${sizeClasses}`}>Requested</span>;
      case 'IN_PROGRESS':
        return <span className={`inline-flex items-center rounded-full border cc-badge-warning ${sizeClasses}`}>In Progress</span>;
      case 'SUBMITTED':
        return <span className={`inline-flex items-center rounded-full border cc-badge-info ${sizeClasses}`}>Submitted</span>;
      case 'RESUBMITTED':
        return <span className={`inline-flex items-center rounded-full border cc-badge-info ${sizeClasses}`}>Resubmitted</span>;
      case 'CHANGES_REQUESTED':
        return <span className={`inline-flex items-center rounded-full border cc-badge-error ${sizeClasses}`}>Changes Requested</span>;
      case 'CLOSED':
        return <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>Closed</span>;
    }
  }

  return (
    <span className={`inline-flex items-center rounded-full border cc-badge-neutral ${sizeClasses}`}>
      {status}
    </span>
  );
};
