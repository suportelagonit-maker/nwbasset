'use client';

import { useEffect, useState } from 'react';

import ExportButton from '@/components/ExportButton';
import GraficoBensDepartamento from '@/components/GraficoBensDepartamento';
import GraficoBensLocal from '@/components/GraficoBensLocal';
import PatrimonioResumo from '@/components/PatrimonioResumo';
import {
  buildExportUrl,
  type BensPorDepartamentoItem,
  type BensPorLocalItem,
  type DashboardOverview,
  type DashboardQueryFilters,
  type PatrimonioResumo as PatrimonioResumoData,
} from '@/lib/patrimonio-api';

function MiniIconCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <article className="rounded-[18px] border border-[rgba(17,24,39,0.08)] bg-white px-5 py-4 shadow-[0_8px_18px_rgba(17,24,39,0.04)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-[rgba(246,164,0,0.08)] text-[#f0c86d]">
            <div className="h-9 w-9">{icon}</div>
          </div>
          <p className="max-w-[150px] text-[12px] font-medium leading-5 text-[#4a4f58]">{title}</p>
        </div>
        <p className="shrink-0 text-[2rem] font-medium tracking-[-0.05em] text-[#1c2230]">{value}</p>
      </div>
    </article>
  );
}

function DashboardChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] border border-[rgba(17,24,39,0.08)] bg-white p-6 shadow-[0_8px_18px_rgba(17,24,39,0.04)]">
      <h3 className="text-[2rem] font-semibold tracking-[-0.05em] text-[#171b23]">{title}</h3>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function DashboardChartCardSkeleton({ title }: { title: string }) {
  return (
    <DashboardChartCard title={title}>
      <div className="flex h-[320px] items-center justify-center rounded-[18px] bg-[rgba(15,23,42,0.03)] text-sm text-[#697180]">
        Carregando gráfico...
      </div>
    </DashboardChartCard>
  );
}

function DashboardChartCardError({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <DashboardChartCard title={title}>
      <div className="flex h-[320px] items-center justify-center rounded-[18px] border border-[rgba(239,68,68,0.12)] bg-[rgba(254,242,242,0.65)] px-6 text-center text-sm text-[#b42318]">
        {message}
      </div>
    </DashboardChartCard>
  );
}

const EMPTY_RESUMO: PatrimonioResumoData = {
  total_bens: 0,
  valor_total_patrimonio: 0,
  bens_depreciados: 0,
  bens_sem_plaqueta: 0,
  inventarios_abertos: 0,
  divergencias_abertas: 0,
  total_empresas: 0,
  total_unidades: 0,
  total_departamentos: 0,
  total_locais: 0,
  total_usuarios: 0,
};

type DashboardPatrimonioClientProps = {
  filters: DashboardQueryFilters;
  isGeneralView: boolean;
};

function buildOverviewPath(filters: DashboardQueryFilters, isGeneralView: boolean): string {
  const url = new URL('/api/dashboard/patrimonio/overview', 'http://frontend.local');

  if (isGeneralView) {
    url.searchParams.set('visao', 'geral');
  }

  if (filters.empresa_id) {
    url.searchParams.set('empresa_id', String(filters.empresa_id));
  }

  if (filters.filial_id) {
    url.searchParams.set('filial_id', String(filters.filial_id));
  }

  return `${url.pathname}${url.search}`;
}

export default function DashboardPatrimonioClient({
  filters,
  isGeneralView,
}: DashboardPatrimonioClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumo, setResumo] = useState<PatrimonioResumoData>(EMPTY_RESUMO);
  const [bensPorLocal, setBensPorLocal] = useState<BensPorLocalItem[]>([]);
  const [bensPorDepartamento, setBensPorDepartamento] = useState<BensPorDepartamentoItem[]>([]);

  useEffect(() => {
    let alive = true;

    async function loadOverview() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(buildOverviewPath(filters, isGeneralView), {
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? `Falha ao consultar dashboard/overview: ${response.status}`);
        }

        const overview = (await response.json()) as DashboardOverview;

        if (!alive) {
          return;
        }

        setResumo(overview.resumo ?? EMPTY_RESUMO);
        setBensPorLocal(Array.isArray(overview.bens_por_local) ? overview.bens_por_local : []);
        setBensPorDepartamento(Array.isArray(overview.bens_por_departamento) ? overview.bens_por_departamento : []);
      } catch (caughtError) {
        if (!alive) {
          return;
        }

        setResumo(EMPTY_RESUMO);
        setBensPorLocal([]);
        setBensPorDepartamento([]);
        setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar o dashboard.');
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadOverview();

    return () => {
      alive = false;
    };
  }, [filters.empresa_id, filters.filial_id, isGeneralView]);

  return (
    <section className="rounded-[0px] bg-[var(--content-bg)] p-6 md:p-7">
      <div className="flex flex-col gap-7">
        <div>
          <h2 className="text-[2.05rem] font-semibold tracking-[-0.05em] text-[#171b23]">Painel de Controle</h2>
          <p className="mt-2 text-sm text-[#697180]">
            {isGeneralView
              ? `Visão geral. Os indicadores abaixo consolidam ${resumo.total_empresas ?? 0} empresa(s) acessível(is) no seu perfil.`
              : 'Visão da empresa selecionada. Todos os indicadores abaixo refletem apenas essa empresa.'}
          </p>
        </div>

        {error ? (
          <div className="rounded-[18px] border border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.92)] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        ) : null}

        <section id="bens">
          <PatrimonioResumo resumo={resumo} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MiniIconCard
            title="Empresas"
            value={resumo.total_empresas ?? 0}
            icon={
              <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6">
                <rect x="10" y="16" width="18" height="24" rx="3" />
                <rect x="36" y="10" width="18" height="30" rx="3" />
                <path d="M6 48h52" />
              </svg>
            }
          />
          <MiniIconCard
            title="Locais"
            value={resumo.total_locais ?? 0}
            icon={
              <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6">
                <circle cx="32" cy="32" r="20" />
                <path d="M12 32h40" />
                <path d="M32 12a28 28 0 0 1 0 40" />
                <path d="M32 12a28 28 0 0 0 0 40" />
              </svg>
            }
          />
          <MiniIconCard
            title="Departamentos"
            value={resumo.total_departamentos ?? 0}
            icon={
              <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6">
                <rect x="18" y="10" width="28" height="10" rx="3" />
                <rect x="14" y="24" width="36" height="12" rx="3" />
                <rect x="10" y="40" width="44" height="12" rx="3" />
              </svg>
            }
          />
          <MiniIconCard
            title="Unidades Administrativas"
            value={resumo.total_unidades ?? 0}
            icon={
              <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M8 24 32 12l24 12" />
                <path d="M12 24h40v28H12z" />
                <path d="M20 52V32M32 52V32M44 52V32" />
              </svg>
            }
          />
          <MiniIconCard
            title="Usuários"
            value={resumo.total_usuarios ?? 0}
            icon={
              <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.6">
                <circle cx="22" cy="24" r="7" />
                <circle cx="42" cy="20" r="6" />
                <circle cx="42" cy="40" r="7" />
                <path d="M10 50c2.5-6 7-9 12-9s9.5 3 12 9" />
                <path d="M32 50c2.2-5 6-8 10-8s7.8 3 10 8" />
              </svg>
            }
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-2" id="relatorios">
          {loading ? (
            <>
              <DashboardChartCardSkeleton title="Bens Móveis" />
              <DashboardChartCardSkeleton title="Bens Imóveis" />
            </>
          ) : error ? (
            <>
              <DashboardChartCardError title="Bens Móveis" message={error} />
              <DashboardChartCardError title="Bens Imóveis" message={error} />
            </>
          ) : (
            <>
              <DashboardChartCard title="Bens Móveis">
                <GraficoBensLocal data={bensPorLocal} />
              </DashboardChartCard>

              <DashboardChartCard title="Bens Imóveis">
                <GraficoBensDepartamento data={bensPorDepartamento} />
              </DashboardChartCard>
            </>
          )}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto]" id="exportacoes">
          <div className="flex flex-wrap gap-3">
            <ExportButton href={buildExportUrl('exportacoes/bens-por-local/pdf', filters)} label="Bens por Local PDF" />
            <ExportButton href={buildExportUrl('exportacoes/bens-por-local/excel', filters)} label="Bens por Local Excel" />
            <ExportButton href={buildExportUrl('exportacoes/bens-por-local/csv', filters)} label="Bens por Local CSV" />
            <ExportButton href={buildExportUrl('exportacoes/bens-por-responsavel/pdf', filters)} label="Responsável PDF" tone="amber" />
          </div>
        </section>
      </div>
    </section>
  );
}


