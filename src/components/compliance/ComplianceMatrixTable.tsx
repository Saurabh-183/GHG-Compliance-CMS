'use client';

import React from 'react';
import Link from 'next/link';
import { IFacilityComplianceMatrix, ComplianceType } from '@/types';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ArrowUpRight, HelpCircle } from 'lucide-react';

interface ComplianceMatrixTableProps {
  data: IFacilityComplianceMatrix;
}

const complianceLabels: Record<ComplianceType, { title: string; subtitle: string }> = {
  RCO: {
    title: 'RCO / RPO',
    subtitle: 'Renewable Consumption Obligation (Financial Year)',
  },
  PAT: {
    title: 'PAT Scheme',
    subtitle: 'Perform, Achieve & Trade (Cycle & M&V)',
  },
  CCTS: {
    title: 'CCTS',
    subtitle: 'Carbon Credit Trading Scheme (MoEFCC/BEE)',
  },
  CEA: {
    title: 'CEA Electricity Returns',
    subtitle: 'Monthly Section 74 Statutory Filings',
  },
};

export const ComplianceMatrixTable: React.FC<ComplianceMatrixTableProps> = ({ data }) => {
  const { periods, compliances, matrix, facility } = data;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-md">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Facility Compliance Matrix — Multi-Year Status
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Click any matrix cell to open the detailed compliance assessment, evidence records, and calculation workbooks.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400"></span> Workflow Status
          </span>
          <span className="mx-1 text-slate-300 dark:text-slate-600">|</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-rose-600 dark:bg-rose-400"></span> Regulatory Outcome
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950/70 text-slate-700 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <th className="py-3 px-4 w-72">Compliance Framework</th>
              {periods.map((period) => (
                <th key={period} className="py-3 px-4 text-center">
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs">
            {compliances.map((comp) => {
              const info = complianceLabels[comp];
              return (
                <tr key={comp} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  {/* Framework Info */}
                  <td className="py-4 px-4 align-top">
                    <div className="font-semibold text-slate-900 dark:text-slate-200 text-sm">{info.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{info.subtitle}</div>
                  </td>

                  {/* Matrix Cells */}
                  {periods.map((period) => {
                    const cell = matrix[comp]?.[period];
                    if (!cell || !cell.isApplicable) {
                      return (
                        <td key={period} className="py-4 px-3 align-top text-center">
                          <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800/40 text-slate-500">
                            <span className="text-[11px] font-medium">— Not Applicable —</span>
                          </div>
                        </td>
                      );
                    }

                    const targetAssessmentId = cell.assessmentId;
                    const cellContent = (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer group flex flex-col items-center justify-center gap-2">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {period}
                          </span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors" />
                        </div>

                        {/* Dual Status: Workflow + Compliance Outcome */}
                        <div className="flex flex-col gap-1.5 w-full items-center">
                          <StatusBadge status={cell.workflowStatus} type="workflow" size="sm" />
                          <StatusBadge status={cell.complianceOutcome} type="outcome" size="sm" />
                        </div>
                      </div>
                    );

                    return (
                      <td key={period} className="py-3 px-3 align-top">
                        {targetAssessmentId ? (
                          <Link href={`/assessments/${targetAssessmentId}`}>
                            {cellContent}
                          </Link>
                        ) : (
                          <Link href={`/facilities/${facility.facilityId}`}>
                            {cellContent}
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
