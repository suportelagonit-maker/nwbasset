'use client';

import type { BensPorLocalItem } from '@/lib/patrimonio-api';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = ['#374151', '#4ade80', '#f6a400', '#9ca3af', '#111827', '#d1d5db'];

type GraficoBensLocalProps = {
  data: BensPorLocalItem[];
};

export default function GraficoBensLocal({ data }: GraficoBensLocalProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px]">
      <div className="h-[290px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie isAnimationActive={false} data={data} dataKey="total_bens" nameKey="local" innerRadius={72} outerRadius={112} paddingAngle={3}>
              {data.map((entry, index) => (
                <Cell key={entry.local_id} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value ?? 0} bens`, 'Quantidade']}
              contentStyle={{ borderRadius: '16px', borderColor: 'rgba(17,24,39,0.12)' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-1.5 self-center">
        {data.map((entry, index) => (
          <div key={entry.local_id} className="flex items-center gap-2.5 rounded-[12px] border border-[rgba(17,24,39,0.08)] bg-[#fafafa] px-2.5 py-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--ink)]">{entry.local ?? 'Sem local'}</p>
              <p className="text-xs text-[var(--muted)]">{entry.total_bens} bens</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


