'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { IPspclBillPreview } from '@/lib/pspclBillPreview';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500 block text-[10px]">{label}</span>
      <span className="font-semibold text-slate-900 dark:text-white text-[11px] min-h-[1rem]">
        {value || '—'}
      </span>
    </div>
  );
}

interface PspclBillPreviewCardProps {
  bill: IPspclBillPreview;
  loading?: boolean;
  parseError?: string;
}

export const PspclBillPreviewCard: React.FC<PspclBillPreviewCardProps> = ({
  bill,
  loading,
  parseError,
}) => {
  if (loading) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 animate-pulse">
        Reading client Excel / Google Sheet…
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950 shadow-inner space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-2">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold block">
            {bill.utilityName || '—'}
          </span>
          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">{bill.billTitle || '—'}</h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {[bill.subDivision && `Sub-Division: ${bill.subDivision}`, bill.circle && `Circle: ${bill.circle}`]
              .filter(Boolean)
              .join(' · ') || '—'}
          </p>
        </div>
        <div className="text-right sm:text-right">
          <div className="text-[10px] text-slate-500">Bill Invoice Number</div>
          <div className="font-mono font-bold text-slate-900 dark:text-white">{bill.billInvoiceNumber || '—'}</div>
          <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
            Billing Cycle: {bill.billingCycle || '—'}
          </div>
          {bill.sourceMonth && (
            <div className="text-[9px] text-emerald-700 dark:text-emerald-400 mt-1 font-mono">Row: {bill.sourceMonth}</div>
          )}
        </div>
      </div>

      {parseError && (
        <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg px-3 py-2">
          {parseError}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px]">
        <Field label="Consumer Account:" value={bill.consumerAccount} />
        <Field label="Consumer Name:" value={bill.consumerName} />
        <Field label="Meter Number:" value={bill.meterNumber} />
        <Field label="Contract Demand:" value={bill.contractDemand} />
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-600 dark:text-slate-400 font-semibold">
              <th className="py-2 px-3">Parameter Description</th>
              <th className="py-2 px-3 text-right">Units</th>
              <th className="py-2 px-3 text-right">Recorded Value</th>
              <th className="py-2 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70 font-mono text-[11px]">
            <tr>
              <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">
                Total Active Energy Consumption (Net Import)
              </td>
              <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">{bill.netImportUnit || '—'}</td>
              <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                {bill.netImportKwh || '—'}
              </td>
              <td className="py-2 px-3 text-center font-sans">{bill.netImportStatus || '—'}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Maximum Demand Recorded (MDI)</td>
              <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">kVA</td>
              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">{bill.mdiKva || '—'}</td>
              <td className="py-2 px-3 text-center font-sans">{bill.mdiStatus || '—'}</td>
            </tr>
            <tr>
              <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">Average Monthly Power Factor</td>
              <td className="py-2 px-3 text-right text-slate-500 dark:text-slate-400">PF</td>
              <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-white">{bill.powerFactor || '—'}</td>
              <td className="py-2 px-3 text-center font-sans">{bill.pfStatus || '—'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {bill.reconciliationSummary ? (
        <div
          className={`p-3 rounded-lg flex items-start gap-2 ${
            bill.reconciliationVariant === 'mismatch'
              ? 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
              : bill.reconciliationVariant === 'match'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {bill.reconciliationVariant === 'mismatch' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : bill.reconciliationVariant === 'match' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : null}
          <span className="text-[11px]">{bill.reconciliationSummary}</span>
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 italic">
          Reconciliation requires both declared and bill/evidence values in the uploaded file for the selected row.
        </p>
      )}

      {(bill.declaredEnergyKwh || bill.billedEnergyKwh || bill.varianceKwh) && (
        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 pt-1">
          <div>
            <span className="block text-slate-500">Declared (file)</span>
            <span className="text-slate-900 dark:text-white font-semibold">{bill.declaredEnergyKwh || '—'}</span>
          </div>
          <div>
            <span className="block text-slate-500">Bill / evidence (file)</span>
            <span className="text-slate-900 dark:text-white font-semibold">{bill.billedEnergyKwh || '—'}</span>
          </div>
          <div>
            <span className="block text-slate-500">Variance (calc.)</span>
            <span className="text-slate-900 dark:text-white font-semibold">
              {bill.varianceKwh ? `${bill.varianceKwh}${bill.variancePercent ? ` (${bill.variancePercent})` : ''}` : '—'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};