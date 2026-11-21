'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { IAssessment } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { ClientRequirementSubmissionModal } from '@/components/portal/ClientRequirementSubmissionModal';
import { formatDate } from '@/lib/utils';
import { ShieldCheck, CheckCircle2, FileSpreadsheet, ArrowRight, RefreshCw } from 'lucide-react';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import type { IDataRequirement } from '@/types';

type ApprovedRequestRow = {
  requirementId: string;
  requestId: string;
  title: string;
  facilityId: string;
  facilityName?: string;
  clientGroupName?: string;
  period: string;
  dataCategory?: string;
  workflowStatus: string;
  reviewedByName?: string;
  reviewedAt?: string | null;
  reviewNote?: string;
  linkedCompliances: string[];
  submissionVersion?: number;
  fieldSummary: Array<{ key: string; label: string; value: string }>;
  submittedDriveLinks: Array<{
    url: string;
    sourceUrl?: string;
    vaultUrl?: string;
    description: string;
    fileName?: string;
    submittedAt?: string | null;
    submittedBy?: string;
    mappingStatus?: string;
  }>;
};

type HistoryPayload = {
  approvedRequests: ApprovedRequestRow[];
  approvedAssessments: IAssessment[];
};

export default function ClientHistoryPage() {
  const [data, setData] = useState<HistoryPayload>({ approvedRequests: [], approvedAssessments: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewReq, setViewReq] = useState<IDataRequirement | null>(null);

  const loadHistory = useCallback(async () => {
    setLoadError('');
    setLoading(true);
    try {
      const res = await fetch('/api/portal/history', { cache: 'no-store', credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load history');
      setData(json.data || { approvedRequests: [], approvedAssessments: [] });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const openApprovedRequest = async (row: ApprovedRequestRow) => {
    try {
      const res = await fetch(`/api/requirements/${row.requirementId}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const json = await res.json();
      if (res.ok && json.data) setViewReq(json.data as IDataRequirement);
    } catch {
      /* ignore */
    }
  };

  if (loading) {
    return <CarbonCrunchLoader message="Loading approved compliance records..." />;
  }

  const { approvedRequests, approvedAssessments } = data;
  const isEmpty = !approvedRequests.length && !approvedAssessments.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Approved History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Consultant-verified data requests and official compliance filings for your facilities.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadHistory()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loadError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{loadError}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="rounded-lg border bg-emerald-50 px-3 py-1.5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <strong>{approvedRequests.length}</strong> accepted data request{approvedRequests.length === 1 ? '' : 's'}
        </span>
        <span className="rounded-lg border bg-slate-50 px-3 py-1.5 dark:bg-slate-900">
          <strong>{approvedAssessments.length}</strong> approved filing{approvedAssessments.length === 1 ? '' : 's'}
        </span>
      </div>

      {isEmpty && !loadError && (
        <p className="py-16 text-center text-sm text-slate-500 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          No approved records yet. When your consultant accepts submitted data requests, they will appear here.
        </p>
      )}

      {approvedRequests.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Accepted data requests
          </h2>
          <div className="space-y-5">
            {approvedRequests.map((item) => (
              <article
                key={item.requirementId}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    {item.clientGroupName && (
                      <p className="text-[10px] font-semibold uppercase text-emerald-700">{item.clientGroupName}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-slate-100 text-emerald-800 border dark:bg-slate-800 dark:text-emerald-400">
                        {item.facilityName || item.facilityId}
                      </span>
                      <span className="text-[10px] text-slate-500">{item.dataCategory}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{item.title}</h3>
                    <p className="font-mono text-[11px] text-emerald-700">{item.requestId}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Period {item.period}
                      {item.submissionVersion ? ` · Submission v${item.submissionVersion}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={item.workflowStatus} type="verification" size="sm" />
                  </div>
                </div>

                {(item.reviewedByName || item.reviewedAt) && (
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Verified by <strong>{item.reviewedByName || 'Consultant'}</strong>
                    {item.reviewedAt ? ` on ${formatDate(item.reviewedAt)}` : ''}
                  </p>
                )}

                {item.reviewNote && (
                  <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 px-3 py-2 text-xs text-emerald-900 dark:text-emerald-200">
                    <strong>Consultant note:</strong> {item.reviewNote}
                  </div>
                )}

                {item.fieldSummary.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-2">
                      Approved field values
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {item.fieldSummary.slice(0, 8).map((f) => (
                        <div
                          key={f.key}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                        >
                          <div className="text-[10px] text-slate-500 truncate">{f.label}</div>
                          <div className="text-[11px] font-semibold text-slate-900 dark:text-white mt-0.5 break-all line-clamp-3">
                            {f.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {item.linkedCompliances.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.linkedCompliances.map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded text-[10px] font-mono border bg-slate-50 dark:bg-slate-800">
                        {c}
                      </span>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {item.submittedDriveLinks.map((link, i) => (
                      <DriveLinkBadge
                        key={`${link.url}-${i}`}
                        url={link.vaultUrl || link.sourceUrl || link.url}
                        label={link.fileName || link.description || `Evidence ${i + 1}`}
                        facilityId={item.facilityName || item.facilityId}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void openApprovedRequest(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#17365D] dark:bg-emerald-700 text-white text-[10px] font-bold"
                    >
                      View submission
                    </button>
                    <Link
                      href={`/portal/requests/${item.requirementId}`}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 hover:underline"
                    >
                      Request detail <ArrowRight className="w-3 h-3" />
                    </Link>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      On record
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {approvedAssessments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Approved compliance filings</h2>
          <div className="space-y-6">
            {approvedAssessments.map((item) => (
              <article
                key={item._id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-sm space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-emerald-800 border dark:bg-slate-800 dark:text-emerald-400">
                        {item.facilityName || item.facilityId}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {item.complianceType} — {item.period}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Approved version v{item.version}
                      {item.approvedByName ? ` · ${item.approvedByName}` : ''}
                      {item.approvedAt ? ` · ${formatDate(item.approvedAt)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={item.complianceOutcome} type="outcome" />
                    <StatusBadge status={item.workflowStatus} type="workflow" />
                  </div>
                </div>

                {item.metrics?.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {item.metrics.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800"
                      >
                        <div className="text-[11px] text-slate-500">{m.name}</div>
                        <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                          {m.value} <span className="text-[10px] text-slate-500 font-normal">{m.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                  <DriveLinkBadge url={item.documentLinks?.finalReportUrl} label="Final report" />
                  <DriveLinkBadge url={item.documentLinks?.submissionAckUrl} label="Regulatory ack" />
                  <DriveLinkBadge url={item.documentLinks?.calculationWorkbookUrl} label="Calculation model" />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <ClientRequirementSubmissionModal
        requirement={viewReq}
        onClose={() => setViewReq(null)}
        onSubmitted={loadHistory}
      />
    </div>
  );
}