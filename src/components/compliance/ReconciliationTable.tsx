'use client';

import React, { useState } from 'react';
import { IDataset, IMonthlyRecord, IClarification } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { ClarificationEmailModal } from '@/components/common/ClarificationEmailModal';
import { DriveConnectionModal } from '@/components/common/DriveConnectionModal';
import { ExcelImportModal } from '@/components/compliance/ExcelImportModal';
import { formatNumber, calculateReconciliation } from '@/lib/utils';
import { notify } from '@/lib/notify';
import {
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Send,
  Lock,
  History,
  FileCheck2,
  Folder,
  Upload,
  RefreshCw,
  ExternalLink,
  Percent,
  CheckCheck,
  TrendingUp,
} from 'lucide-react';

interface ReconciliationTableProps {
  initialDataset: IDataset;
  initialClarifications?: IClarification[];
  isReviewer?: boolean;
  onRefresh?: () => void;
}

export const ReconciliationTable: React.FC<ReconciliationTableProps> = ({
  initialDataset,
  initialClarifications = [],
  isReviewer = false,
  onRefresh,
}) => {
  const [dataset, setDataset] = useState<IDataset>(initialDataset);
  const [tolerance, setTolerance] = useState<number>(dataset.toleranceDefault || 0);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [evidenceInput, setEvidenceInput] = useState<string>('');
  const [evidenceUrlInput, setEvidenceUrlInput] = useState<string>('');
  const [activeClarification, setActiveClarification] = useState<IClarification | null>(
    initialClarifications[0] || null
  );
  const [isClarificationModalOpen, setIsClarificationModalOpen] = useState<boolean>(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const isLocked = dataset.reviewerApproval?.isLocked;

  // Real-time calculations: Data Given Percentage & Data Matched Percentage
  const totalPeriodsInScope = 12; // 12 financial year statutory months
  const declaredMonths = dataset.months.filter((m) => m.declaredValue > 0).length;
  const dataGivenPercentage = Math.round((declaredMonths / totalPeriodsInScope) * 100);

  const evaluatedMonths = dataset.months.filter(
    (m) => m.evidenceValue !== null && m.declaredValue > 0
  );
  const matchedMonths = evaluatedMonths.filter((m) => m.result === 'MATCHED').length;
  const dataMatchedPercentage =
    evaluatedMonths.length > 0
      ? Number(((matchedMonths / evaluatedMonths.length) * 100).toFixed(1))
      : 0;

  // Handle tolerance change and live re-calculation
  const handleToleranceChange = (newTolerance: number) => {
    setTolerance(newTolerance);
    const updatedMonths = dataset.months.map((m) => {
      const recon = calculateReconciliation(m.declaredValue, m.evidenceValue, newTolerance);
      return {
        ...m,
        tolerance: newTolerance,
        variance: recon.variance,
        variancePercentage: recon.variancePercentage,
        result: recon.result,
      };
    });
    setDataset({
      ...dataset,
      toleranceDefault: newTolerance,
      months: updatedMonths,
    });
    notify.info(`Tolerance threshold adjusted to ${newTolerance} kWh`);
  };

  // Start editing a month's evidence
  const startEditMonth = (record: IMonthlyRecord) => {
    if (isLocked) {
      notify.warning('Dataset is locked by reviewer approval. Cannot edit.');
      return;
    }
    setEditingMonth(record.month);
    setEvidenceInput(record.evidenceValue !== null ? String(record.evidenceValue) : '');
    setEvidenceUrlInput(record.evidenceDocumentUrl || '');
  };

  // Save updated evidence
  const saveEvidence = async (month: string) => {
    const val = evidenceInput.trim() === '' ? null : parseFloat(evidenceInput);
    try {
      const res = await fetch(`/api/datasets/${dataset._id}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          evidenceValue: isNaN(Number(val)) ? null : val,
          evidenceDocumentUrl: evidenceUrlInput.trim() || undefined,
          tolerance,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as { data: IDataset };
        setDataset(data.data);
        setEditingMonth(null);
        notify.success(`Reconciliation updated for ${month}`);
        if (onRefresh) onRefresh();
      } else {
        notify.error('Failed to update evidence values');
      }
    } catch {
      notify.error('Network error updating evidence');
    }
  };

  // Consultant: Submit verification for reviewer approval
  const handleSubmitReview = async () => {
    setIsSubmittingReview(true);
    try {
      const res = await fetch(`/api/verifications/${dataset._id}/submit-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `Reconciliation verified with tolerance ${tolerance} kWh. Discrepancies flagged for review.`,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { data: IDataset };
        setDataset(data.data);
        notify.success('Dataset successfully submitted to Reviewer Queue!');
        if (onRefresh) onRefresh();
      } else {
        notify.error('Submission to reviewer queue failed');
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Merged Consultant & Reviewer: Approve verification and lock
  const handleApprove = async () => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/verifications/${dataset._id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comments: approvalComment || 'Reconciliation approved and locked for compliance filing.',
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { data: IDataset };
        setDataset(data.data);
        notify.success('Dataset verified, approved, and version locked!');
        if (onRefresh) onRefresh();
      } else {
        notify.error('Approval failed');
      }
    } finally {
      setIsApproving(false);
    }
  };

  // Open clarification modal
  const openClarificationForMonth = (month: string) => {
    const match = initialClarifications.find((c) => c.month === month);
    if (match) {
      setActiveClarification(match);
      setIsClarificationModalOpen(true);
    } else {
      const m = dataset.months.find((r) => r.month === month);
      if (m) {
        const variance = Math.abs(m.declaredValue - (m.evidenceValue || 0));
        const draft: IClarification = {
          _id: 'draft_' + month,
          facilityId: dataset.facilityId,
          datasetId: dataset._id,
          month,
          parameter: 'Grid Electricity Consumption',
          declaredValue: m.declaredValue,
          evidenceValue: m.evidenceValue || 0,
          variance,
          variancePercentage: Number(((variance / m.declaredValue) * 100).toFixed(3)),
          comment: `Please clarify the difference of ${formatNumber(variance)} kWh between the ${month} consumption Excel and electricity bill.`,
          supportingLink: m.evidenceDocumentUrl || 'https://drive.google.com/file/d/PSPCL_Bill.pdf/view',
          status: 'OPEN',
          emailDraft: `Subject: Action Required: Clarification on ${month} Grid Electricity\n\nDear Client Compliance Team,\n\nPlease clarify the difference of ${formatNumber(variance)} kWh identified in ${month} between your declared records and the DISCOM bill.`,
          raisedBy: 'Consultant',
          raisedAt: new Date().toISOString(),
        };
        setActiveClarification(draft);
        setIsClarificationModalOpen(true);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Google Drive Connection & Quick Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                Google Drive Vault:
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Connected & Evidence Mapped
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Direct pipeline enabled · Evidence PDFs & sheets mapped directly from Google Drive
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDriveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync from Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExcelModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs border border-slate-300 dark:border-slate-700 shadow-2xs transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Import Excel / Templates</span>
          </button>
        </div>
      </div>

      {/* Prominent PRD Metrics: Data Given Percentage & Data Matched Percentage */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Data Given Percentage */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Data Given Percentage</span>
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {dataGivenPercentage}%
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              ({declaredMonths} / {totalPeriodsInScope} months)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                dataGivenPercentage >= 90
                  ? 'bg-emerald-700'
                  : dataGivenPercentage >= 50
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(dataGivenPercentage, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Client declared energy logs logged into system
          </p>
        </div>

        {/* KPI 2: Data Matched Percentage */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Data Matched Percentage</span>
            <CheckCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {dataMatchedPercentage}%
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              ({matchedMonths} / {evaluatedMonths.length} evaluated)
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                dataMatchedPercentage >= 90
                  ? 'bg-emerald-700'
                  : dataMatchedPercentage >= 60
                  ? 'bg-amber-500'
                  : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(dataMatchedPercentage, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Reconciled within {tolerance} kWh tolerance against DISCOM bills
          </p>
        </div>

        {/* KPI 3: Evaluated Evidence Count */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Evidence Provided</span>
            <Folder className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
            {evaluatedMonths.length}{' '}
            <span className="text-xs font-normal text-slate-500">Utility Bills</span>
          </div>
          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
            100% Mapped to Google Drive
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Verified consumer ID & meter parameters
          </p>
        </div>

        {/* KPI 4: Discrepancy & Flagged Variance */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Flagged Discrepancies</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-400">
            {evaluatedMonths.length - matchedMonths}{' '}
            <span className="text-xs font-normal text-slate-500">Mismatches</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400">
            June 2025: +15,000 kWh variance
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            Email clarification draft available
          </p>
        </div>
      </div>

      {/* Reconciliation Main Header & Controls */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Grid Electricity Reconciliation Engine
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Facility: <strong className="text-slate-700 dark:text-slate-300">{dataset.facilityId}</strong> · Period: <strong className="text-slate-700 dark:text-slate-300">{dataset.period}</strong> · Verification Status:{' '}
                  <StatusBadge status={dataset.verificationStatus} size="sm" />
                </p>
              </div>
            </div>
          </div>

          {/* Tolerance Threshold Controls */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-100 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <label className="text-xs text-slate-700 dark:text-slate-300 font-medium">Tolerance:</label>
              <div className="flex items-center gap-1.5">
                {[0, 100, 500].map((tol) => (
                  <button
                    key={tol}
                    onClick={() => handleToleranceChange(tol)}
                    disabled={isLocked}
                    className={`px-2.5 py-0.5 text-xs rounded font-mono transition-colors ${
                      tolerance === tol
                        ? 'bg-emerald-700 text-white font-bold'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-300 dark:border-transparent'
                    }`}
                  >
                    {tol} kWh
                  </button>
                ))}
              </div>
            </div>

            {isLocked && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-400 text-xs">
                <Lock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>Locked (v{dataset.reviewerApproval?.version})</span>
              </div>
            )}
          </div>
        </div>

        {/* PRD Section 7.1 Reconciliation Responsive Table Wrapper */}
        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Billing Month</th>
                <th className="py-3 px-4">Declared (Client Excel)</th>
                <th className="py-3 px-4">Evidence (DISCOM Bill)</th>
                <th className="py-3 px-4 text-right">Variance</th>
                <th className="py-3 px-4 text-right">Variance %</th>
                <th className="py-3 px-4 text-center">Result</th>
                <th className="py-3 px-4">Drive Evidence Link</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70 text-xs">
              {dataset.months.map((record) => {
                const isEditing = editingMonth === record.month;
                const isDiscrepancy = record.result === 'MISMATCH';

                return (
                  <tr
                    key={record.month}
                    className={`transition-colors ${
                      isDiscrepancy
                        ? 'bg-rose-50/70 hover:bg-rose-100/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/30'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Month */}
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-slate-200">
                      {record.month}
                    </td>

                    {/* Declared */}
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200 font-mono">
                      {formatNumber(record.declaredValue)}{' '}
                      <span className="text-slate-500 text-[10px]">{record.unit}</span>
                    </td>

                    {/* Evidence Value (Editable) */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            value={evidenceInput}
                            onChange={(e) => setEvidenceInput(e.target.value)}
                            placeholder="Bill kWh"
                            className="w-28 px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 font-mono focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      ) : record.evidenceValue !== null ? (
                        <span className="font-mono text-slate-800 dark:text-slate-200">
                          {formatNumber(record.evidenceValue)}{' '}
                          <span className="text-slate-500 text-[10px]">{record.unit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">— Pending —</span>
                      )}
                    </td>

                    {/* Variance */}
                    <td
                      className={`py-3 px-4 text-right font-mono ${
                        record.variance > 0
                          ? 'text-rose-700 dark:text-rose-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {record.evidenceValue !== null ? formatNumber(record.variance) : '—'}
                    </td>

                    {/* Variance % */}
                    <td
                      className={`py-3 px-4 text-right font-mono ${
                        record.variancePercentage > 0
                          ? 'text-rose-700 dark:text-rose-400 font-semibold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {record.evidenceValue !== null ? `${record.variancePercentage.toFixed(3)}%` : '—'}
                    </td>

                    {/* Result Badge */}
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status={record.result} type="result" size="sm" />
                    </td>

                    {/* Document URL mapped with Drive */}
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <input
                          type="url"
                          value={evidenceUrlInput}
                          onChange={(e) => setEvidenceUrlInput(e.target.value)}
                          placeholder="Paste Google Drive URL"
                          className="w-48 px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                        />
                      ) : (
                        <DriveLinkBadge
                          url={record.evidenceDocumentUrl}
                          label="PSPCL Bill"
                          month={record.month}
                        />
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEvidence(record.month)}
                              className="px-2.5 py-1 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingMonth(null)}
                              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            {!isLocked && (
                              <button
                                onClick={() => startEditMonth(record)}
                                className="px-2 py-0.5 text-[11px] text-slate-600 hover:text-emerald-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-emerald-400 dark:hover:bg-slate-800 rounded transition-colors"
                              >
                                Edit Bill / Drive
                              </button>
                            )}

                            {isDiscrepancy && (
                              <button
                                onClick={() => openClarificationForMonth(record.month)}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 dark:hover:bg-rose-500/30 rounded transition-all shadow-2xs active:scale-95"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-700 dark:text-rose-400" />
                                <span>Draft Email</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PRD Section 7.3: Merged Consultant & Reviewer Approvals Action Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            Reconciliation Summary:{' '}
            <strong className="text-slate-900 dark:text-slate-200">
              {matchedMonths} of {evaluatedMonths.length} evaluated months matched
            </strong>{' '}
            ({dataMatchedPercentage}% match rate)
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Merged Consultant & Reviewer Controls */}
            {!isLocked && (
              <>
                <button
                  onClick={handleSubmitReview}
                  disabled={isSubmittingReview || dataset.verificationStatus === 'AWAITING_APPROVAL'}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {dataset.verificationStatus === 'AWAITING_APPROVAL'
                      ? 'In Reviewer Queue'
                      : isSubmittingReview
                      ? 'Submitting...'
                      : 'Submit for Review'}
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Audit / sign-off notes..."
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-200 placeholder:text-slate-400 w-52 focus:outline-none focus:border-emerald-600"
                  />
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isApproving ? 'Approving...' : 'Approve & Lock Version'}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Audit Trail & Approval Metadata */}
        {dataset.reviewerApproval && dataset.reviewerApproval.status === 'APPROVED' && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>
                <strong>Approved by {dataset.reviewerApproval.reviewerName}:</strong> &ldquo;{dataset.reviewerApproval.comments}&rdquo;
              </span>
            </div>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              Version: v{dataset.reviewerApproval.version} · {new Date(dataset.reviewerApproval.reviewedAt).toLocaleDateString('en-IN')}
            </span>
          </div>
        )}
      </div>

      {/* Audit Log / History Drawer */}
      {dataset.auditTrail && dataset.auditTrail.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-4">
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-2 mb-3">
            <History className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            Verification Audit Trail & Event Log
          </h4>
          <div className="space-y-2">
            {dataset.auditTrail.slice(-4).reverse().map((audit, i) => (
              <div
                key={i}
                className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2 bg-white dark:bg-slate-950/40 p-2.5 rounded border border-slate-200 dark:border-slate-800/60"
              >
                <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px] mt-0.5">
                  {new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-slate-300">{audit.userName}:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-300">{audit.details}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clarification Modal with copyable email draft */}
      <ClarificationEmailModal
        clarification={activeClarification}
        isOpen={isClarificationModalOpen}
        onClose={() => setIsClarificationModalOpen(false)}
        onClientRespond={async (id, text, driveUrl) => {
          await fetch(`/api/clarifications/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ responseText: text, revisedDriveLink: driveUrl }),
          });
          notify.success('Client response and revised evidence submitted successfully');
          if (onRefresh) onRefresh();
        }}
      />

      {/* Google Drive Connection & Direct Sync Modal */}
      <DriveConnectionModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        facilityId={dataset.facilityId}
        onSyncSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />

      {/* Standardized Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        facilityId={dataset.facilityId}
        onImportSuccess={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
};
