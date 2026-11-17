'use client';

import React from 'react';
import {
  FileText,
  ExternalLink,
  X,
  ShieldCheck,
  Building2,
  Calendar,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';

interface EvidenceDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  label?: string;
  documentType?: string;
  month?: string;
}

export const EvidenceDocumentModal: React.FC<EvidenceDocumentModalProps> = ({
  isOpen,
  onClose,
  url = '',
  label = 'Evidence Document',
  documentType = 'PSPCL DISCOM Electricity Bill',
  month = '2025-05',
}) => {
  if (!isOpen) return null;

  const isJune = url.includes('Jun') || month.includes('06') || label.includes('June') || label.includes('Jun');
  const isMay = url.includes('May') || month.includes('05') || label.includes('May');
  const isExcel = url.includes('.xlsx') || label.includes('Excel') || label.includes('Consumption Log');

  const billedUnits = isJune ? 1265000 : isMay ? 1310000 : 1350000;
  const declaredUnits = isJune ? 1280000 : isMay ? 1310000 : 1350000;
  const isMismatch = isJune;

  const billNo = isJune ? 'PSPCL/BNL/2025/06/9821' : isMay ? 'PSPCL/BNL/2025/05/8743' : 'PSPCL/BNL/2025/07/1102';
  const billingPeriod = isJune
    ? '01-Jun-2025 to 30-Jun-2025'
    : isMay
    ? '01-May-2025 to 31-May-2025'
    : '01-Jul-2025 to 31-Jul-2025';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>{label || 'Evidence Document Snapshot'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                  Google Drive Evidence
                </span>
              </h3>
              <p className="text-[11px]  ">
                Official Supporting Audit Record · Facility: TRIDENT_PAPER
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg   hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Document Preview */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Simulated Official Bill / Sheet Document */}
          <div className="p-6 rounded-xl border border-slate-700/80 bg-slate-950 shadow-inner space-y-5">
            {/* Top Official Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                  Punjab State Power Corporation Limited (PSPCL)
                </span>
                <h4 className="text-base font-extrabold text-white mt-0.5">
                  High Tension (HT) Industrial Electricity Bill
                </h4>
                <p className="text-[11px]  ">
                  Sub-Division: Barnala Industrial Area · Circle: Sangrur
                </p>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-500">Bill Invoice Number</div>
                <div className="font-mono font-bold    dark:text-white">{billNo}</div>
                <div className="text-[10px]   mt-0.5">Billing Cycle: {billingPeriod}</div>
              </div>
            </div>

            {/* Consumer & Meter Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-500 block">Consumer Account:</span>
                <span className="font-mono font-bold    dark:text-white">PSPCL-BARNALA-66KV-0042</span>
              </div>
              <div>
                <span className="text-slate-500 block">Consumer Name:</span>
                <span className="font-semibold    dark:text-white">Trident Paper Limited</span>
              </div>
              <div>
                <span className="text-slate-500 block">Meter Number:</span>
                <span className="font-mono font-bold    dark:text-white">L&T-EM-99214</span>
              </div>
              <div>
                <span className="text-slate-500 block">Contract Demand:</span>
                <span className="font-mono font-bold text-emerald-400">12,000 kVA (66 kV)</span>
              </div>
            </div>

            {/* Energy Metering Table */}
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase tracking-wider   font-semibold">
                    <th className="py-2 px-3">Parameter Description</th>
                    <th className="py-2 px-3 text-right">Units</th>
                    <th className="py-2 px-3 text-right">Recorded Value</th>
                    <th className="py-2 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      Total Active Energy Consumption (Net Import)
                    </td>
                    <td className="py-2.5 px-3 text-right  ">kWh</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      {formatNumber(billedUnits)}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Meter Audited
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      Maximum Demand Recorded (MDI)
                    </td>
                    <td className="py-2.5 px-3 text-right  ">kVA</td>
                    <td className="py-2.5 px-3 text-right font-bold    dark:text-white">9,840</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        Within Limit
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-sans text-slate-300">Average Monthly Power Factor</td>
                    <td className="py-2.5 px-3 text-right  ">PF</td>
                    <td className="py-2.5 px-3 text-right font-bold    dark:text-white">0.995 Lag</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300">
                        Incentive Eligible
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Discrepancy Banner if June */}
            {isMismatch ? (
              <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">
                    Reconciliation Variance Detected (+15,000 kWh / 1.186%)
                  </div>
                  <p className="text-[11px] text-rose-200 leading-relaxed">
                    Client declared monthly Excel states <strong className="text-white">1,280,000 kWh</strong>,
                    whereas this official PSPCL DISCOM invoice records <strong className="text-white">1,265,000 kWh</strong>.
                    Clarification query has been logged and sent to client.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-[11px] font-medium">
                  Reconciliation Match Confirmed: Declared energy ({formatNumber(declaredUnits)} kWh) matches PSPCL bill exactly.
                </span>
              </div>
            )}
          </div>

          {/* Google Drive Link Metadata & Info */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="  font-semibold block text-[11px] uppercase tracking-wider">
              Google Drive Evidence Reference
            </span>
            <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="truncate">{url || process.env.NEXT_PUBLIC_GDRIVE_FOLDER_URL || GOOGLE_DRIVE_FOLDER_URL }</span>
              <a
                href={url || process.env.NEXT_PUBLIC_GDRIVE_FOLDER_URL || GOOGLE_DRIVE_FOLDER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700    dark:text-white hover:text-white inline-flex items-center gap-1 font-sans text-xs transition-colors"
              >
                <span>Open in Drive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[10px] text-slate-500">
              Note: In production environments, client users configure live Google Drive sharing permissions. For demonstration purposes, Carbon Crunch renders verified digital audit evidence previews.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 text-[11px]  ">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Audited & verified by Carbon Crunch Consultant</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700    dark:text-white transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
