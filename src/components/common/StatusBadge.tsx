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

  // Government Status Style Tokens:
  // Success: text #237347, bg #E7F3EB, border #237347/30
  // Warning: text #986A16, bg #FFF4D6, border #986A16/30
  // Error: text #B42318, bg #FDECEC, border #B42318/30
  // Info: text #245A91, bg #EAF1F8, border #245A91/30
  // Neutral: text #596579, bg #F1F4F7, border #D5DCE5

  // Workflow Status styling
  if (type === 'workflow' || ['NOT_STARTED', 'DATA_COLLECTION', 'UNDER_REVIEW', 'APPROVED', 'SUBMITTED'].includes(status)) {
    switch (status) {
      case 'APPROVED':
        return (
          <span
            style={{ backgroundColor: '#E7F3EB', color: '#237347', borderColor: '#23734740' }}
            className={`inline-flex items-center rounded-full border ${sizeClasses}`}
          >
            <span style={{ backgroundColor: '#237347' }} className="w-1.5 h-1.5 rounded-full mr-1.5"></span>
            Approved
          </span>
        );
      case 'SUBMITTED':
        return (
          <span
            style={{ backgroundColor: '#EAF1F8', color: '#245A91', borderColor: '#245A9140' }}
            className={`inline-flex items-center rounded-full border ${sizeClasses}`}
          >
            <span style={{ backgroundColor: '#245A91' }} className="w-1.5 h-1.5 rounded-full mr-1.5"></span>
            Submitted
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span
            style={{ backgroundColor: '#FFF4D6', color: '#986A16', borderColor: '#986A1640' }}
            className={`inline-flex items-center rounded-full border ${sizeClasses}`}
          >
            <span style={{ backgroundColor: '#986A16' }} className="w-1.5 h-1.5 rounded-full mr-1.5"></span>
            Under Review
          </span>
        );
      case 'DATA_COLLECTION':
        return (
          <span
            style={{ backgroundColor: '#F1F4F7', color: '#596579', borderColor: '#D5DCE5' }}
            className={`inline-flex items-center rounded-full border ${sizeClasses}`}
          >
            <span style={{ backgroundColor: '#596579' }} className="w-1.5 h-1.5 rounded-full mr-1.5"></span>
            Data Collection
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span
            style={{ backgroundColor: '#F1F4F7', color: '#697586', borderColor: '#D5DCE5' }}
            className={`inline-flex items-center rounded-full border ${sizeClasses}`}
          >
            <span style={{ backgroundColor: '#697586' }} className="w-1.5 h-1.5 rounded-full mr-1.5"></span>
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
          <span
            style={{ backgroundColor: '#E7F3EB', color: '#237347', borderColor: '#23734740' }}
            className={`inline-flex items-center rounded-md font-semibold border ${sizeClasses}`}
          >
            Compliant
          </span>
        );
      case 'SURPLUS':
        return (
          <span
            style={{ backgroundColor: '#E7F3EB', color: '#237347', borderColor: '#23734740' }}
            className={`inline-flex items-center rounded-md font-semibold border ${sizeClasses}`}
          >
            Surplus
          </span>
        );
      case 'SHORTFALL':
        return (
          <span
            style={{ backgroundColor: '#FDECEC', color: '#B42318', borderColor: '#B4231840' }}
            className={`inline-flex items-center rounded-md font-semibold border ${sizeClasses}`}
          >
            Shortfall Recorded
          </span>
        );
      case 'PENDING_DETERMINATION':
        return (
          <span
            style={{ backgroundColor: '#FFF4D6', color: '#986A16', borderColor: '#986A1640' }}
            className={`inline-flex items-center rounded-md font-medium border ${sizeClasses}`}
          >
            Pending Determination
          </span>
        );
      case 'NOT_APPLICABLE':
      default:
        return (
          <span
            style={{ backgroundColor: '#F1F4F7', color: '#697586', borderColor: '#D5DCE5' }}
            className={`inline-flex items-center rounded-md border ${sizeClasses}`}
          >
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
          <span
            style={{ backgroundColor: '#E7F3EB', color: '#237347', borderColor: '#23734740' }}
            className={`inline-flex items-center rounded-md font-semibold border ${sizeClasses}`}
          >
            MATCHED
          </span>
        );
      case 'MISMATCH':
        return (
          <span
            style={{ backgroundColor: '#FDECEC', color: '#B42318', borderColor: '#B4231840' }}
            className={`inline-flex items-center rounded-md font-semibold border ${sizeClasses}`}
          >
            MISMATCH
          </span>
        );
      case 'EVIDENCE_MISSING':
      default:
        return (
          <span
            style={{ backgroundColor: '#F1F4F7', color: '#596579', borderColor: '#D5DCE5' }}
            className={`inline-flex items-center rounded-md border ${sizeClasses}`}
          >
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
          <span
            style={{ backgroundColor: '#FDECEC', color: '#B42318', borderColor: '#B4231840' }}
            className={`inline-flex items-center rounded-full border ${sizeClasses}`}
          >
            Clarification Required
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span
            style={{ backgroundColor: '#FFF4D6', color: '#986A16', borderColor: '#986A1640' }}
            className={`inline-flex items-center rounded-full border ${sizeClasses}`}
          >
            Awaiting Approval
          </span>
        );
      case 'EVIDENCE_PENDING':
        return (
          <span
            style={{ backgroundColor: '#FFF4D6', color: '#986A16', borderColor: '#986A1640' }}
            className={`inline-flex items-center rounded-full border ${sizeClasses}`}
          >
            Evidence Pending
          </span>
        );
    }
  }

  return (
    <span
      style={{ backgroundColor: '#F1F4F7', color: '#596579', borderColor: '#D5DCE5' }}
      className={`inline-flex items-center rounded-full border ${sizeClasses}`}
    >
      {status}
    </span>
  );
};
