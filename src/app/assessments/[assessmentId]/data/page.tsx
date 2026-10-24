'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IAssessment, IDataRequirement } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  Building2,
  ChevronRight,
  ArrowRight,
  Layers,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AssessmentDataPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;
  const [assessment, setAssessment] = useState<IAssessment | null>(null);
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [assRes, reqRes] = await Promise.all([
          fetch(`/api/assessments/${assessmentId}`),
          fetch(`/api/assessments/${assessmentId}/requirements`),
        ]);

        if (assRes.ok) {
          const assJson = (await assRes.json()) as { data: IAssessment };
          setAssessment(assJson.data);
        }
        if (reqRes.ok) {
          const reqJson = (await reqRes.json()) as { data: IDataRequirement[] };
          setRequirements(reqJson.data);
        }
      } catch (e) {
        console.error('Error fetching data checklist:', e);
      } finally {
        setLoading(false);
      }
    }
    if (assessmentId) loadData();
  }, [assessmentId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 text-xs">
        Loading Data Collection Checklist...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/facilities/TRIDENT_PAPER" className="hover:text-emerald-400">Trident Paper</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <Link href={`/assessments/${assessmentId}`} className="hover:text-emerald-400">Assessment</Link>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-slate-200 font-semibold">Data Collection Checklist</span>
      </div>

      {/* Header */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white">
                Current-Year Data Collection Checklist (FY 2025-26)
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Replaces Excel tracker: Common energy data & compliance-specific requirements linked to Trident Paper.
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/datasets/6adb9175b32c50edab95461f/verify"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all shrink-0"
        >
          <span>Open Reconciliation Engine</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Checklist Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Active Data Requirements & Verification States
          </h3>
          <span className="text-xs text-slate-400">
            Separate state machines: Submission Status vs Verification Status
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Requirement</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Linked Compliances</th>
                <th className="py-3 px-4 text-center">Submission Status</th>
                <th className="py-3 px-4 text-center">Verification Status</th>
                <th className="py-3 px-4">Submitted Drive Evidence</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {requirements.map((req) => (
                <tr key={req._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-200">{req.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{req.description}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300">
                      {req.category === 'COMMON_ENERGY' ? 'Common Energy' : 'Specific Mandate'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      {req.linkedCompliances.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-emerald-400">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={req.submissionStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={req.verificationStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      {req.submittedDriveLinks.length > 0 ? (
                        req.submittedDriveLinks.map((link, i) => (
                          <DriveLinkBadge key={i} url={link.url} label={link.description || 'Drive Document'} />
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs italic">Awaiting submission</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {req.datasetId && (
                      <Link
                        href="/datasets/6adb9175b32c50edab95461f/verify"
                        className="px-2.5 py-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded transition-colors"
                      >
                        Reconcile Data
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
