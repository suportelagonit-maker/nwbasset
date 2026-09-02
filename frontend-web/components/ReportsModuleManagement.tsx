'use client';

import { useEffect, useState } from 'react';

type ReportItem = {
  key: string;
  label: string;
  path: string;
  description: string;
};

const reports: ReportItem[] = [
  {
    key: 'bens-por-local',
    label: 'Bens por local',
    path: 'relatorios/bens-por-local',
    description: 'Distribuição patrimonial agrupada por local físico.',
  },
  {
    key: 'bens-por-responsavel',
    label: 'Bens por responsável',
    path: 'relatorios/bens-por-responsavel',
    description: 'Concentração de bens por responsável patrimonial.',
  },
  {
    key: 'depreciacao',
    label: 'Depreciação',
    path: 'relatorios/depreciacao',
    description: 'Visóo gerencial das depreciações registradas.',
  },
  {
    key: 'inventario',
    label: 'Inventário',
    path: 'relatorios/inventario',
    description: 'Resumo operacional dos inventários patrimoniais.',
  },
  {
    key: 'divergencias',
    label: 'Divergências',
    path: 'relatorios/divergencias',
    description: 'Divergências identificadas em inventários e conciliações.',
  },
];

export default function ReportsModuleManagement(_: { empresaId: number | null }) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAllReports();
  }, []);

  async function loadReport(report: ReportItem) {
    setLoadingKey(report.key);
    setError(null);

    try {
      const response = await fetch(`/api/admin/${report.path}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(`Falha ao consultar ${report.label.toLowerCase()}: ${response.status}`);
      }

      setData((current) => ({ ...current, [report.key]: payload }));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível consultar os relatórios.');
    } finally {
      setLoadingKey(null);
    }
  }

  async function loadAllReports() {
    await Promise.all(reports.map(async (report) => loadReport(report)));
  }

  function getCount(value: unknown) {
    if (Array.isArray(value)) {
      return value.length;
    }

    if (value && typeof value === 'object') {
      if (Array.isArray((value as { data?: unknown[] }).data)) {
        return (value as { data: unknown[] }).data.length;
      }

      return Object.keys(value).length;
    }

    return 0;
  }

  function getPreview(value: unknown) {
    return JSON.stringify(value ?? { message: 'Sem dados' }, null, 2);
  }

  return (
    <section className="panel-surface rounded-[28px] p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Relatórios</p>
          <h2 className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">Central de relatórios patrimoniais</h2>
          <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
            Consulta operacional dos relatórios existentes na API. A tela mostra contagem e uma prévia do retorno real do backend.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void loadAllReports()} className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4.5 text-[13px] font-semibold text-white transition hover:opacity-90">
            Atualizar relatórios
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">{error}</div>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {reports.map((report) => (
          <article key={report.key} className="rounded-[24px] border border-[var(--line)] bg-[#fafafa] p-4.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">/api/v1/{report.path}</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--ink)]">{report.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{report.description}</p>
              </div>

              <button type="button" onClick={() => void loadReport(report)} className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                {loadingKey === report.key ? 'Atualizando...' : 'Atualizar'}
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--line)] bg-white px-4 py-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Registros / chaves</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--ink)]">{getCount(data[report.key])}</p>
            </div>

            <pre className="mt-4 max-h-[320px] overflow-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-muted)] p-4 text-xs leading-6 text-[var(--ink)]">
              {getPreview(data[report.key])}
            </pre>
          </article>
        ))}
      </div>
    </section>
  );
}



