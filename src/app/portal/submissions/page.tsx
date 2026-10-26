'use client';

import React, { useEffect, useState } from 'react';
import { IClarification } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DriveLinkBadge } from '@/components/common/DriveLinkBadge';
import { ClarificationEmailModal } from '@/components/common/ClarificationEmailModal';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Folder,
  Send,
  HelpCircle,
} from 'lucide-react';
import { formatDate, formatNumber } from '@/lib/utils';
import { CarbonCrunchLoader } from '@/components/common/CarbonCrunchLoader';
import { notify } from '@/lib/notify';

export default function ClientSubmissionsPage() {
  const [clarifications, setClarifications] = useState<IClarification[]>([]);
  const [activeClarification, setActiveClarification] = useState<IClarification | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadClarifications = async () => {
    try {
      const res = await fetch('/api/clarifications');
      if (res.ok) {
        const json = (await res.json()) as { data: IClarification[] };
        setClarifications(json.data || []);
      }
    } catch (e) {
      console.error(e);
      notify.error('Failed to load clarification requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClarifications();
  }, []);

  const handleRespond = async (id: string, text: string, driveUrl: string) => {
    try {
      const res = await fetch(`/api/clarifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseText: text,
          revisedDriveLink: driveUrl,
          status: 'CLIENT_RESPONDED',
        }),
      });

      if (res.ok) {
        notify.success('Clarification response and revised evidence submitted successfully to consultants!');
        await loadClarifications();
      } else {
        notify.error('Failed to submit clarification response');
      }
    } catch (e) {
      console.error(e);
      notify.error('Network error submitting response');
    }
  };

  if (loading) {
    return <CarbonCrunchLoader message="Loading discrepancy clarifications..." />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-emerald-400" />
            Client Submissions & Discrepancy Clarifications
          </h1>
          <p className="text-xs   mt-1">
            Review discrepancies flagged during verification and provide explanation notes or revised supporting documentation.
          </p>
        </div>
      </div>

      {/* Clarifications List */}
      <div className="space-y-4">
        {clarifications.map((item) => (
          <div
            key={item._id}
            className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {item.parameter} Discrepancy — Month: {item.month}
                  </h3>
                  <p className="text-xs   mt-0.5">
                    Raised by Carbon Crunch Consultant on {formatDate(item.raisedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  {item.status.replace('_', ' ')}
                </span>
                <button
                  onClick={() => {
                    setActiveClarification(item);
                    setIsModalOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-sm"
                >
                  {item.clientResponse ? 'Update Response' : 'Respond Now'}
                </button>
              </div>
            </div>

            {/* Reconciliation Variance Details */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500">Your Declared Value:</span>
                <div className="font-mono font-bold    dark:text-white mt-0.5">
                  {formatNumber(item.declaredValue)} kWh
                </div>
              </div>
              <div>
                <span className="text-slate-500">DISCOM Bill Value:</span>
                <div className="font-mono font-bold text-amber-400 mt-0.5">
                  {formatNumber(item.evidenceValue)} kWh
                </div>
              </div>
              <div>
                <span className="text-slate-500">Flagged Variance:</span>
                <div className="font-mono font-bold text-rose-400 mt-0.5">
                  +{formatNumber(item.variance)} kWh ({item.variancePercentage}%)
                </div>
              </div>
              <div>
                <span className="text-slate-500">Auditor Evidence:</span>
                <div className="mt-1">
                  <DriveLinkBadge url={item.supportingLink} label="DISCOM Bill" />
                </div>
              </div>
            </div>

            {/* Consultant query note */}
            <div className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800">
              <strong className="text-emerald-400">Consultant Query:</strong> &ldquo;{item.comment}&rdquo;
            </div>

            {/* Existing Client Response */}
            {item.clientResponse && (
              <div className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-emerald-400">Your Response:</strong>
                  <span className="text-[11px]  ">
                    {formatDate(item.clientResponse.respondedAt)}
                  </span>
                </div>
                <p>&ldquo;{item.clientResponse.responseText}&rdquo;</p>
                {item.clientResponse.revisedDriveLink && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="  text-[11px]">Revised Document:</span>
                    <DriveLinkBadge url={item.clientResponse.revisedDriveLink} label="Revised Drive Document" />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <ClarificationEmailModal
        clarification={activeClarification}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onClientRespond={handleRespond}
        isClientView={true}
      />
    </div>
  );
}
