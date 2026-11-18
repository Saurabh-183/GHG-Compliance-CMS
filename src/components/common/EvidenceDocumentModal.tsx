'use client';

import React from 'react';
import { ExternalLink, FileText, ShieldCheck, X } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

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
}) => {
  if (!isOpen) return null;

  const driveUrl = url.trim();
  const billingPeriod = billDetails?.billingFrom && billDetails?.billingTo
    ? `${billDetails.billingFrom} to ${billDetails.billingTo}`
    : 'Not provided';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm" role="presentation">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="evidence-preview-title">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="evidence-preview-title" className="truncate text-sm font-bold text-slate-900 dark:text-white">{label}</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Facility: {facilityId}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close preview" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <main className="space-y-5 overflow-y-auto p-4 text-xs sm:p-6">
          <section className="space-y-5 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950 sm:p-6">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row">
              <div>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">{display(utilityConnectionSnapshot?.providerName)}</span>
                <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">{display(utilityConnectionSnapshot?.connectionType)} Electricity Bill</h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Sub-division: {display(utilityConnectionSnapshot?.subDivision)} · Circle: {display(utilityConnectionSnapshot?.circle)}</p>
              </div>
              <div className="sm:text-right">
                <div className="text-[10px] text-slate-500">Invoice number</div>
                <div className="font-mono font-bold text-slate-900 dark:text-white">{display(billDetails?.invoiceNumber)}</div>
                <div className="mt-1 text-[10px] text-slate-500">Billing period: {billingPeriod}</div>
                <div className="mt-1 text-[10px] text-slate-500">Bill amount: ₹{formatAmount(billDetails?.billAmount)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-4">
              <div><span className="block text-slate-500">Consumer account</span><strong className="break-words font-mono text-slate-900 dark:text-white">{display(utilityConnectionSnapshot?.consumerAccountNumber)}</strong></div>
              <div><span className="block text-slate-500">Consumer name</span><strong className="break-words text-slate-900 dark:text-white">{display(utilityConnectionSnapshot?.consumerName)}</strong></div>
              <div><span className="block text-slate-500">Meter number</span><strong className="break-words font-mono text-slate-900 dark:text-white">{display(utilityConnectionSnapshot?.meterNumber)}</strong></div>
              <div><span className="block text-slate-500">Contract demand</span><strong className="break-words font-mono text-emerald-700 dark:text-emerald-400">{display(utilityConnectionSnapshot?.contractDemand)}</strong></div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-[10px] uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <th className="px-3 py-2">Parameter</th>
                    <th className="px-3 py-2 text-right">Unit</th>
                    <th className="px-3 py-2 text-right">Value</th>
                    <th className="px-3 py-2 text-center">Source</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-mono text-[11px]">
                    <td className="px-3 py-3 font-sans text-slate-700 dark:text-slate-300">Total active energy consumption (net import)</td>
                    <td className="px-3 py-3 text-right text-slate-500">kWh</td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700 dark:text-emerald-400">{billDetails?.consumptionKwh == null || !Number.isFinite(billDetails.consumptionKwh) ? 'Not provided' : formatNumber(billDetails.consumptionKwh)}</td>
                    <td className="px-3 py-3 text-center font-sans"><span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Client entered</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-300">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-[11px]">{isDraftPreview ? 'This is a local preview of the values currently entered in the form. Nothing has been submitted or saved yet.' : 'These details were provided by the client and are pending verification by the consultant. This preview is not an independently verified electricity bill.'}</p>
            </div>
          </section>

          <section className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Google Drive evidence reference</h3>
            {driveUrl ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <span className="truncate">{driveUrl}</span>
                <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-300 bg-slate-100 px-2.5 py-1 font-sans text-xs text-slate-800 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">
                  Open in Drive <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">No Drive URL entered. The form values can still be previewed locally.</p>
            )}
          </section>
        </main>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
          <span className="text-[10px] text-slate-500">{isDraftPreview ? 'Draft preview · Not saved' : 'Client-submitted information · Verification pending'}</span>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700">Close preview</button>
        </footer>
      </div>
    </div>
  );
};
