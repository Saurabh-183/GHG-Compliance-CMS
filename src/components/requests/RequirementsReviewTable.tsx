'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Select, MenuItem, FormControl } from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { StatusBadge } from '@/components/common/StatusBadge';
import { RequestReviewPanel } from '@/components/requests/RequestReviewPanel';
import type { IDataRequirement } from '@/types';
import { formatDate } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { resolveDataCategoryLabel } from '@/lib/dataRequestDisplay';
import { resolveClientUploadWorkflowDisplay } from '@/lib/clientUploadStatus';
import { Filter, X, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const ITEMS_PER_PAGE = 15;

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
  compact?: boolean;
  onReviewed?: () => void | Promise<void>;
}

export const RequirementsReviewTable: React.FC<RequirementsReviewTableProps> = ({
  requirements,
  showWorkflowFilter = false,
  hideFacilityColumn = false,
  emptyMessage = 'No requests to review yet.',
  compact = false,
  onReviewed,
}) => {
  const { theme, currentRole, currentUser } = useAuth();
  const isAdmin = currentRole === 'ADMIN' || currentUser?.role === 'ADMIN';
  const isDark = theme === 'dark';
  const [workflowFilter, setWorkflowFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [reviewRequirement, setReviewRequirement] = useState<IDataRequirement | null>(null);
  const [loadingRequirementId, setLoadingRequirementId] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    let result = sorted;
    if (workflowFilter !== 'ALL') {
      result = result.filter((req) => (req.workflowStatus || '') === workflowFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((req) => {
        const reqId = (req.requestId || String(req._id)).toLowerCase();
        const title = (req.title || '').toLowerCase();
        const category = (resolveDataCategoryLabel(req) || '').toLowerCase();
        const submittedAt = resolveRequirementSubmittedAt(req);
        const submittedStr = submittedAt ? formatDate(submittedAt).toLowerCase() : '';
        const rawSubmitted = submittedAt ? submittedAt.toLowerCase() : '';

        return (
          reqId.includes(q) ||
          title.includes(q) ||
          category.includes(q) ||
          submittedStr.includes(q) ||
          rawSubmitted.includes(q)
        );
      });
    }
    return result;
  }, [sorted, workflowFilter, searchQuery]);

  // Debounce search query updates by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset to first page when search query or workflow filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, workflowFilter]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

  const paginatedRequirements = useMemo(() => {
    if (compact) return filtered;
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [compact, filtered, currentPage]);

  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endIndex = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setSearchQuery(searchInput.trim());
    }
  };

  const openReview = async (req: IDataRequirement) => {
    setLoadingRequirementId(req._id);
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
      setLoadingRequirementId(null);
    }
  };

  const colSpan = hideFacilityColumn ? 6 : 7;

  return (
    <div className="space-y-4">
      {/* Top Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Debounced Search Input */}
          {!compact && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search Request ID, title, category, date..."
                className="h-[32px] pl-8 pr-7 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64 sm:w-80"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Counter Info */}
        {!compact && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{filtered.length}</span> of{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{requirements.length}</span> requests
          </div>
        )}
      </div>

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
            {paginatedRequirements.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="p-6 text-center text-slate-500">
                  {searchQuery ? `No requests match "${searchQuery}".` : emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedRequirements.map((req) => {
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
                      {(() => {
                        const isThisRowLoading = loadingRequirementId === req._id;
                        return (
                          <button
                            type="button"
                            disabled={Boolean(loadingRequirementId)}
                            onClick={() => void openReview(req)}
                            className={`inline-flex items-center justify-center min-w-[64px] px-3 py-1.5 rounded-lg bg-[#17365D] dark:bg-[#A56F63] text-white font-bold text-[11px] transition-all hover:opacity-90 ${
                              isThisRowLoading ? 'opacity-75 cursor-wait' : 'cursor-pointer'
                            }`}
                          >
                            {isThisRowLoading ? (
                              <span className="inline-flex items-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>...</span>
                              </span>
                            ) : (
                              isAdmin ? 'View' : 'Review'
                            )}
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!compact && totalItems > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Showing <strong className="text-slate-700 dark:text-slate-200">{startIndex}</strong> to{' '}
            <strong className="text-slate-700 dark:text-slate-200">{endIndex}</strong> of{' '}
            <strong className="text-slate-700 dark:text-slate-200">{totalItems}</strong> requests
            {searchQuery && (
              <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">
                (filtered)
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    return p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer ${
                            currentPage === p
                              ? 'bg-emerald-700 text-white !text-white font-bold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

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