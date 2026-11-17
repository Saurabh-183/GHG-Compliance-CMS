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
    .filter((r) => typeof r.period1Value === 'number' && typeof r.period2Value === 'number')
    .map((r) => ({
      name: r.parameter.length > 20 ? r.parameter.substring(0, 18) + '...' : r.parameter,
      [period1]: r.period1Value,
      [period2]: r.period2Value,
      unit: r.unit,
    }));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            Year-on-Year Metrics Trajectory
          </h3>
          <p className="text-xs  ">
            Comparing Historical Approved baseline ({period1}) vs Current Year Performance ({period2})
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              interval={0}
              angle={-15}
              textAnchor="end"
            />
            <YAxis stroke="#94a3b8" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                borderColor: '#334155',
                borderRadius: '0.5rem',
                fontSize: '12px',
                color: '#f8fafc',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
            <Bar dataKey={period1} fill="#10b981" radius={[4, 4, 0, 0]} name={`${period1} (Historical)`} />
            <Bar dataKey={period2} fill="#06b6d4" radius={[4, 4, 0, 0]} name={`${period2} (Current / Provisional)`} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
