'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import type { ClientUploadListItem } from '@/app/api/client-uploads/route';
import type { IDataRequirement } from '@/types';
import {
  RequirementsReviewTable,
} from '@/components/requests/RequirementsReviewTable';

function groupLatestByRequirement(items: ClientUploadListItem[]): ClientUploadListItem[] {
  const byReq = new Map<string, ClientUploadListItem>();
  for (const item of items) {
    const existing = byReq.get(item.requirementId);
    if (!existing || new Date(item.submittedAt).getTime() > new Date(existing.submittedAt).getTime()) {
      byReq.set(item.requirementId, item);
    }
  }
  return Array.from(byReq.values()).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

function uploadRowToRequirement(row: ClientUploadListItem): IDataRequirement {
  return {
    _id: row.requirementId,
    requestId: row.requestId,
    title: row.requirementTitle,
    facilityId: row.facilityId,
    facilityName: row.facilityName,
    period: row.period,
    dataCategory: row.dataCategory,
    workflowStatus: row.workflowStatus,
    verificationStatus: row.verificationStatus,
    submissionStatus: row.submissionStatus as IDataRequirement['submissionStatus'],
    submittedDriveLinks: [
      {
        url: row.url,
        submittedAt: row.submittedAt,
        submittedBy: row.submittedBy,
        description: row.description,
        sourceUrl: row.sourceUrl,
        vaultUrl: row.vaultUrl,
      },
    ],
  } as IDataRequirement;
}

export interface ClientSubmissionsReviewTableProps {
  facilityId?: string;
  /** Comma-separated facility ids (company scope from dashboard) */
  facilityIds?: string;
  clientGroupId?: string;
  period?: string;
  compact?: boolean;
  showWorkflowFilter?: boolean;
}

export const ClientSubmissionsReviewTable: React.FC<ClientSubmissionsReviewTableProps> = ({
  facilityId,
  facilityIds,
  clientGroupId,
  period,
  compact = false,
  showWorkflowFilter = true,
}) => {
  const [uploads, setUploads] = useState<ClientUploadListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLoadError('');
      const params = new URLSearchParams();
      if (facilityId) params.set('facilityId', facilityId);
      else if (facilityIds) params.set('facilityIds', facilityIds);
      if (clientGroupId) params.set('clientGroupId', clientGroupId);
      const res = await fetch(`/api/client-uploads?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      const json = (await res.json()) as { data?: ClientUploadListItem[]; error?: string };
      if (!res.ok) {
        setUploads([]);
        setLoadError(json.error || 'Could not load submissions');
        return;
      }
      let rows = json.data || [];
      if (period) {
        rows = rows.filter((r) => !r.period || r.period === period);
      }
      setUploads(rows);
    } catch {
      setLoadError('Network error while loading submissions');
      setUploads([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, facilityIds, clientGroupId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const requirements = useMemo(
  () => groupLatestByRequirement(uploads).map(uploadRowToRequirement),
    [uploads]
  );

  const displayRequirements = compact ? requirements.slice(0, 5) : requirements;

  if (loading) {
    return <CarbonCrunchLoader message={compact ? 'Loading submissions…' : 'Loading submissions for review…'} />;
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
          {loadError}
        </p>
      )}

      <RequirementsReviewTable
        requirements={displayRequirements}
        showWorkflowFilter={showWorkflowFilter && !compact}
        emptyMessage="No client submissions to review yet."
        onReviewed={load}
      />

      {compact && requirements.length > 5 && (
        <div className="text-right">
          <Link href="/data-review" className="text-xs text-emerald-700 dark:text-emerald-400 hover:underline">
            View all {requirements.length} submissions for review →
          </Link>
        </div>
      )}
    </div>
  );
};