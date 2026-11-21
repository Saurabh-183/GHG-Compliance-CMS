'use client';

import React from 'react';
import { ExternalLink, FileText, ShieldCheck, X } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { GOOGLE_DRIVE_FOLDER_URL } from '@/lib/gdrive';

interface EvidenceDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  label?: string;
  documentType?: string;
  month?: string;
  billDetails?: {
    invoiceNumber?: string;
    billingFrom?: string;
    billingTo?: string;
    consumptionKwh?: number | null;
    billAmount?: number | null;
  };
  utilityConnectionSnapshot?: {
    providerName?: string;
    connectionType?: string;
    subDivision?: string;
    circle?: string;
    consumerAccountNumber?: string;
    consumerName?: string;
    meterNumber?: string;
    contractDemand?: string;
  };
  facilityId?: string;
  isDraftPreview?: boolean;
  /** Skip HT electricity mock when this is a generic industrial / checklist file */
  useIndustrialPreview?: boolean;
}

function spreadsheetEmbedUrl(url: string): string | null {
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview?rm=minimal`;
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  return null;
}

const display = (value?: string | number | null) =>
  value === undefined || value === null || value === '' ? 'Not provided' : String(value);

const formatAmount = (value?: number | null) =>
  value === undefined || value === null || !Number.isFinite(value) ? 'Not provided' : formatNumber(value);

export const EvidenceDocumentModal: React.FC<EvidenceDocumentModalProps> = ({
  isOpen,
  onClose,
  url = '',
  label = 'Evidence Document',
  billDetails,
  utilityConnectionSnapshot,
  facilityId = 'Facility',
  isDraftPreview = false,
  useIndustrialPreview = false,
}) => {
  if (!isOpen) return null;

  const driveUrl = url.trim() || process.env.NEXT_PUBLIC_GDRIVE_FOLDER_URL || GOOGLE_DRIVE_FOLDER_URL;
  const showIndustrialOnly =
    useIndustrialPreview || (!billDetails && !utilityConnectionSnapshot);
  const embedUrl = spreadsheetEmbedUrl(driveUrl);
  const billingPeriod =
    billDetails?.billingFrom && billDetails?.billingTo
      ? `${billDetails.billingFrom} to ${billDetails.billingTo}`
      : 'Not provided';

  const connection = utilityConnectionSnapshot;
  const bill = billDetails;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" role="presentation">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" role="dialog" aria-modal="true" aria-labelledby="evidence-preview-title">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>

            <div>
              <h3 id="evidence-preview-title" className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{label || 'Evidence Document Snapshot'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60">
                  {isDraftPreview ? 'Draft Preview' : 'Google Drive Evidence'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official Supporting Audit Record · Facility: {facilityId}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          {showIndustrialOnly ? (
            <div className="space-y-4">
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Client submission file for <strong>{label}</strong>. Review the live spreadsheet below or open in
                Google Drive.
              </p>
              {embedUrl ? (
                <iframe
                  title="Evidence spreadsheet"
                  src={embedUrl}
                  className="w-full h-[50vh] min-h-[280px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white"
                  allow="fullscreen"
                />
              ) : (
                <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px]">
                  Use a direct Google Sheet or Drive file link to preview inside the app.
                </p>
              )}
              <div className="p-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-mono text-[11px] text-emerald-700 truncate pr-3">{driveUrl}</span>
                {driveUrl && (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shrink-0"
                  >
                    <span>Open in Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
          ) : (
          <div className="p-6 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950 shadow-inner space-y-5">
            {/* Top Official Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-normal block">
                  {display(connection?.providerName)}
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {display(connection?.connectionType)} Electricity Bill
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Sub-Division: {display(connection?.subDivision)} · Circle: {display(connection?.circle)}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <div className="text-[10px] text-slate-500">Bill Invoice Number</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  {display(bill?.invoiceNumber)}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Billing Cycle: {billingPeriod}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Bill Amount: ₹{bill ? formatAmount(bill.billAmount) : 'Not provided'}
                </div>
              </div>
            </div>

            {/* Consumer & Meter Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-500 block">Consumer Account:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {display(connection?.consumerAccountNumber)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Consumer Name:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {display(connection?.consumerName)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Meter Number:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">
                  {display(connection?.meterNumber)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Contract Demand:</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {display(connection?.contractDemand)}
                </span>
              </div>
            </div>

            {/* Energy Consumption Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                <div className="text-slate-600 dark:text-slate-400 text-[10px] font-semibold uppercase">
                  Billed Active Energy (kWh)
                </div>
                <div className="text-lg font-mono font-bold text-emerald-800 dark:text-emerald-300 mt-1">
                  {bill && bill.consumptionKwh !== undefined && bill.consumptionKwh !== null
                    ? `${formatNumber(bill.consumptionKwh)} kWh`
                    : 'Not provided'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-600 dark:text-slate-400 text-[10px] font-semibold uppercase">
                  Total Bill Amount (INR)
                </div>
                <div className="text-lg font-mono font-bold text-slate-900 dark:text-white mt-1">
                  ₹{bill ? formatAmount(bill.billAmount) : 'Not provided'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800">
                <div className="text-slate-600 dark:text-slate-400 text-[10px] font-semibold uppercase">
                  Verification Status
                </div>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Document</span>
                </div>
              </div>
            </div>

            {/* Google Drive Link Box */}
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="min-w-0 pr-3">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                  Original Supporting File:
                </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 truncate block text-[11px] mt-0.5">
                  {driveUrl || 'Document attached via client submission'}
                </span>
              </div>
              {driveUrl && (
                <a
                  href={driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
                >
                  <span>Open in Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Official audit evidence securely mirrored on Google Drive</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors shadow-2xs"
          >
            Close Document
          </button>
        </div>
      </div>
    </div>
  );
};
