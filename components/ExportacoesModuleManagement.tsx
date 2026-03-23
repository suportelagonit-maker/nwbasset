'use client';

const exportacoes = [
  {
    label: 'Bens por local - PDF',
    path: '/api/exportacoes/bens-por-local/pdf',
    format: 'PDF',
  },
  {
    label: 'Bens por local - Excel',
    path: '/api/exportacoes/bens-por-local/excel',
    format: 'XLSX',
  },
  {
    label: 'Bens por local - CSV',
    path: '/api/exportacoes/bens-por-local/csv',
    format: 'CSV',
  },
  {
    label: 'Bens por responsÃ¡vel - PDF',
    path: '/api/exportacoes/bens-por-responsavel/pdf',
    format: 'PDF',
  },
  {
    label: 'DepreciaÃ§Ã£o - PDF',
    path: '/api/exportacoes/depreciacao/pdf',
    format: 'PDF',
  },
  {
    label: 'InventÃ¡rio - PDF',
    path: '/api/exportacoes/inventario/pdf',
    format: 'PDF',
  },
  {
    label: 'DivergÃªncias - PDF',
    path: '/api/exportacoes/divergencias/pdf',
    format: 'PDF',
  },
];

export default function ExportacoesModuleManagement(_: { empresaId: number | null }) {
  return (
    <section className="panel-surface rounded-[28px] p-5 md:p-6">
      <div>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">ExportaÃ§Ãµes</p>
        <h2 className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">Central de exportaÃ§Ã£o patrimonial</h2>
        <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
          Download dos arquivos gerados pela API de exportaÃ§Ãµes do NWB Asset, respeitando o contexto da empresa ativa.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {exportacoes.map((item) => (
          <article key={item.path} className="rounded-[24px] border border-[var(--line)] bg-[#fafafa] p-4.5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{item.format}</p>
            <h3 className="mt-1.5 text-[15px] font-semibold text-[var(--ink)]">{item.label}</h3>
            <p className="mt-2 font-mono text-xs text-[var(--muted)]">{item.path}</p>

            <a
              href={item.path}
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4.5 text-[13px] font-semibold text-white transition hover:opacity-90"
            >
              Baixar arquivo
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}

