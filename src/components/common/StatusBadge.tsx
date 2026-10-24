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
          <span className={`inline-flex items-center rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 mr-1.5"></span>
            Approved
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className={`inline-flex items-center rounded-full bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mr-1.5"></span>
            Submitted
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 dark:bg-amber-400 mr-1.5"></span>
            Under Review
          </span>
        );
      case 'DATA_COLLECTION':
        return (
          <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400 mr-1.5"></span>
            Data Collection
          </span>
        );
      case 'NOT_STARTED':
      default:
        return (
          <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700 ${sizeClasses}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 mr-1.5"></span>
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
          <span className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 ${sizeClasses}`}>
            Compliant
          </span>
        );
      case 'SURPLUS':
        return (
          <span className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700/50 ${sizeClasses}`}>
            Surplus
          </span>
        );
      case 'SHORTFALL':
        return (
          <span className={`inline-flex items-center rounded-md bg-rose-50 text-rose-800 font-semibold border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60 ${sizeClasses}`}>
            Shortfall Recorded
          </span>
        );
      case 'PENDING_DETERMINATION':
        return (
          <span className={`inline-flex items-center rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 ${sizeClasses}`}>
            Pending Determination
          </span>
        );
      case 'NOT_APPLICABLE':
      default:
        return (
          <span className={`inline-flex items-center rounded-md bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/60 ${sizeClasses}`}>
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
          <span className={`inline-flex items-center rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/70 ${sizeClasses}`}>
            MATCHED
          </span>
        );
      case 'MISMATCH':
        return (
          <span className={`inline-flex items-center rounded-md bg-rose-50 text-rose-800 font-semibold border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60 ${sizeClasses}`}>
            MISMATCH
          </span>
        );
      case 'EVIDENCE_MISSING':
      default:
        return (
          <span className={`inline-flex items-center rounded-md bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 ${sizeClasses}`}>
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
          <span className={`inline-flex items-center rounded-full bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30 ${sizeClasses}`}>
            Clarification Required
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className={`inline-flex items-center rounded-full bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 ${sizeClasses}`}>
            Awaiting Approval
          </span>
        );
      case 'EVIDENCE_PENDING':
        return (
          <span className={`inline-flex items-center rounded-full bg-orange-50 text-orange-800 border border-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-500/30 ${sizeClasses}`}>
            Evidence Pending
          </span>
        );
    }
  }

  return (
    <span className={`inline-flex items-center rounded-full bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${sizeClasses}`}>
      {status}
    </span>
  );
};
