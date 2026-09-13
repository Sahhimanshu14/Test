'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export interface TimeDistributionItem {
  bin: string;
  count: number;
}

export function TimeDistributionChart({ data }: { data: TimeDistributionItem[] }) {
  return (
    <div className="h-60 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="bin" stroke="#64748b" fontSize={11} />
          <YAxis stroke="#64748b" fontSize={11} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#090d16',
              borderColor: '#334155',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="count" name="Questions Solved" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
