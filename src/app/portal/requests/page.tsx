'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { IDataRequirement } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import {
  FileSpreadsheet,
  Link2,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Folder,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { notify } from '@/lib/notify';

export default function ClientRequestsPage() {
  const [requirements, setRequirements] = useState<IDataRequirement[]>([]);
  const [selectedReq, setSelectedReq] = useState<IDataRequirement | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRequests = async () => {
    try {
      const res = await fetch('/api/requirements');
      if (res.ok) {
        const json = (await res.json()) as { data: IDataRequirement[] };
        setRequirements(json.data || []);
      }
    } catch (e) {
      console.error(e);
      notify.error('Failed to load compliance requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleSubmitDriveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReq || !driveUrl.trim()) {
      notify.warning('Please enter a valid Google Drive URL');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/requirements/${selectedReq._id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: driveUrl.trim(),
          description: fileDescription || 'Client submission via portal',
        }),
      });

      if (res.ok) {
        notify.success('Google Drive evidence link submitted successfully! Status updated to RECEIVED.');
        setDriveUrl('');
        setFileDescription('');
        setSelectedReq(null);
        await loadRequests();
      } else {
        notify.error('Failed to submit Google Drive link');
      }
    } catch (err) {
      notify.error('Network error submitting document link');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <CarbonCrunchLoader message="Loading compliance data requests..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
            Outstanding Compliance Data Requests
          </h1>
          <p className="text-xs   mt-1">
            Submit required energy logs, production certificates, and DISCOM invoices by pasting verified Google Drive URLs.
          </p>
        </div>
      </div>

      {/* Requests Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold   uppercase tracking-wider">
                <th className="py-3 px-4">Requirement Title</th>
                <th className="py-3 px-4">Reporting Period</th>
                <th className="py-3 px-4">Frameworks</th>
                <th className="py-3 px-4">Submission Due Date</th>
                <th className="py-3 px-4 text-center">Current Status</th>
                <th className="py-3 px-4">Submitted Documents</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-xs">
              {requirements.map((req) => (
                <tr key={req._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold    dark:text-white">{req.title}</div>
                    <div className="text-[11px]   mt-0.5 line-clamp-1">{req.description}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {req.period}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      {req.linkedCompliances.map((c) => (
                        <span key={c} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">
                    {formatDate(req.dueDate)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <StatusBadge status={req.submissionStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1">
                      {req.submittedDriveLinks.length > 0 ? (
                        req.submittedDriveLinks.map((link, i) => (
                          <DriveLinkBadge key={i} url={link.url} label={link.description || 'Drive Document'} />
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs italic">No document submitted</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedReq(req);
                        setDriveUrl('');
                        setFileDescription('');
                      }}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-sm"
                    >
                      + Submit Link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Google Drive Link Submission Modal (Acceptance Step 6) */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-1">
              Submit Google Drive Evidence
            </h3>
            <p className="text-xs   mb-4">
              Requirement: <strong className="   dark:text-white">{selectedReq.title}</strong>
            </p>

            <form onSubmit={handleSubmitDriveLink} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Google Drive Link (URL):
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/file/d/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg    dark:text-white focus:outline-none focus:border-emerald-600"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ensure link sharing permission is set to viewable by Carbon Crunch consultants.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Description / File Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Q1 Monthly Grid Consumption Excel (Apr-Jun 2025)"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-lg    dark:text-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReq(null)}
                  className="px-3 py-1.5 text-xs   hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Upload Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
