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
  billDetails?: { invoiceNumber: string; billingFrom: string; billingTo: string; consumptionKwh: number; billAmount: number };
  utilityConnectionSnapshot?: { providerName: string; connectionType: string; subDivision: string; circle: string; consumerAccountNumber: string; consumerName: string; meterNumber: string; contractDemand: string };
  facilityId?: string;
}

export const EvidenceDocumentModal: React.FC<EvidenceDocumentModalProps> = ({
  isOpen,
  onClose,
  url = '',
  label = 'Evidence Document',
  documentType = 'PSPCL DISCOM Electricity Bill',
  month = '',
  billDetails,
  utilityConnectionSnapshot,
  facilityId = 'Facility',
}) => {
  if (!isOpen) return null;

  const connection = utilityConnectionSnapshot;
  const bill = billDetails;
  const display = (value?: string | number) => value === undefined || value === null || value === '' ? 'Not provided' : String(value);
  const billingPeriod = bill?.billingFrom && bill?.billingTo
    ? `${bill.billingFrom} to ${bill.billingTo}`
    : 'Not provided';


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
                Official Supporting Audit Record · Facility: {facilityId}
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
                  {display(connection?.providerName)}
                </span>
                <h4 className="text-base font-extrabold text-white mt-0.5">
                  {display(connection?.connectionType)} Electricity Bill
                </h4>
                <p className="text-[11px]  ">
                  Sub-Division: {display(connection?.subDivision)} · Circle: {display(connection?.circle)}
                </p>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-500">Bill Invoice Number</div>
                <div className="font-mono font-bold    dark:text-white">{display(bill?.invoiceNumber)}</div>
                <div className="text-[10px] mt-0.5">Billing Cycle: {billingPeriod}</div>
                <div className="text-[10px] mt-0.5">Bill Amount: ₹{bill ? formatNumber(bill.billAmount) : 'Not provided'}</div>
              </div>
            </div>

            {/* Consumer & Meter Specs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
              <div>
                <span className="text-slate-500 block">Consumer Account:</span>
                <span className="font-mono font-bold    dark:text-white">{display(connection?.consumerAccountNumber)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Consumer Name:</span>
                <span className="font-semibold    dark:text-white">{display(connection?.consumerName)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Meter Number:</span>
                <span className="font-mono font-bold    dark:text-white">{display(connection?.meterNumber)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Contract Demand:</span>
                <span className="font-mono font-bold text-emerald-400">{display(connection?.contractDemand)}</span>
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
                      {bill ? formatNumber(bill.consumptionKwh) : 'Not provided'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        Client submitted
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* Google Drive Link Metadata & Info */}
          <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="  font-semibold block text-[11px] uppercase tracking-wider">
              Google Drive Evidence Reference
            </span>
            <div className="flex items-center justify-between gap-3 font-mono text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
              <span className="truncate">{url || process.env.NEXT_PUBLIC_GDRIVE_FOLDER_URL || GOOGLE_DRIVE_FOLDER_URL}</span>
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
              This preview displays information submitted by the client. The linked source document remains the supporting evidence for consultant verification.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2 text-[11px]  ">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Client-submitted information · Verification pending</span>
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
