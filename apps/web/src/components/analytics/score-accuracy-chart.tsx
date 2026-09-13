'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export interface TrendMetricItem {
  testTitle: string;
  netScore: number;
  accuracyPercent: number;
  cumulativeQuestionsSolved?: number;
}

export function ScoreAccuracyChart({ data }: { data: TrendMetricItem[] }) {
  return (
    <div className="h-72 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="testTitle"
            stroke="#64748b"
            fontSize={11}
            tickFormatter={(t) => (t && t.length > 15 ? `${t.slice(0, 15)}...` : t || '')}
          />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#090d16',
              borderColor: '#334155',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
          <Line
            type="monotone"
            dataKey="netScore"
            name="Net Score"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#10b981' }}
          />
          <Line
            type="monotone"
            dataKey="accuracyPercent"
            name="Accuracy %"
            stroke="#0ea5e9"
            strokeWidth={2}
            dot={{ r: 3, fill: '#0ea5e9' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
