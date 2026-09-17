'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import GraficoBensDepartamento from '@/components/GraficoBensDepartamento';
import GraficoBensLocal from '@/components/GraficoBensLocal';
import { renderAdminIcon } from '@/lib/admin-navigation';
import { toFriendlyError } from '@/lib/feedback-message';
import { formatCurrency, formatNumber } from '@/lib/format';
import {
  buildExportUrl,
  type BensPorDepartamentoItem,
  type BensPorLocalItem,
  type DashboardOverview,
  type DashboardQueryFilters,
  type EvolucaoPatrimonioItem,
  type PatrimonioResumo as PatrimonioResumoData,
} from '@/lib/patrimonio-api';

/* ------------------------------------------------------------------ */
/* Seções personalizáveis                                               */
/* ------------------------------------------------------------------ */

type SectionKey = 'indicadores' | 'evolucao' | 'saude' | 'distribuicao' | 'estrutura' | 'atalhos' | 'exportacoes';

const SECTIONS: Array<{ key: SectionKey; label: string; description: string }> = [
  { key: 'indicadores', label: 'Indicadores', description: 'Bens, valor, depreciação, plaquetas, inventários e divergências.' },
  { key: 'evolucao', label: 'Evolução do patrimônio', description: 'Valor acumulado mês a mês pela data de aquisição.' },
  { key: 'saude', label: 'Saúde do patrimônio', description: 'Identificação, depreciação e conciliação em barras.' },
  { key: 'distribuicao', label: 'Distribuição', description: 'Bens por local e por departamento.' },
  { key: 'estrutura', label: 'Estrutura organizacional', description: 'Unidades, departamentos, locais e usuários.' },
  { key: 'atalhos', label: 'Atalhos', description: 'Acesso rápido aos módulos mais usados.' },
  { key: 'exportacoes', label: 'Exportações', description: 'Downloads em PDF, Excel e CSV.' },
];

const DEFAULT_SECTIONS: Record<SectionKey, boolean> = {
  indicadores: true,
  evolucao: true,
  saude: true,
  distribuicao: true,
  estrutura: true,
  atalhos: true,
  exportacoes: false,
};

const STORAGE_KEY = 'nwbasset.dashboard.sections';

function loadSections(): Record<SectionKey, boolean> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SECTIONS;
    }
    const parsed = JSON.parse(raw) as Partial<Record<SectionKey, boolean>>;
    return { ...DEFAULT_SECTIONS, ...parsed };
  } catch {
    return DEFAULT_SECTIONS;
  }
}

/* ------------------------------------------------------------------ */
/* Utilitários                                                          */
/* ------------------------------------------------------------------ */

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

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function percent(part: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function formatCompetencia(value: string) {
  const [year, month] = value.split('-');
  const index = Number(month) - 1;
  return MONTHS_SHORT[index] ? `${MONTHS_SHORT[index]}/${year.slice(2)}` : value;
}

function formatCompactCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  }
  return formatCurrency(value);
}

function buildPath(path: string, filters: DashboardQueryFilters, isGeneralView: boolean): string {
  const url = new URL(path, 'http://frontend.local');

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

function todayLabel() {
  const text = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ------------------------------------------------------------------ */
/* Blocos visuais                                                       */
/* ------------------------------------------------------------------ */

type Tone = 'neutral' | 'accent' | 'mint' | 'blue' | 'rose';

const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-[rgba(17,24,39,0.25)]',
  accent: 'bg-[var(--accent)]',
  mint: 'bg-[var(--mint-deep)]',
  blue: 'bg-[var(--blue)]',
  rose: 'bg-[var(--rose)]',
};

const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-[var(--muted)]',
  accent: 'text-[var(--accent-deep)]',
  mint: 'text-[#15803d]',
  blue: 'text-[var(--blue-deep)]',
  rose: 'text-[var(--rose)]',
};

function Kpi({
  label,
  value,
  hint,
  tone = 'neutral',
  href,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
  href?: string;
  loading?: boolean;
}) {
  const content = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      {loading ? (
        <span className="mt-2 block h-8 w-20 animate-pulse rounded-lg bg-[rgba(17,24,39,0.06)]" />
      ) : (
        <p className="mt-1.5 truncate font-[family-name:var(--font-heading)] text-[1.6rem] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[1.75rem]">
          {value}
        </p>
      )}
      <p className={`mt-1 flex items-center gap-1.5 text-[12px] font-medium ${TONE_TEXT[tone]}`}>
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} />
        <span className="truncate">{hint}</span>
      </p>
    </>
  );

  const className = 'block min-w-0 rounded-[18px] border border-[var(--line)] bg-white px-4 py-3.5 transition';

  return href ? (
    <Link href={href} prefetch={false} className={`${className} hover:border-[rgba(246,164,0,0.5)] hover:shadow-[0_10px_26px_rgba(17,24,39,0.06)]`}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}

function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <article className={`flex min-w-0 flex-col rounded-[20px] border border-[var(--line)] bg-white p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ink)] md:text-[16px]">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[12px] text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-3 min-w-0 flex-1">{children}</div>
    </article>
  );
}

function Placeholder({ text, height = 240 }: { text: string; height?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-[14px] border border-dashed border-[var(--line)] bg-[#fafafa] px-6 text-center text-[13px] text-[var(--muted)]"
      style={{ height }}
    >
      {text}
    </div>
  );
}

function HealthBar({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: Tone }) {
  const width = Math.max(0, Math.min(100, value));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold text-[var(--ink)]">{label}</p>
        <p className={`text-[13px] font-semibold tabular-nums ${TONE_TEXT[tone]}`}>{width}%</p>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[rgba(17,24,39,0.06)]">
        <div className={`h-full rounded-full transition-[width] duration-500 ${TONE_DOT[tone]}`} style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function SectionToggle({
  sections,
  onChange,
  onReset,
}: {
  sections: Record<SectionKey, boolean>;
  onChange: (key: SectionKey, value: boolean) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3.5 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <span className="[&>svg]:h-4 [&>svg]:w-4">{renderAdminIcon('sliders')}</span>
        Personalizar
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-[300px] max-w-[calc(100vw-32px)] rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_18px_38px_rgba(17,24,39,0.12)]">
          <p className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Seções do painel</p>
          <ul className="max-h-[60vh] overflow-y-auto">
            {SECTIONS.map((section) => (
              <li key={section.key}>
                <label className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-2 transition hover:bg-[rgba(17,24,39,0.04)]">
                  <input
                    type="checkbox"
                    checked={sections[section.key]}
                    onChange={(event) => onChange(section.key, event.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--ink)]">{section.label}</span>
                    <span className="block text-[11px] leading-4 text-[var(--muted)]">{section.description}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-1 border-t border-[var(--line)] px-2 pt-2">
            <button type="button" onClick={onReset} className="text-[12px] font-semibold text-[var(--accent-deep)] hover:underline">
              Restaurar padrão
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const SHORTCUTS: Array<{ label: string; description: string; href: string; icon: string }> = [
  { label: 'Bens patrimoniais', description: 'Cadastrar e consultar', href: '/dashboard/modulos/bens', icon: 'cube' },
  { label: 'Plaquetas / QR', description: 'Identificação física', href: '/dashboard/modulos/plaquetas', icon: 'tag' },
  { label: 'Inventários', description: 'Contagem em campo', href: '/dashboard/modulos/inventarios', icon: 'clipboard' },
  { label: 'Transferências', description: 'Movimentar bens', href: '/dashboard/modulos/transferencias-bens', icon: 'swap' },
  { label: 'Depreciações', description: 'Valor contábil', href: '/dashboard/modulos/depreciacoes', icon: 'trend' },
  { label: 'Relatório BI', description: 'Painel analítico e PDF', href: '/dashboard/modulos/relatorios', icon: 'report' },
];

const tooltipStyle = { borderRadius: '14px', borderColor: 'rgba(17,24,39,0.12)', fontSize: 12 };

/* ------------------------------------------------------------------ */
/* Painel                                                               */
/* ------------------------------------------------------------------ */

type DashboardPatrimonioClientProps = {
  filters: DashboardQueryFilters;
  isGeneralView: boolean;
  empresaNome?: string | null;
  userName?: string | null;
};

export default function DashboardPatrimonioClient({ filters, isGeneralView, empresaNome, userName }: DashboardPatrimonioClientProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resumo, setResumo] = useState<PatrimonioResumoData>(EMPTY_RESUMO);
  const [bensPorLocal, setBensPorLocal] = useState<BensPorLocalItem[]>([]);
  const [bensPorDepartamento, setBensPorDepartamento] = useState<BensPorDepartamentoItem[]>([]);
  const [evolucao, setEvolucao] = useState<EvolucaoPatrimonioItem[]>([]);
  const [sections, setSections] = useState<Record<SectionKey, boolean>>(DEFAULT_SECTIONS);
  const friendlyError = error ? toFriendlyError(error) : null;

  useEffect(() => {
    setSections(loadSections());
  }, []);

  function updateSection(key: SectionKey, value: boolean) {
    setSections((current) => {
      const next = { ...current, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function resetSections() {
    setSections(DEFAULT_SECTIONS);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [overviewResponse, evolucaoResponse] = await Promise.all([
          fetch(buildPath('/api/dashboard/patrimonio/overview', filters, isGeneralView), { cache: 'no-store', headers: { Accept: 'application/json' } }),
          fetch(buildPath('/api/dashboard/patrimonio/evolucao-patrimonio', filters, isGeneralView), { cache: 'no-store', headers: { Accept: 'application/json' } }).catch(() => null),
        ]);

        // Sessão inválida no backend: volta para o login em vez de mostrar um painel zerado.
        if (overviewResponse.status === 401) {
          window.location.assign('/api/auth/logout');
          return;
        }

        if (!overviewResponse.ok) {
          const payload = (await overviewResponse.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? `Falha ao consultar dashboard/overview: ${overviewResponse.status}`);
        }

        const overview = (await overviewResponse.json()) as DashboardOverview;
        const evolucaoPayload = evolucaoResponse?.ok ? ((await evolucaoResponse.json().catch(() => [])) as unknown) : [];

        if (!alive) {
          return;
        }

        setResumo(overview.resumo ?? EMPTY_RESUMO);
        setBensPorLocal(Array.isArray(overview.bens_por_local) ? overview.bens_por_local : []);
        setBensPorDepartamento(Array.isArray(overview.bens_por_departamento) ? overview.bens_por_departamento : []);
        setEvolucao(Array.isArray(evolucaoPayload) ? (evolucaoPayload as EvolucaoPatrimonioItem[]) : []);
      } catch (caughtError) {
        if (!alive) {
          return;
        }
        setResumo(EMPTY_RESUMO);
        setBensPorLocal([]);
        setBensPorDepartamento([]);
        setEvolucao([]);
        setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível carregar o dashboard.');
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      alive = false;
    };
  }, [filters.empresa_id, filters.filial_id, isGeneralView]);

  const health = useMemo(() => {
    const total = resumo.total_bens;
    const comPlaqueta = Math.max(0, total - resumo.bens_sem_plaqueta);
    return {
      identificacao: percent(comPlaqueta, total),
      depreciados: percent(resumo.bens_depreciados, total),
      conciliacao: resumo.inventarios_abertos || resumo.divergencias_abertas ? Math.max(0, 100 - percent(resumo.divergencias_abertas, Math.max(total, 1))) : 100,
    };
  }, [resumo]);

  const evolucaoChart = useMemo(
    () =>
      evolucao.map((item) => ({
        competencia: formatCompetencia(item.competencia),
        valor: item.valor_acumulado,
        bens: item.total_bens_acumulado,
      })),
    [evolucao],
  );

  const greeting = userName ? `Olá, ${userName.split(' ')[0]}` : 'Painel de Controle';
  const contextLine = isGeneralView
    ? `Visão geral · ${formatNumber(resumo.total_empresas ?? 0)} empresa(s) no seu perfil`
    : empresaNome
      ? `Empresa ativa · ${empresaNome}`
      : 'Empresa ativa';

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-[var(--muted)]">{todayLabel()}</p>
          <h2 className="mt-0.5 font-[family-name:var(--font-heading)] text-[1.5rem] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[1.85rem]">
            {greeting}
          </h2>
          <p className="mt-1 text-[13px] text-[var(--muted)]">{contextLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionToggle sections={sections} onChange={updateSection} onReset={resetSections} />
          <Link
            href="/dashboard/modulos/relatorios"
            prefetch={false}
            className="inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-white px-3.5 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Relatório BI
          </Link>
          <Link
            href="/dashboard/modulos/bens"
            prefetch={false}
            className="inline-flex h-9 items-center rounded-full bg-[var(--accent)] px-3.5 text-[12px] font-semibold text-white transition hover:opacity-90"
          >
            + Novo bem
          </Link>
        </div>
      </section>

      {friendlyError ? (
        <div className="rounded-[18px] border border-[rgba(239,68,68,0.18)] bg-[rgba(254,242,242,0.92)] px-4 py-3 text-sm text-[#b42318]">
          <p className="font-semibold">{friendlyError.title}</p>
          <p className="mt-1">{friendlyError.text}</p>
          {friendlyError.help ? <p className="mt-1 text-xs opacity-80">{friendlyError.help}</p> : null}
        </div>
      ) : null}

      {/* Indicadores */}
      {sections.indicadores ? (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6" id="bens" aria-busy={loading}>
          <Kpi label="Bens patrimoniais" value={formatNumber(resumo.total_bens)} hint={`${formatNumber(resumo.total_locais ?? 0)} local(is)`} tone="accent" href="/dashboard/modulos/bens" loading={loading} />
          <Kpi label="Valor patrimonial" value={formatCurrency(resumo.valor_total_patrimonio)} hint="Soma das aquisições" tone="mint" loading={loading} />
          <Kpi
            label="Bens depreciados"
            value={formatNumber(resumo.bens_depreciados)}
            hint={`${health.depreciados}% do total`}
            tone="blue"
            href="/dashboard/modulos/depreciacoes"
            loading={loading}
          />
          <Kpi
            label="Sem plaqueta"
            value={formatNumber(resumo.bens_sem_plaqueta)}
            hint={resumo.bens_sem_plaqueta ? `${percent(resumo.bens_sem_plaqueta, resumo.total_bens)}% aguardando etiqueta` : 'Todos identificados'}
            tone={resumo.bens_sem_plaqueta ? 'accent' : 'mint'}
            href="/dashboard/modulos/plaquetas"
            loading={loading}
          />
          <Kpi
            label="Inventários abertos"
            value={formatNumber(resumo.inventarios_abertos)}
            hint={resumo.inventarios_abertos ? 'Contagem em andamento' : 'Nenhum em andamento'}
            tone={resumo.inventarios_abertos ? 'accent' : 'neutral'}
            href="/dashboard/modulos/inventarios"
            loading={loading}
          />
          <Kpi
            label="Divergências"
            value={formatNumber(resumo.divergencias_abertas)}
            hint={resumo.divergencias_abertas ? 'Pendentes de tratamento' : 'Patrimônio conciliado'}
            tone={resumo.divergencias_abertas ? 'rose' : 'mint'}
            href="/dashboard/modulos/divergencias"
            loading={loading}
          />
        </section>
      ) : null}

      {/* Evolução + saúde */}
      {sections.evolucao || sections.saude ? (
        <section className={`grid gap-4 ${sections.evolucao && sections.saude ? 'xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]' : ''}`}>
          {sections.evolucao ? (
            <Card title="Evolução do patrimônio" subtitle="Valor acumulado por mês de aquisição">
              {loading ? (
                <Placeholder text="Carregando..." />
              ) : evolucaoChart.length ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolucaoChart} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dash-valor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#f6a400" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#f6a400" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(17,24,39,0.06)" vertical={false} />
                      <XAxis dataKey="competencia" tickLine={false} axisLine={false} tick={{ fill: '#70757f', fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: '#70757f', fontSize: 11 }} tickFormatter={(value) => formatCompactCurrency(Number(value))} width={70} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value, name) => (name === 'valor' ? [formatCurrency(Number(value)), 'Valor acumulado'] : [value, 'Bens acumulados'])}
                      />
                      <Area type="monotone" dataKey="valor" stroke="#f6a400" strokeWidth={2.2} fill="url(#dash-valor)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <Placeholder text="Sem histórico de aquisições para montar a evolução." />
              )}
            </Card>
          ) : null}

          {sections.saude ? (
            <Card title="Saúde do patrimônio" subtitle="Leitura rápida dos controles">
              {loading ? (
                <Placeholder text="Carregando..." />
              ) : (
                <div className="flex h-full flex-col justify-between gap-4">
                  <HealthBar
                    label="Identificação"
                    value={health.identificacao}
                    hint={resumo.bens_sem_plaqueta ? `${formatNumber(resumo.bens_sem_plaqueta)} bem(ns) sem plaqueta` : 'Todos os bens têm plaqueta'}
                    tone={health.identificacao >= 90 ? 'mint' : 'accent'}
                  />
                  <HealthBar
                    label="Depreciação"
                    value={health.depreciados}
                    hint={`${formatNumber(resumo.bens_depreciados)} de ${formatNumber(resumo.total_bens)} bens com cálculo registrado`}
                    tone="blue"
                  />
                  <HealthBar
                    label="Conciliação"
                    value={health.conciliacao}
                    hint={
                      resumo.divergencias_abertas
                        ? `${formatNumber(resumo.divergencias_abertas)} divergência(s) em aberto`
                        : resumo.inventarios_abertos
                          ? `${formatNumber(resumo.inventarios_abertos)} inventário(s) em andamento`
                          : 'Nenhuma pendência de inventário'
                    }
                    tone={resumo.divergencias_abertas ? 'rose' : 'mint'}
                  />
                </div>
              )}
            </Card>
          ) : null}
        </section>
      ) : null}

      {/* Distribuição */}
      {sections.distribuicao ? (
        <section className="grid gap-4 xl:grid-cols-2" id="relatorios">
          <Card title="Bens por local" subtitle="Onde o patrimônio está alocado">
            {loading ? (
              <Placeholder text="Carregando..." height={290} />
            ) : bensPorLocal.length ? (
              <GraficoBensLocal data={bensPorLocal} />
            ) : (
              <Placeholder text="Nenhum bem com local definido." height={290} />
            )}
          </Card>
          <Card title="Bens por departamento" subtitle="Distribuição pela estrutura administrativa">
            {loading ? (
              <Placeholder text="Carregando..." height={300} />
            ) : bensPorDepartamento.length ? (
              <GraficoBensDepartamento data={bensPorDepartamento} />
            ) : (
              <Placeholder text="Nenhum bem com departamento definido." height={300} />
            )}
          </Card>
        </section>
      ) : null}

      {/* Estrutura */}
      {sections.estrutura ? (
        <section className="rounded-[20px] border border-[var(--line)] bg-white px-4 py-3.5 md:px-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Empresas', value: resumo.total_empresas ?? 0, href: '/dashboard/modulos/empresas', icon: 'building' },
              { label: 'Unidades', value: resumo.total_unidades ?? 0, href: '/dashboard/modulos/unidades-administrativas', icon: 'office' },
              { label: 'Departamentos', value: resumo.total_departamentos ?? 0, href: '/dashboard/modulos/departamentos', icon: 'layers' },
              { label: 'Locais', value: resumo.total_locais ?? 0, href: '/dashboard/modulos/locais', icon: 'globe' },
              { label: 'Usuários', value: resumo.total_usuarios ?? 0, href: '/users', icon: 'users' },
            ].map((item) => (
              <Link key={item.label} href={item.href} prefetch={false} className="group flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--accent-soft)] text-[var(--accent-deep)] [&>svg]:h-[18px] [&>svg]:w-[18px]">
                  {renderAdminIcon(item.icon)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted)]">{item.label}</span>
                  <span className="block font-[family-name:var(--font-heading)] text-[1.2rem] font-semibold leading-6 tracking-[-0.03em] text-[var(--ink)] group-hover:text-[var(--accent-deep)]">
                    {loading ? '—' : formatNumber(item.value)}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Atalhos */}
      {sections.atalhos ? (
        <section>
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Atalhos</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-6">
            {SHORTCUTS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="group flex min-w-0 items-center gap-3 rounded-[18px] border border-[var(--line)] bg-white px-3.5 py-3 transition hover:border-[rgba(246,164,0,0.5)] hover:shadow-[0_10px_26px_rgba(17,24,39,0.06)]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(17,24,39,0.04)] text-[var(--ink)] transition group-hover:bg-[var(--accent-soft)] group-hover:text-[var(--accent-deep)] [&>svg]:h-5 [&>svg]:w-5">
                  {renderAdminIcon(item.icon)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-[var(--ink)]">{item.label}</span>
                  <span className="block truncate text-[11px] text-[var(--muted)]">{item.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Exportações */}
      {sections.exportacoes ? (
        <section className="flex flex-wrap items-center gap-2 rounded-[20px] border border-[var(--line)] bg-white px-4 py-3" id="exportacoes">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Exportar</span>
          {[
            { label: 'Bens por local · PDF', href: buildExportUrl('exportacoes/bens-por-local/pdf', filters) },
            { label: 'Bens por local · Excel', href: buildExportUrl('exportacoes/bens-por-local/excel', filters) },
            { label: 'Bens por local · CSV', href: buildExportUrl('exportacoes/bens-por-local/csv', filters) },
            { label: 'Responsáveis · PDF', href: buildExportUrl('exportacoes/bens-por-responsavel/pdf', filters) },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex h-8 items-center rounded-full border border-[var(--line)] bg-white px-3 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {item.label}
            </a>
          ))}
        </section>
      ) : null}
    </div>
  );
}
