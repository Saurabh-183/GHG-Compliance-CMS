'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IDataset } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import {
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { notify } from '@/lib/notify';

export default function ApprovalsPage() {
  const { currentRole } = useAuth();
  const [datasets, setDatasets] = useState<IDataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<IDataset | null>(null);
  const [actionComments, setActionComments] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadQueue = async () => {
    try {
      const res = await fetch('/api/datasets');
      if (res.ok) {
        const json = (await res.json()) as { data: IDataset[] };
        setDatasets(json.data || []);
      }
    } catch (e) {
      console.error(e);
      notify.error('Failed to load reviewer verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleApprove = async (datasetId: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/verifications/${datasetId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: actionComments || 'Independently audited and approved.' }),
      });
      if (res.ok) {
        notify.success('Dataset signed off and locked successfully!');
        setActionComments('');
        setSelectedDataset(null);
        await loadQueue();
      } else {
        notify.error('Approval failed. Please verify reviewer permissions.');
      }
    } catch (err) {
      notify.error('Network error during dataset approval');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (datasetId: string) => {
    if (!actionComments.trim()) {
      notify.warning('Please provide audit rejection notes for the consultant.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/verifications/${datasetId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: actionComments }),
      });
      if (res.ok) {
        notify.info('Dataset rejected and returned to consultant with audit notes.');
        setActionComments('');
        setSelectedDataset(null);
        await loadQueue();
      } else {
        notify.error('Rejection request failed.');
      }
    } catch (err) {
      notify.error('Network error during rejection process');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <CarbonCrunchLoader message="Loading verification approval queue..." />;
  }

  // Merged Consultant & Reviewer: Consultants and Reviewers can access the Reviewer Queue
  // Only external CLIENT users are barred from internal audit queues
  if (currentRole === 'CLIENT') {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400 shadow-xl">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-white">Access Denied: Internal Auditor Queue</h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          The Reviewer Queue is reserved exclusively for internal compliance consultants, reviewers, and platform administrators.
          Client users should view and submit evidence via the <strong className="text-white">Client Portal</strong>.
        </p>
        <div className="pt-2">
          <Link
            href="/portal"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-xs text-white font-semibold transition-colors"
          >
            <span>Return to Client Portal</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            Reviewer Queue & Verification Approvals
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Independent audit sign-off for consultant verified monthly data and compliance filings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Current Role:</span>
          <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {currentRole}
          </span>
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">
            Verifications Awaiting Reviewer Sign-off
          </h3>
          <span className="text-xs text-slate-400">
            {datasets.filter((d) => d.verificationStatus === 'AWAITING_APPROVAL').length} Pending
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Dataset Type</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Data Given</th>
                <th className="py-3 px-4 text-center">Data Matched</th>
                <th className="py-3 px-4">Consultant Submission</th>
                <th className="py-3 px-4 text-center">Version</th>
                <th className="py-3 px-4 text-center">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {datasets.map((d) => {
                const isLocked = d.reviewerApproval?.isLocked;
                const declaredCount = d.months?.filter((m) => m.declaredValue > 0).length || 0;
                const dataGivenPct = Math.round((declaredCount / 12) * 100);
                const evalCount = d.months?.filter((m) => m.evidenceValue !== null && m.declaredValue > 0).length || 0;
                const matchedCount = d.months?.filter((m) => m.result === 'MATCHED').length || 0;
                const dataMatchedPct = evalCount > 0 ? Math.round((matchedCount / evalCount) * 100) : 0;

                return (
                  <tr key={d._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {d.facilityId}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-semibold">
                      {d.datasetType.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {d.period}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <StatusBadge status={d.verificationStatus} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className="font-bold text-slate-200">{dataGivenPct}%</span>
                      <span className="text-[10px] text-slate-500 block">({declaredCount}/12 mo)</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      <span className={`font-bold ${dataMatchedPct >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {dataMatchedPct}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">({matchedCount}/{evalCount} match)</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {d.consultantSubmission ? (
                        <div>
                          <div className="text-slate-300 font-medium">{d.consultantSubmission.consultantName}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-1">{d.consultantSubmission.summary}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                      v{d.reviewerApproval?.version || 1}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/datasets/${d._id}/verify`}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          Inspect Rows
                        </Link>
                        {!isLocked && (
                          <button
                            onClick={() => setSelectedDataset(d)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                          >
                            Sign-off
                          </button>
                        )}
                        {isLocked && (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <Lock className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reviewer Sign-off Action Modal */}
      {selectedDataset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Sign-off & Lock Verification Dataset
            </h3>
            <p className="text-xs text-slate-400">
              Facility: <strong className="text-slate-200">{selectedDataset.facilityId}</strong> · {selectedDataset.datasetType} ({selectedDataset.period})
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Reviewer Audit Comments:
              </label>
              <textarea
                value={actionComments}
                onChange={(e) => setActionComments(e.target.value)}
                placeholder="e.g. Reconciliation verified against official PSPCL bills. All meters and units reconciled."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setSelectedDataset(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReject(selectedDataset._id)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject & Return</span>
                </button>
                <button
                  onClick={() => handleApprove(selectedDataset._id)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isProcessing ? 'Processing...' : 'Approve & Lock'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
