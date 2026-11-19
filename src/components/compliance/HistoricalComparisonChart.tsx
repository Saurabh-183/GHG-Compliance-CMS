'use client';

import React from 'react';
import { IComparisonRow } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface HistoricalComparisonChartProps {
  rows: IComparisonRow[];
  period1: string;
  period2: string;
}

export const HistoricalComparisonChart: React.FC<HistoricalComparisonChartProps> = ({
  rows,
  period1,
  period2,
}) => {
  // Extract numeric rows for chart visualization (e.g. percentages or electricity in MU)
  const chartData = rows
    .map((r: any) => {
      const p1Raw = r.period1Value ?? r.value1;
      const p2Raw = r.period2Value ?? r.value2;
      const p1Val = typeof p1Raw === 'number' ? p1Raw : parseFloat(String(p1Raw));
      const p2Val = typeof p2Raw === 'number' ? p2Raw : parseFloat(String(p2Raw));
      const param = r.parameter || r.name || r.metricKey || 'Metric';

      if (isNaN(p1Val) || isNaN(p2Val)) return null;

      return {
        name: param.length > 20 ? param.substring(0, 18) + '...' : param,
        [period1]: p1Val,
        [period2]: p2Val,
        unit: r.unit,
      };
    })
    .filter(Boolean);

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Year-on-Year Metrics Trajectory
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparing Historical Approved baseline ({period1}) vs Current Year Performance ({period2})
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              fontSize={11}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis stroke="#64748b" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                borderColor: '#334155',
                borderRadius: '0.5rem',
                fontSize: '12px',
                color: '#f8fafc',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey={period1} fill="#059669" radius={[4, 4, 0, 0]} name={`${period1} (Historical)`} />
            <Bar dataKey={period2} fill="#0284c7" radius={[4, 4, 0, 0]} name={`${period2} (Current / Provisional)`} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
