'use client';

import { formatCurrency } from '@/lib/format';
import type { EvolucaoPatrimonioItem } from '@/lib/patrimonio-api';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type GraficoEvolucaoPatrimonioProps = {
  data: EvolucaoPatrimonioItem[];
};

export default function GraficoEvolucaoPatrimonio({ data }: GraficoEvolucaoPatrimonioProps) {
  return (
    <section className="chart-shell rounded-[30px] p-5 md:p-6">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--blue-deep)]">Linha</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold">Evolucao do patrimonio</h2>
        </div>
        <p className="max-w-xl text-sm text-[var(--muted)]">
          Acumulo mensal de bens e valor patrimonial com base na data de aquisicao dos ativos.
        </p>
      </div>

      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 0, right: 0, top: 12, bottom: 8 }}>
            <CartesianGrid stroke="rgba(15,23,42,0.08)" vertical={false} />
            <XAxis dataKey="competencia" tickLine={false} axisLine={false} tick={{ fill: '#667085', fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#667085', fontSize: 12 }}
              tickFormatter={(value: number) => formatCurrency(value)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#667085', fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) =>
                name === 'valor_acumulado'
                  ? [formatCurrency(Number(value ?? 0)), 'Valor acumulado']
                  : [Number(value ?? 0), 'Bens acumulados']
              }
              contentStyle={{ borderRadius: '16px', borderColor: 'rgba(15,23,42,0.12)' }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="valor_acumulado"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 3, fill: '#2563eb' }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total_bens_acumulado"
              stroke="#0f172a"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#0f172a' }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}


