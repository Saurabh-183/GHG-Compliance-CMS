'use client';

import React, { useState } from 'react';
import { ExternalLink, FileText, Maximize2, Minimize2, ShieldCheck, X } from 'lucide-react';
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
  if (!url) return null;
  const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (sheetMatch) {
    const gidMatch = url.match(/[?&#]gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/preview?rm=minimal${gidParam}`;
  }
  const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  if (url.includes('/api/client-vault-files/')) return url;
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
  const [isFullScreen, setIsFullScreen] = useState(false);
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

  const cleanTitle = (label || 'Evidence Document Snapshot')
    .replace(/^(\d{4}-\d{2}-\d{2})_/, '$1 · ')
    .replace(/_/g, ' ');

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${
        isFullScreen ? 'p-0' : 'p-2 sm:p-4 lg:p-6'
      } bg-black/85 backdrop-blur-md animate-fade-in`}
      role="presentation"
    >
      <div
        className={
          isFullScreen
            ? 'relative w-full h-full max-w-none max-h-none rounded-none bg-white dark:bg-slate-900 border-0 shadow-2xl overflow-hidden flex flex-col'
            : 'relative w-[96vw] max-w-6xl xl:max-w-7xl 2xl:max-w-[1560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]'
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="evidence-preview-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  id="evidence-preview-title"
                  className="text-sm sm:text-base font-bold text-slate-900 dark:text-white break-words"
                  title={label}
                >
                  {cleanTitle}
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 shrink-0">
                  {isDraftPreview ? 'Draft Preview' : 'Google Drive Evidence'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Official Supporting Audit Record · Facility:{' '}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">{facilityId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {driveUrl && (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800/60 transition-colors"
                title="Open directly in Google Sheets or Drive"
              >
                <span>Open in Drive</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              aria-label={isFullScreen ? 'Exit full screen' : 'Expand full screen'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={isFullScreen ? 'Exit full screen' : 'Expand full screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {showIndustrialOnly ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <p>
                  Audit document preview for <strong>{cleanTitle}</strong>. Review the live interactive spreadsheet below or open in Google Drive.
                </p>
                {driveUrl && (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold hover:underline shrink-0"
                  >
                    <span>Open in new tab</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {embedUrl ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs bg-white">
                  <iframe
                    title="Evidence spreadsheet"
                    src={embedUrl}
                    className={`w-full bg-white transition-all ${
                      isFullScreen
                        ? 'h-[calc(100vh-210px)] min-h-[600px]'
                        : 'h-[68vh] min-h-[520px]'
                    }`}
                    allow="fullscreen"
                  />
                </div>
              ) : (
                <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px]">
                  Use a direct Google Sheet or Drive file link to preview inside the app.
                </p>
              )}

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                    Google Drive Vault Reference:
                  </span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 truncate block text-[11px] mt-0.5">
                    {driveUrl}
                  </span>
                </div>
                {driveUrl && (
                  <a
                    href={driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
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
