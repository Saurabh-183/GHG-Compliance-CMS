'use client';

import React, { useState } from 'react';
import { Copy, Check, Mail, X, Send, AlertTriangle } from 'lucide-react';
import { IClarification } from '@/types';
import { formatNumber } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { DriveLinkBadge } from './DriveLinkBadge';

interface ClarificationEmailModalProps {
  clarification: IClarification | null;
  isOpen: boolean;
  onClose: () => void;
  onClientRespond?: (clarificationId: string, text: string, driveUrl: string) => Promise<void>;
  isClientView?: boolean;
}

export const ClarificationEmailModal: React.FC<ClarificationEmailModalProps> = ({
  clarification,
  isOpen,
  onClose,
  onClientRespond,
  isClientView = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [revisedDriveLink, setRevisedDriveLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !clarification) return null;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(clarification.emailDraft);
    setCopied(true);
    notify.success('Clarification email draft copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onClientRespond) return;
    setIsSubmitting(true);
    try {
      await onClientRespond(clarification._id, responseText, revisedDriveLink);
      setResponseText('');
      setRevisedDriveLink('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">
                Discrepancy Clarification — {clarification.month}
              </h3>
              <p className="text-xs  ">
                {clarification.parameter} · Variance: {formatNumber(clarification.variance)} kWh ({clarification.variancePercentage}%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1   hover:   dark:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Numbers comparison highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div>
              <div className="text-[11px] font-medium   uppercase tracking-wider">Client Declared</div>
              <div className="text-base font-semibold    dark:text-white mt-0.5">
                {formatNumber(clarification.declaredValue)} kWh
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium   uppercase tracking-wider">DISCOM Bill Evidence</div>
              <div className="text-base font-semibold text-amber-300 mt-0.5">
                {formatNumber(clarification.evidenceValue)} kWh
              </div>
            </div>
            <div>
              <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">Variance Flagged</div>
              <div className="text-base font-bold text-rose-400 mt-0.5">
                +{formatNumber(clarification.variance)} kWh
              </div>
            </div>
          </div>

          {/* Evidence Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-slate-800/40 px-3 py-2 rounded-md border border-slate-800">
            <span className=" ">Supporting DISCOM Evidence:</span>
            <DriveLinkBadge url={clarification.supportingLink} label="PSPCL June 2025 Bill" />
          </div>

          {/* PRD Section 7.2: Draft Email */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                Draft Client Communication Email
              </label>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Draft Email</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 text-xs text-slate-300 bg-slate-950/80 border border-slate-800 rounded-lg whitespace-pre-wrap font-mono leading-relaxed select-all overflow-x-auto">
              {clarification.emailDraft}
            </pre>
          </div>

          {/* Existing Client Response if any */}
          {clarification.clientResponse && (
            <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-emerald-400">Client Response Received</span>
                <span className="text-[11px]  ">
                  {clarification.clientResponse.respondedBy || 'Vikram Singh'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-2">
                &ldquo;{clarification.clientResponse.responseText}&rdquo;
              </p>
              {clarification.clientResponse.revisedDriveLink && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[11px]  ">Revised Evidence:</span>
                  <DriveLinkBadge url={clarification.clientResponse.revisedDriveLink} label="Revised Drive Document" />
                </div>
              )}
            </div>
          )}

          {/* Client response input form */}
          {(!clarification.clientResponse || isClientView) && onClientRespond && (
            <form onSubmit={handleSubmitResponse} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/60 space-y-3">
              <h4 className="text-xs font-semibold    dark:text-white">
                Submit Client Response & Revised Evidence
              </h4>
              <div>
                <label className="block text-[11px]   mb-1">
                  Explanation / Remarks:
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  rows={2}
                  required
                  placeholder="e.g. Revised calculation attached. 15,000 kWh was billed under auxiliary backup meter 02."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-md    dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-[11px]   mb-1">
                  Revised Google Drive Document URL:
                </label>
                <input
                  type="url"
                  value={revisedDriveLink}
                  onChange={(e) => setRevisedDriveLink(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-md    dark:text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs   hover:   dark:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Submitting...' : 'Submit Response to Consultant'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
