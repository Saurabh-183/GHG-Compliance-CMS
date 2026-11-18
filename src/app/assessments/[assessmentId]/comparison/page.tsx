'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { IAssessment, IComparisonRow } from '@/types';
import { HistoricalComparisonChart } from '@/components/compliance/HistoricalComparisonChart';
import {
  TrendingUp,
  Building2,
  Calendar,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export default function AssessmentComparisonPage() {
  const params = useParams();
  const assessmentId = params.assessmentId as string;
  const [assessment1, setAssessment1] = useState<IAssessment | null>(null);
  const [assessment2, setAssessment2] = useState<IAssessment | null>(null);
  const [rows, setRows] = useState<IComparisonRow[]>([]);
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchComparison() {
      try {
        const url = selectedPeriod
          ? `/api/assessments/${assessmentId}/comparison?targetPeriod=${selectedPeriod}`
          : `/api/assessments/${assessmentId}/comparison`;

        const res = await fetch(url);
        if (res.ok) {
          const json = (await res.json()) as {
            data: {
              assessment1: IAssessment;
              assessment2: IAssessment;
              rows: IComparisonRow[];
              availablePeriods: string[];
            };
          };
          setAssessment1(json.data.assessment1);
          setAssessment2(json.data.assessment2);
          setRows(json.data.rows);
          setAvailablePeriods(json.data.availablePeriods || []);
          if (!selectedPeriod && json.data.assessment2) {
            setSelectedPeriod(json.data.assessment2.period);
          }
        }
      } catch (err) {
        console.error('Error fetching comparison:', err);
      } finally {
        setLoading(false);
      }
    }
    if (assessmentId) fetchComparison();
  }, [assessmentId, selectedPeriod]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center   text-xs">
        Generating Historical & Current Year Comparison...
      </div>
    );
  }

  if (!assessment1) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Comparison Data Unavailable</h2>
        <Link href="/facilities/TRIDENT_PAPER" className="mt-4 inline-block text-emerald-600 dark:text-emerald-400 text-xs">
          Return to Matrix
        </Link>
      </div>
    );
  }

  const period1Name = assessment1.period;
  const period2Name = assessment2 ? assessment2.period : 'FY2025-26';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs  ">
        <Link
          href={`/facilities/${assessment1.facilityId || 'TRIDENT_PAPER'}`}
          className="hover:text-emerald-400"
        >
          {assessment1.facilityName || assessment1.facilityId || 'Facility'}
        </Link>
        <ChevronRight className="w-3 h-3   " />
        <Link href={`/assessments/${assessmentId}`} className="hover:text-emerald-400">Assessment</Link>
        <ChevronRight className="w-3 h-3   " />
        <span className="text-slate-900 dark:text-white font-semibold">YoY Trajectory Comparison</span>
      </div>

      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                Year-on-Year Compliance Trajectory Comparison
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Facility: <strong className="text-slate-900 dark:text-white">{assessment1.facilityId}</strong> · Compliance: <strong className="text-slate-900 dark:text-white">{assessment1.complianceType}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector Controls */}
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
          <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">Compare With Period:</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-medium focus:outline-none focus:border-emerald-500"
          >
            {availablePeriods
              .filter((p) => p !== period1Name)
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Side-by-Side Comparison Table (PRD Section 8) */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Side-by-Side Regulatory Metrics Comparison Table
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Approved historical performance vs current active assessment with provisional labels.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 text-[11px] font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Compliance Parameter</th>
                <th className="py-3 px-4 text-center">Unit</th>
                <th className="py-3 px-4 text-right">
                  {period1Name} <br />
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-normal">
                    ({assessment1.isHistorical ? 'Approved Baseline' : 'Current'})
                  </span>
                </th>
                <th className="py-3 px-4 text-right">
                  {period2Name} <br />
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-normal">
                    ({assessment2?.isHistorical ? 'Approved Baseline' : 'Provisional'})
                  </span>
                </th>
                <th className="py-3 px-4 text-right">Variance / Delta</th>
                <th className="py-3 px-4 text-right">% Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/70 text-xs">
              {rows.map((row: any, index) => {
                const paramName = row.parameter || row.name || row.metricKey || 'Metric';
                const p1Val = row.period1Value ?? row.value1 ?? '—';
                const p2Val = row.period2Value ?? row.value2 ?? '—';
                const deltaVal = row.delta ?? row.absoluteDelta ?? '—';
                const pctChangeVal =
                  row.percentageChange ??
                  (typeof row.percentageDelta === 'number'
                    ? `${row.percentageDelta > 0 ? '+' : ''}${row.percentageDelta}%`
                    : row.percentageDelta ?? '—');
                const p1Status =
                  row.period1Status ||
                  (assessment1.isHistorical ? 'HISTORICAL_APPROVED' : 'PROVISIONAL');
                const p2Status =
                  row.period2Status ||
                  (assessment2?.isHistorical ? 'HISTORICAL_APPROVED' : 'PROVISIONAL');

                return (
                  <tr key={index} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                      {paramName}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      {row.unit}
                    </td>
                    {/* Period 1 Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {p1Val}
                      <div className="text-[9px] text-slate-500 font-sans font-normal uppercase mt-0.5">
                        {p1Status === 'HISTORICAL_APPROVED' ? 'Approved Final' : 'Provisional'}
                      </div>
                    </td>
                    {/* Period 2 Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {p2Val}
                      <div className="text-[9px] text-slate-500 font-sans font-normal uppercase mt-0.5">
                        {p2Status === 'PROVISIONAL' ? 'Provisional' : 'Approved Final'}
                      </div>
                    </td>
                    {/* Delta */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {deltaVal !== '—' && typeof deltaVal === 'number' && deltaVal > 0
                        ? `+${deltaVal}`
                        : deltaVal}
                    </td>
                    {/* Pct Change */}
                    <td className="py-3.5 px-4 text-right font-mono text-slate-700 dark:text-slate-300">
                      {pctChangeVal}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Bar Chart Trajectory */}
      <HistoricalComparisonChart
        rows={rows}
        period1={period1Name}
        period2={period2Name}
      />
    </div>
  );
}
