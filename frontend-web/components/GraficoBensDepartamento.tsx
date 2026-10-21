'use client';

import type { BensPorDepartamentoItem } from '@/lib/patrimonio-api';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type GraficoBensDepartamentoProps = {
  data: BensPorDepartamentoItem[];
};

export default function GraficoBensDepartamento({ data }: GraficoBensDepartamentoProps) {
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
          <CartesianGrid stroke="rgba(18,18,22,0.09)" vertical={false} />
          <XAxis dataKey="codigo" tickLine={false} axisLine={false} tick={{ fill: '#6c6f7c', fontSize: 12 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: '#6c6f7c', fontSize: 12 }} />
          <Tooltip
            formatter={(value) => [`${value ?? 0} bens`, 'Quantidade']}
            labelFormatter={(label) => `Departamento ${label}`}
            contentStyle={{ borderRadius: '16px', borderColor: 'rgba(17,24,39,0.12)' }}
          />
          <Bar isAnimationActive={false} dataKey="total_bens" fill="#8b5e34" radius={[8, 8, 2, 2]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


