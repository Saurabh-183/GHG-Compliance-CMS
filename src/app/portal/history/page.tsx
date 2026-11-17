'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IAssessment } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  ShieldCheck,
  Building2,
  Calendar,
  Folder,
  FileText,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';

export default function ClientHistoryPage() {
  const [assessments, setAssessments] = useState<IAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/assessments');
        if (res.ok) {
          const json = (await res.json()) as { data: IAssessment[] };
          // Client only sees approved assessments
          setAssessments((json.data || []).filter((a) => a.workflowStatus === 'APPROVED'));
        }
      } catch (e) {
        console.error('Error fetching history:', e);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  if (loading) {
    return <CarbonCrunchLoader message="Loading approved compliance records..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Approved Historical Compliance Records & Reports
          </h1>
          <p className="text-xs   mt-1">
            Access final regulatory compliance filings, auditor signed assessment reports, and official authority submission acknowledgements.
          </p>
        </div>
      </div>

      {/* Historical Cards Grid */}
      <div className="space-y-6">
        {assessments.map((item) => (
          <div
            key={item._id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-800 text-emerald-400 border border-slate-700">
                    {item.facilityId}
                  </span>
                  <h3 className="text-lg font-bold text-white">
                    {item.complianceType} Compliance — {item.period}
                  </h3>
                </div>
                <p className="text-xs  ">
                  Approved & Verified Version v{item.version}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={item.complianceOutcome} type="outcome" />
                <StatusBadge status={item.workflowStatus} type="workflow" />
              </div>
            </div>

            {/* Approved Metrics Grid */}
            <div>
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Approved Summary Parameters
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {item.metrics.map((m, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <div className="text-[11px]  ">{m.name}</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                      {m.value} <span className="text-[10px] text-slate-500 font-normal">{m.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final Report & Submission Acknowledgement Links */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <DriveLinkBadge url={item.documentLinks?.finalReportUrl} label="Final Assessment Report" />
                <DriveLinkBadge url={item.documentLinks?.submissionAckUrl} label="Regulatory Submission Ack" />
                <DriveLinkBadge url={item.documentLinks?.calculationWorkbookUrl} label="Calculation Model" />
              </div>

              <div className="text-xs   flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Audited & verified on Google Drive</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
