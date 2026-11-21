'use client';

import React, { useMemo, useState } from 'react';
import { Select, MenuItem, FormControl } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RequestReviewPanel } from '@/components/requests/RequestReviewPanel';
import type { IDataRequirement } from '@/types';
import { formatDate } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { resolveDataCategoryLabel } from '@/lib/dataRequestDisplay';
import { resolveClientUploadWorkflowDisplay } from '@/lib/clientUploadStatus';
import { Filter, X } from 'lucide-react';

export const WORKFLOW_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: 'All review states' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'RESUBMITTED', label: 'Resubmitted' },
  { value: 'UNDER_REVIEW', label: 'Under review' },
  { value: 'CHANGES_REQUESTED', label: 'Changes requested' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'IN_PROGRESS', label: 'In progress' },
];

export function resolveRequirementSubmittedAt(req: IDataRequirement): string | null {
  const lastHist = req.submissionHistory?.[req.submissionHistory.length - 1]?.submittedAt;
  if (lastHist) return typeof lastHist === 'string' ? lastHist : new Date(lastHist).toISOString();

  const links = req.submittedDriveLinks || [];
  if (!links.length) return null;
  let latest = links[0];
  for (const link of links) {
    if (!link.submittedAt) continue;
    const t = new Date(link.submittedAt).getTime();
    if (!latest?.submittedAt || t > new Date(latest.submittedAt).getTime()) latest = link;
  }
  return latest?.submittedAt
    ? typeof latest.submittedAt === 'string'
      ? latest.submittedAt
      : new Date(latest.submittedAt).toISOString()
    : null;
}

function resolveWorkflowDisplay(req: IDataRequirement): string {
  return (
    resolveClientUploadWorkflowDisplay({
      workflowStatus: req.workflowStatus,
      verificationStatus: req.verificationStatus,
      submissionStatus: req.submissionStatus,
    }) || req.workflowStatus || req.verificationStatus || 'REQUESTED'
  );
}

export interface RequirementsReviewTableProps {
  requirements: IDataRequirement[];
  showWorkflowFilter?: boolean;
  hideFacilityColumn?: boolean;
  emptyMessage?: string;
  onReviewed?: () => void | Promise<void>;
}

export const RequirementsReviewTable: React.FC<RequirementsReviewTableProps> = ({
  requirements,
  showWorkflowFilter = false,
  hideFacilityColumn = false,
  emptyMessage = 'No requests to review yet.',
  onReviewed,
}) => {
  const { theme } = useAuth();
  const isDark = theme === 'dark';
  const [workflowFilter, setWorkflowFilter] = useState('ALL');
  const [reviewRequirement, setReviewRequirement] = useState<IDataRequirement | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  const sorted = useMemo(
    () =>
      [...requirements].sort((a, b) => {
        const at = resolveRequirementSubmittedAt(a);
        const bt = resolveRequirementSubmittedAt(b);
        if (at && bt) return new Date(bt).getTime() - new Date(at).getTime();
        if (bt) return 1;
        if (at) return -1;
        return (a.title || '').localeCompare(b.title || '');
      }),
    [requirements]
  );

  const visible = useMemo(() => {
    if (workflowFilter === 'ALL') return sorted;
    return sorted.filter((req) => (req.workflowStatus || '') === workflowFilter);
  }, [sorted, workflowFilter]);

  const openReview = async (req: IDataRequirement) => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/requirements/${encodeURIComponent(req._id)}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load request');
      setReviewRequirement(json.data as IDataRequirement);
    } catch (err) {
      notify.error(err instanceof Error ? err.message : 'Unable to open review');
      setReviewRequirement(req);
    } finally {
      setReviewLoading(false);
    }
  };

  const colSpan = hideFacilityColumn ? 6 : 7;

  return (
    <div className="space-y-4">
      {showWorkflowFilter && (
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <FormControl size="small" sx={{ minWidth: 168 }}>
            <Select
              value={workflowFilter}
              onChange={(e) => setWorkflowFilter(e.target.value)}
              sx={{
                height: 32,
                fontSize: '11px',
                borderRadius: '8px',
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                color: isDark ? '#FFFFFF' : '#1E293B',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : '#CBD5E1',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#34D399' : '#059669',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: isDark ? '#34D399' : '#059669',
                  borderWidth: '1.5px',
                },
                '& .MuiSelect-select': { py: '4px', px: '10px' },
              }}
              MenuProps={{
                slotProps: {
                  paper: {
                    sx: {
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      color: isDark ? '#FFFFFF' : '#1E293B',
                      borderRadius: '8px',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.15)' : '#E2E8F0'}`,
                      '& .MuiList-root': { py: '4px' },
                    },
                  },
                },
              }}
            >
              {WORKFLOW_FILTER_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value} sx={{ fontSize: '11px' }}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[10px] uppercase text-slate-500">
              <th className="p-3">Request ID</th>
              <th className="p-3">Title</th>
              {!hideFacilityColumn && <th className="p-3">Facility</th>}
              <th className="p-3">Category</th>
              <th className="p-3">Submitted</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="p-6 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              visible.map((req) => {
                const submittedAt = resolveRequirementSubmittedAt(req);
                const workflowDisplay = resolveWorkflowDisplay(req);
                const category = resolveDataCategoryLabel(req);
                return (
                  <tr key={req._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono text-emerald-700">{req.requestId || String(req._id).slice(-8)}</td>
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">{req.title}</td>
                    {!hideFacilityColumn && (
                      <td className="p-3 font-mono">{req.facilityId}</td>
                    )}
                    <td className="p-3">{category || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{submittedAt ? formatDate(submittedAt) : '—'}</td>
                    <td className="p-3">
                      <StatusBadge status={workflowDisplay} type="verification" size="sm" />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        disabled={reviewLoading}
                        onClick={() => void openReview(req)}
                        className="px-3 py-1.5 rounded-lg bg-[#17365D] dark:bg-[#A56F63] text-white font-bold text-[11px] hover:opacity-90 disabled:opacity-50"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {reviewRequirement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-bold">{reviewRequirement.title}</h2>
                <p className="text-[11px] font-mono text-emerald-700">{reviewRequirement.requestId}</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  {reviewRequirement.facilityName || reviewRequirement.facilityId} · {reviewRequirement.period}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewRequirement(null)}
                className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <RequestReviewPanel
              requirement={reviewRequirement}
              onReviewed={async () => {
                setReviewRequirement(null);
                await onReviewed?.();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};