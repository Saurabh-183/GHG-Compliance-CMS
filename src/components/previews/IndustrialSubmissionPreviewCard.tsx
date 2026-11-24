'use client';

import React from 'react';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { SpreadsheetPreviewRow } from '@/lib/genericSpreadsheetPreview';

interface IndustrialSubmissionPreviewCardProps {
  requirementTitle: string;
  dataCategory?: string;
  facilityName?: string;
  facilityId: string;
  clientGroupName?: string;
  period: string;
  requestId?: string;
  submittedBy: string;
  mappingStatus?: string;
  workflowStatus?: string;
  structuredRows: Array<{ key: string; label: string; value: string }>;
  fieldReviews?: Array<{ fieldKey: string; status: string; comment?: string }>;
  spreadsheetHeaders: string[];
  spreadsheetRows: SpreadsheetPreviewRow[];
  parseError?: string;
  loading?: boolean;
}

export const IndustrialSubmissionPreviewCard: React.FC<IndustrialSubmissionPreviewCardProps> = ({
  requirementTitle,
  dataCategory,
  facilityName,
  facilityId,
  clientGroupName,
  period,
  requestId,
  submittedBy,
  mappingStatus,
  workflowStatus,
  structuredRows,
  fieldReviews,
  spreadsheetHeaders,
  spreadsheetRows,
  parseError,
  loading,
}) => {
  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 animate-pulse">
        Loading submission details…
      </div>
    );
  }

  const reviewByKey = new Map((fieldReviews || []).map((r) => [r.fieldKey, r]));

  return (
    <div className="space-y-4 text-xs">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {clientGroupName && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                {clientGroupName}
              </p>
            )}
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">{requirementTitle}</h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              {dataCategory || 'Industrial data submission'} · Period {period}
            </p>
            <p className="font-mono text-[10px] text-emerald-700 mt-1">{requestId || '—'}</p>
            <p className="text-[10px] text-slate-500 mt-1">
              Facility: {facilityName || facilityId} · Submitted by {submittedBy}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border-slate-300">
              Map: {mappingStatus || 'PENDING'}
            </span>
            <StatusBadge status={workflowStatus || 'UNDER_REVIEW'} type="verification" size="sm" />
          </div>
        </div>
      </div>

      {parseError && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 dark:bg-amber-950/30 dark:border-amber-800/40 dark:text-amber-200">
          {parseError}
        </p>
      )}

      {structuredRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Submitted field values
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800">
            {structuredRows.map((row) => {
              const review = reviewByKey.get(row.key);
              return (
                <div key={row.key} className="bg-white dark:bg-slate-950 p-3">
                  <span className="text-[10px] text-slate-500 block">{row.label}</span>
                  <span className="text-[11px] font-semibold text-slate-900 dark:text-white break-all">
                    {row.value}
                  </span>
                  {review && (
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      Review: {review.status}
                      {review.comment ? ` — ${review.comment}` : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {spreadsheetRows.length > 0 && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Spreadsheet preview ({spreadsheetRows.length} row{spreadsheetRows.length === 1 ? '' : 's'})
          </div>
          <table className="w-full text-left text-[11px] border-collapse min-w-[480px]">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 text-[10px] uppercase text-slate-500">
                {spreadsheetHeaders.slice(0, 8).map((h) => (
                  <th key={h} className="py-2 px-2 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {spreadsheetRows.map((row) => (
                <tr key={row.rowIndex} className="border-t border-slate-100 dark:border-slate-800">
                  {spreadsheetHeaders.slice(0, 8).map((h) => (
                    <td key={h} className="py-1.5 px-2 text-slate-800 dark:text-slate-200 max-w-[140px] truncate">
                      {row.cells[h] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!structuredRows.length && !spreadsheetRows.length && !parseError && (
        <p className="text-[11px] text-slate-500 text-center py-4">
          Open the embedded file above to review cell data. If cells are empty, ensure the Drive link
          is shared with your compliance service account or set to viewable with link.
        </p>
      )}
    </div>
  );
};