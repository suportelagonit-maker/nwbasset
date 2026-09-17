'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { generateBiReportPdf, type BiPdfChart, type BiPdfTable } from '@/lib/bi-report-pdf';
import { formatCurrency, formatNumber } from '@/lib/format';
import { toFriendlyError } from '@/lib/feedback-message';

/* ------------------------------------------------------------------ */
/* Tipos dos relatórios (espelham RelatorioPatrimonialService no backend) */
/* ------------------------------------------------------------------ */

type BensPorLocalRow = {
  local_id: number | null;
  local: string | null;
  codigo_local: string | null;
  total_bens: number;
  valor_total: number;
};

type BensPorResponsavelRow = {
  responsavel_id: number | null;
  responsavel: string | null;
  matricula: string | null;
  total_bens: number;
  valor_total: number;
};

type DepreciacaoRow = {
  id: number;
  bem_patrimonial_id: number;
  numero_tombo: string | null;
  descricao: string | null;
  metodo: string | null;
  taxa_anual: number;
  valor_depreciado_acumulado: number;
  valor_contabil: number;
  data_calculo: string | null;
};

type InventarioRow = {
  id: number;
  nome: string;
  status: string;
  data_inicio: string | null;
  data_fim: string | null;
  total_itens: number;
  total_bens_encontrados: number;
  divergencias: number;
};

type DivergenciaRow = {
  id: number;
  inventario_id: number;
  inventario: string | null;
  numero_tombo: string | null;
  descricao_bem: string | null;
  tipo_divergencia: string;
  descricao: string | null;
};

type ReportData = {
  local: BensPorLocalRow[];
  responsavel: BensPorResponsavelRow[];
  depreciacao: DepreciacaoRow[];
  inventario: InventarioRow[];
  divergencias: DivergenciaRow[];
};

type Option = { id: number; nome: string };

type ReportKey = keyof ReportData;

type Metric = 'quantidade' | 'valor';

type InsightTone = 'good' | 'info' | 'warn' | 'bad';

type Insight = { tone: InsightTone; title: string; text: string };

type Column<T> = {
  key: string;
  label: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
  sortValue?: (row: T) => number | string;
};

const EMPTY_DATA: ReportData = { local: [], responsavel: [], depreciacao: [], inventario: [], divergencias: [] };

const PALETTE = ['#374151', '#f6a400', '#4ade80', '#2563eb', '#9ca3af', '#111827', '#e11d48', '#d1d5db'];
const DIVERGENCIA_PALETTE = ['#e11d48', '#f6a400', '#2563eb', '#374151'];

const TIPO_DIVERGENCIA_LABEL: Record<string, string> = {
  NAO_ENCONTRADO: 'Não encontrado',
  SEM_TOMBO: 'Sem tombo',
  LOCAL_DIFERENTE: 'Local diferente',
  RESPONSAVEL_DIFERENTE: 'Responsável diferente',
};

const STATUS_INVENTARIO_LABEL: Record<string, string> = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
};

const INVENTARIO_SERIES_LABEL: Record<string, string> = {
  itens: 'Itens',
  encontrados: 'Encontrados',
  divergencias: 'Divergências',
};

const TABS: Array<{ key: ReportKey; label: string }> = [
  { key: 'local', label: 'Bens por local' },
  { key: 'responsavel', label: 'Bens por responsável' },
  { key: 'depreciacao', label: 'Depreciação' },
  { key: 'inventario', label: 'Inventário' },
  { key: 'divergencias', label: 'Divergências' },
];

const tooltipStyle = { borderRadius: '14px', borderColor: 'rgba(17,24,39,0.12)', fontSize: 12 };

/* ------------------------------------------------------------------ */
/* Utilitários                                                          */
/* ------------------------------------------------------------------ */

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }

  return [];
}

function sum<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
}

function percent(part: number, total: number) {
  if (!total) {
    return 0;
  }

  return Math.round((part / total) * 1000) / 10;
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function withQuery(path: string, params: Record<string, string | number | null | undefined>) {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return query ? `${path}?${query}` : path;
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string | number | null | undefined) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const content = [headers, ...rows].map((line) => line.map(escape).join(';')).join('\r\n');
  // BOM para o Excel reconhecer UTF-8 (acentos) ao abrir o CSV.
  const blob = new Blob([`﻿${content}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Blocos visuais                                                       */
/* ------------------------------------------------------------------ */

type KpiTone = 'neutral' | 'accent' | 'mint' | 'blue' | 'rose';

const KPI_BAR: Record<KpiTone, string> = {
  neutral: 'bg-[rgba(17,24,39,0.18)]',
  accent: 'bg-[var(--accent)]',
  mint: 'bg-[var(--mint-deep)]',
  blue: 'bg-[var(--blue)]',
  rose: 'bg-[var(--rose)]',
};

function KpiTile({ label, value, hint, tone = 'neutral' }: { label: string; value: string; hint?: string; tone?: KpiTone }) {
  return (
    <article className="relative min-w-0 overflow-hidden rounded-[18px] border border-[var(--line)] bg-white px-4 py-3.5">
      <span className={`absolute inset-y-3 left-0 w-1 rounded-r-full ${KPI_BAR[tone]}`} aria-hidden="true" />
      <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-1.5 truncate font-[family-name:var(--font-heading)] text-[1.3rem] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[1.5rem]">
        {value}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{hint}</p> : null}
    </article>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-[20px] border border-[var(--line)] bg-white p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--ink)] md:text-[16px]">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[12px] text-[var(--muted)]">{subtitle}</p> : null}
        </div>
        <div className="print:hidden">{action}</div>
      </div>
      <div className="mt-3 min-w-0 flex-1">{children}</div>
    </article>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-[14px] border border-dashed border-[var(--line)] bg-[#fafafa] px-6 text-center text-[13px] text-[var(--muted)]">
      {text}
    </div>
  );
}

function MetricToggle({ value, onChange }: { value: Metric; onChange: (next: Metric) => void }) {
  return (
    <div className="inline-flex rounded-full border border-[var(--line)] bg-[#fafafa] p-0.5 text-[11px] font-semibold">
      {(['quantidade', 'valor'] as Metric[]).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={[
            'rounded-full px-3 py-1 transition',
            value === option ? 'bg-[var(--ink)] text-white' : 'text-[var(--muted)] hover:text-[var(--ink)]',
          ].join(' ')}
        >
          {option === 'quantidade' ? 'Qtd.' : 'Valor'}
        </button>
      ))}
    </div>
  );
}

function LegendList({ items, colors }: { items: Array<{ nome: string; valor: number }>; colors: string[] }) {
  const total = sum(items, (item) => item.valor);

  return (
    <ul className="grid content-center gap-1.5">
      {items.map((item, index) => (
        <li key={item.nome} className="flex items-center gap-2 rounded-[10px] border border-[var(--line)] bg-[#fafafa] px-2.5 py-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
          <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--ink)]">{item.nome}</span>
          <span className="text-[11px] tabular-nums text-[var(--muted)]">{formatPercent(percent(item.valor, total))}</span>
        </li>
      ))}
    </ul>
  );
}

const INSIGHT_STYLES: Record<InsightTone, { card: string; badge: string; label: string }> = {
  good: { card: 'border-[rgba(34,197,94,0.25)] bg-[rgba(74,222,128,0.08)]', badge: 'bg-[var(--mint-deep)]', label: 'Em dia' },
  info: { card: 'border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.06)]', badge: 'bg-[var(--blue)]', label: 'Informação' },
  warn: { card: 'border-[rgba(246,164,0,0.3)] bg-[rgba(246,164,0,0.08)]', badge: 'bg-[var(--accent)]', label: 'Atenção' },
  bad: { card: 'border-[rgba(225,29,72,0.22)] bg-[rgba(225,29,72,0.06)]', badge: 'bg-[var(--rose)]', label: 'Ação necessária' },
};

function InsightCard({ insight }: { insight: Insight }) {
  const style = INSIGHT_STYLES[insight.tone];

  return (
    <li className={`rounded-[16px] border px-3.5 py-3 ${style.card}`}>
      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white ${style.badge}`}>
        {style.label}
      </span>
      <p className="mt-1.5 text-[13px] font-semibold text-[var(--ink)]">{insight.title}</p>
      <p className="mt-0.5 text-[12px] leading-5 text-[#4a4f58]">{insight.text}</p>
    </li>
  );
}

function SortableTable<T extends { key: string | number }>({
  columns,
  rows,
  emptyText,
}: {
  columns: Array<Column<T>>;
  rows: T[];
  emptyText: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedRows = useMemo(() => {
    const column = sort ? columns.find((candidate) => candidate.key === sort.key) : null;
    if (!sort || !column?.sortValue) {
      return rows;
    }

    const pick = column.sortValue;
    return [...rows].sort((a, b) => {
      const left = pick(a);
      const right = pick(b);
      const result =
        typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'pt-BR');
      return sort.direction === 'asc' ? result : -result;
    });
  }, [columns, rows, sort]);

  function toggleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) {
        return { key, direction: 'desc' };
      }
      return current.direction === 'desc' ? { key, direction: 'asc' } : null;
    });
  }

  if (!rows.length) {
    return <p className="px-4 py-8 text-center text-[13px] text-[var(--muted)]">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 ${column.align === 'right' ? 'text-right' : ''}`}>
                {column.sortValue ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className="inline-flex items-center gap-1 uppercase tracking-[0.14em] hover:text-[var(--ink)]"
                  >
                    {column.label}
                    <span aria-hidden="true" className="text-[9px]">
                      {sort?.key === column.key ? (sort.direction === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.key} className="border-t border-[var(--line)] text-[13px] text-[var(--ink)]">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 align-top ${column.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SECONDARY_ACTION =
  'inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-white px-3.5 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]';
const PRIMARY_ACTION =
  'inline-flex h-9 items-center justify-center rounded-full bg-[var(--accent)] px-3.5 text-[12px] font-semibold text-white transition hover:opacity-90';

function StatusBadge({ status }: { status: string }) {
  const finalizado = status === 'FINALIZADO';

  return (
    <span
      className={[
        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
        finalizado ? 'bg-[rgba(74,222,128,0.16)] text-[#166534]' : 'bg-[rgba(246,164,0,0.14)] text-[#b45309]',
      ].join(' ')}
    >
      {STATUS_INVENTARIO_LABEL[status] ?? status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Painel                                                               */
/* ------------------------------------------------------------------ */

type ReportsModuleManagementProps = {
  empresaId: number | null;
  empresaNome?: string | null;
  empresaCnpj?: string | null;
};

type ChartKey = 'local' | 'responsavel' | 'depreciacao' | 'inventario' | 'divergencias';

export default function ReportsModuleManagement({ empresaNome, empresaCnpj }: ReportsModuleManagementProps) {
  const [data, setData] = useState<ReportData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [filiais, setFiliais] = useState<Option[]>([]);
  const [inventarios, setInventarios] = useState<Option[]>([]);
  const [filialId, setFilialId] = useState('');
  const [inventarioId, setInventarioId] = useState('');
  const [metric, setMetric] = useState<Metric>('quantidade');
  const [tab, setTab] = useState<ReportKey>('local');
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const chartNodes = useRef<Partial<Record<ChartKey, HTMLDivElement | null>>>({});
  const friendlyError = error ? toFriendlyError(error) : null;

  const chartRef = (key: ChartKey) => (node: HTMLDivElement | null) => {
    chartNodes.current[key] = node;
  };

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    const scoped = { filial_id: filialId || undefined };
    const requests: Array<[ReportKey, string]> = [
      ['local', withQuery('/api/admin/relatorios/bens-por-local', scoped)],
      ['responsavel', withQuery('/api/admin/relatorios/bens-por-responsavel', scoped)],
      ['depreciacao', '/api/admin/relatorios/depreciacao'],
      ['inventario', '/api/admin/relatorios/inventario'],
      ['divergencias', withQuery('/api/admin/relatorios/divergencias', { inventario_id: inventarioId || undefined })],
    ];

    try {
      const results = await Promise.all(
        requests.map(async ([key, url]) => {
          const response = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
          const payload = (await response.json().catch(() => null)) as unknown;

          if (!response.ok) {
            const message = (payload as { message?: string } | null)?.message;
            throw new Error(message ?? `Falha ao consultar o relatório (${response.status}).`);
          }

          return [key, asArray(payload)] as const;
        }),
      );

      setData({ ...EMPTY_DATA, ...(Object.fromEntries(results) as Partial<ReportData>) });
      setUpdatedAt(new Date());
    } catch (fetchError) {
      setData(EMPTY_DATA);
      setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível consultar os relatórios.');
    } finally {
      setLoading(false);
    }
  }, [filialId, inventarioId]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  // Opções dos filtros (carregadas uma vez).
  useEffect(() => {
    let alive = true;

    async function loadOptions() {
      const [filiaisResponse, inventariosResponse] = await Promise.all([
        fetch('/api/filiais', { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(() => null),
        fetch('/api/admin/inventarios?per_page=100', { headers: { Accept: 'application/json' }, cache: 'no-store' }).catch(() => null),
      ]);

      if (!alive) {
        return;
      }

      if (filiaisResponse?.ok) {
        const rows = asArray<{ id: number; nome: string }>(await filiaisResponse.json().catch(() => null));
        setFiliais(rows.map((row) => ({ id: row.id, nome: row.nome })));
      }

      if (inventariosResponse?.ok) {
        const rows = asArray<{ id: number; nome: string }>(await inventariosResponse.json().catch(() => null));
        setInventarios(rows.map((row) => ({ id: row.id, nome: row.nome })));
      }
    }

    void loadOptions();

    return () => {
      alive = false;
    };
  }, []);

  /* ---------------------------- Indicadores ---------------------------- */

  const kpis = useMemo(() => {
    const totalBens = sum(data.local, (row) => row.total_bens);
    const valorAquisicao = sum(data.local, (row) => row.valor_total);
    const bensSemLocal = sum(data.local.filter((row) => row.local_id === null), (row) => row.total_bens);
    const bensSemResponsavel = sum(data.responsavel.filter((row) => row.responsavel_id === null), (row) => row.total_bens);
    const depreciacaoAcumulada = sum(data.depreciacao, (row) => row.valor_depreciado_acumulado);
    const valorContabil = sum(data.depreciacao, (row) => row.valor_contabil);
    const inventariosAbertos = data.inventario.filter((row) => row.status !== 'FINALIZADO').length;
    const itensInventariados = sum(data.inventario, (row) => row.total_itens);
    const bensEncontrados = sum(data.inventario, (row) => row.total_bens_encontrados);
    const totalDivergencias = data.divergencias.length;

    return {
      totalBens,
      valorAquisicao,
      bensSemLocal,
      bensSemResponsavel,
      depreciacaoAcumulada,
      valorContabil,
      percentualDepreciado: percent(depreciacaoAcumulada, depreciacaoAcumulada + valorContabil),
      inventariosAbertos,
      totalInventarios: data.inventario.length,
      coberturaInventario: percent(bensEncontrados, itensInventariados),
      totalDivergencias,
      taxaDivergencia: percent(totalDivergencias, itensInventariados),
    };
  }, [data]);

  const localChart = useMemo(
    () =>
      data.local
        .map((row) => ({ nome: row.local ?? 'Sem local', quantidade: row.total_bens, valor: row.valor_total }))
        .sort((a, b) => b[metric] - a[metric])
        .slice(0, 8),
    [data.local, metric],
  );

  const responsavelChart = useMemo(() => {
    const rows = data.responsavel
      .map((row) => ({ nome: row.responsavel ?? 'Sem responsável', quantidade: row.total_bens, valor: row.valor_total }))
      .sort((a, b) => b[metric] - a[metric]);
    const top = rows.slice(0, 6);
    const rest = rows.slice(6);

    if (rest.length) {
      top.push({ nome: `Outros (${rest.length})`, quantidade: sum(rest, (row) => row.quantidade), valor: sum(rest, (row) => row.valor) });
    }

    return top;
  }, [data.responsavel, metric]);

  const depreciacaoChart = useMemo(
    () =>
      data.depreciacao
        .map((row) => ({
          nome: row.numero_tombo ?? `#${row.bem_patrimonial_id}`,
          descricao: row.descricao ?? '',
          contabil: row.valor_contabil,
          depreciado: row.valor_depreciado_acumulado,
        }))
        .sort((a, b) => b.contabil + b.depreciado - (a.contabil + a.depreciado))
        .slice(0, 10),
    [data.depreciacao],
  );

  const inventarioChart = useMemo(
    () =>
      data.inventario.slice(0, 8).map((row) => ({
        nome: row.nome,
        itens: row.total_itens,
        encontrados: row.total_bens_encontrados,
        divergencias: row.divergencias,
      })),
    [data.inventario],
  );

  const divergenciaChart = useMemo(() => {
    const counts = new Map<string, number>();
    data.divergencias.forEach((row) => counts.set(row.tipo_divergencia, (counts.get(row.tipo_divergencia) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([tipo, quantidade]) => ({ nome: TIPO_DIVERGENCIA_LABEL[tipo] ?? tipo, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [data.divergencias]);

  /* ------------------------------ Insights ----------------------------- */

  const insights = useMemo<Insight[]>(() => {
    if (loading) {
      return [];
    }

    const list: Insight[] = [];

    if (!kpis.totalBens) {
      return [
        {
          tone: 'info',
          title: 'Sem bens no recorte selecionado',
          text: 'Cadastre bens patrimoniais ou ajuste o filtro de filial para que os indicadores sejam calculados.',
        },
      ];
    }

    const topLocal = [...data.local].sort((a, b) => b.valor_total - a.valor_total)[0];
    if (topLocal && data.local.length > 1) {
      const share = percent(topLocal.valor_total, kpis.valorAquisicao);
      if (share >= 50) {
        list.push({
          tone: 'warn',
          title: `${formatPercent(share)} do valor patrimonial em um único local`,
          text: `"${topLocal.local ?? 'Sem local'}" concentra ${formatCurrency(topLocal.valor_total)}. Avalie controles de acesso, seguro e prioridade de inventário nesse local.`,
        });
      }
    }

    if (kpis.bensSemLocal > 0) {
      list.push({
        tone: 'bad',
        title: `${formatNumber(kpis.bensSemLocal)} bem(ns) sem local definido`,
        text: 'Bens sem localização não podem ser inventariados nem rastreados. Atribua o local em Bens Patrimoniais.',
      });
    }

    if (kpis.bensSemResponsavel > 0) {
      list.push({
        tone: 'bad',
        title: `${formatNumber(kpis.bensSemResponsavel)} bem(ns) sem responsável`,
        text: 'Sem responsável não há termo de responsabilidade válido. Regularize em Movimentações > Responsáveis.',
      });
    }

    const topResp = data.responsavel
      .filter((row) => row.responsavel_id !== null)
      .sort((a, b) => b.valor_total - a.valor_total)[0];
    if (topResp && data.responsavel.length > 1) {
      const share = percent(topResp.valor_total, kpis.valorAquisicao);
      if (share >= 60) {
        list.push({
          tone: 'warn',
          title: `${topResp.responsavel} responde por ${formatPercent(share)} do valor`,
          text: 'Alta concentração de responsabilidade em uma pessoa aumenta o risco operacional. Considere redistribuir a custódia.',
        });
      }
    }

    if (data.depreciacao.length) {
      const quaseTotalmenteDepreciados = data.depreciacao.filter((row) => {
        const base = row.valor_contabil + row.valor_depreciado_acumulado;
        return base > 0 && row.valor_contabil / base <= 0.2;
      });
      if (quaseTotalmenteDepreciados.length) {
        list.push({
          tone: 'warn',
          title: `${quaseTotalmenteDepreciados.length} bem(ns) com menos de 20% de valor contábil`,
          text: 'Estão próximos do fim da vida útil contábil. Planeje substituição, reavaliação ou baixa patrimonial.',
        });
      }

      if (kpis.percentualDepreciado >= 50) {
        list.push({
          tone: 'info',
          title: `Parque ${formatPercent(kpis.percentualDepreciado)} depreciado`,
          text: `Valor contábil líquido de ${formatCurrency(kpis.valorContabil)} sobre ${formatCurrency(kpis.valorContabil + kpis.depreciacaoAcumulada)} de base depreciável.`,
        });
      }
    } else {
      list.push({
        tone: 'info',
        title: 'Nenhum cálculo de depreciação registrado',
        text: 'Execute o motor de depreciação para acompanhar o valor contábil dos bens neste painel.',
      });
    }

    const abertosSemCobertura = data.inventario.filter(
      (row) => row.status !== 'FINALIZADO' && row.total_itens > 0 && percent(row.total_bens_encontrados, row.total_itens) < 50,
    );
    if (abertosSemCobertura.length) {
      const [primeiro] = abertosSemCobertura;
      list.push({
        tone: 'warn',
        title: `${abertosSemCobertura.length} inventário(s) aberto(s) com menos de 50% de cobertura`,
        text: `Ex.: "${primeiro.nome}" — ${formatNumber(primeiro.total_bens_encontrados)} de ${formatNumber(primeiro.total_itens)} itens encontrados. Priorize a contagem em campo.`,
      });
    }

    if (kpis.totalDivergencias > 0) {
      const principal = divergenciaChart[0];
      list.push({
        tone: kpis.taxaDivergencia >= 10 ? 'bad' : 'warn',
        title: `${formatNumber(kpis.totalDivergencias)} divergência(s) — ${formatPercent(kpis.taxaDivergencia)} dos itens inventariados`,
        text: principal
          ? `Tipo predominante: ${principal.nome} (${principal.quantidade}). Trate em Inventário > Divergências antes de conciliar.`
          : 'Trate as divergências em Inventário > Divergências antes de conciliar.',
      });
    } else if (data.inventario.length) {
      list.push({
        tone: 'good',
        title: 'Nenhuma divergência registrada',
        text: 'Os inventários realizados não apontam diferenças entre o sistema e a contagem física.',
      });
    }

    if (!list.length) {
      list.push({
        tone: 'good',
        title: 'Base patrimonial consistente',
        text: 'Todos os bens têm local e responsável, e não há alertas de concentração, depreciação ou inventário.',
      });
    }

    return list;
  }, [data, divergenciaChart, kpis, loading]);

  /* ---------------------------- Exportações ---------------------------- */

  const exportParams = { filial_id: filialId || undefined };

  const backendExports: Record<ReportKey, Array<{ label: string; href: string }>> = {
    local: [
      { label: 'PDF', href: withQuery('/api/exportacoes/bens-por-local/pdf', exportParams) },
      { label: 'Excel', href: withQuery('/api/exportacoes/bens-por-local/excel', exportParams) },
      { label: 'CSV', href: withQuery('/api/exportacoes/bens-por-local/csv', exportParams) },
    ],
    responsavel: [{ label: 'PDF', href: withQuery('/api/exportacoes/bens-por-responsavel/pdf', exportParams) }],
    depreciacao: [{ label: 'PDF', href: '/api/exportacoes/depreciacao/pdf' }],
    inventario: [{ label: 'PDF', href: '/api/exportacoes/inventario/pdf' }],
    divergencias: [{ label: 'PDF', href: withQuery('/api/exportacoes/divergencias/pdf', { inventario_id: inventarioId || undefined }) }],
  };

  function exportCurrentTableCsv() {
    const stamp = new Date().toISOString().slice(0, 10);

    switch (tab) {
      case 'local':
        downloadCsv(
          `bens-por-local-${stamp}.csv`,
          ['Local', 'Código', 'Qtd. bens', 'Valor total', '% do valor'],
          data.local.map((row) => [row.local ?? 'Sem local', row.codigo_local ?? '', row.total_bens, row.valor_total.toFixed(2), percent(row.valor_total, kpis.valorAquisicao)]),
        );
        break;
      case 'responsavel':
        downloadCsv(
          `bens-por-responsavel-${stamp}.csv`,
          ['Responsável', 'Matrícula', 'Qtd. bens', 'Valor total', '% do valor'],
          data.responsavel.map((row) => [row.responsavel ?? 'Sem responsável', row.matricula ?? '', row.total_bens, row.valor_total.toFixed(2), percent(row.valor_total, kpis.valorAquisicao)]),
        );
        break;
      case 'depreciacao':
        downloadCsv(
          `depreciacao-${stamp}.csv`,
          ['Tombo', 'Descrição', 'Método', 'Taxa anual (%)', 'Depreciado acumulado', 'Valor contábil', '% depreciado', 'Data do cálculo'],
          data.depreciacao.map((row) => [
            row.numero_tombo ?? '',
            row.descricao ?? '',
            row.metodo ?? '',
            row.taxa_anual,
            row.valor_depreciado_acumulado.toFixed(2),
            row.valor_contabil.toFixed(2),
            percent(row.valor_depreciado_acumulado, row.valor_contabil + row.valor_depreciado_acumulado),
            row.data_calculo ?? '',
          ]),
        );
        break;
      case 'inventario':
        downloadCsv(
          `inventario-${stamp}.csv`,
          ['Inventário', 'Status', 'Início', 'Fim', 'Itens', 'Encontrados', 'Cobertura (%)', 'Divergências'],
          data.inventario.map((row) => [
            row.nome,
            STATUS_INVENTARIO_LABEL[row.status] ?? row.status,
            row.data_inicio ?? '',
            row.data_fim ?? '',
            row.total_itens,
            row.total_bens_encontrados,
            percent(row.total_bens_encontrados, row.total_itens),
            row.divergencias,
          ]),
        );
        break;
      default:
        downloadCsv(
          `divergencias-${stamp}.csv`,
          ['Inventário', 'Tombo', 'Bem', 'Tipo', 'Descrição'],
          data.divergencias.map((row) => [row.inventario ?? '', row.numero_tombo ?? '', row.descricao_bem ?? '', TIPO_DIVERGENCIA_LABEL[row.tipo_divergencia] ?? row.tipo_divergencia, row.descricao ?? '']),
        );
    }
  }

  /* ------------------------------- Render ------------------------------ */

  const filialNome = filiais.find((filial) => String(filial.id) === filialId)?.nome;
  const inventarioNome = inventarios.find((inventario) => String(inventario.id) === inventarioId)?.nome;

  async function downloadPdf() {
    setPdfBusy(true);
    setPdfError(null);

    try {
      const charts: BiPdfChart[] = [
        {
          title: 'Distribuição por local',
          subtitle: metric === 'quantidade' ? 'Quantidade de bens por local físico (top 8)' : 'Valor de aquisição por local físico (top 8)',
          node: chartNodes.current.local ?? null,
        },
        {
          title: 'Custódia por responsável',
          subtitle: metric === 'quantidade' ? 'Bens sob responsabilidade de cada pessoa' : 'Valor sob responsabilidade de cada pessoa',
          node: chartNodes.current.responsavel ?? null,
        },
        { title: 'Depreciação por bem', subtitle: 'Valor contábil x depreciação acumulada (10 maiores bases)', node: chartNodes.current.depreciacao ?? null },
        { title: 'Andamento dos inventários', subtitle: 'Itens previstos, encontrados e divergências', node: chartNodes.current.inventario ?? null },
        {
          title: 'Divergências por tipo',
          subtitle: inventarioNome ? `Inventário: ${inventarioNome}` : 'Todos os inventários da empresa',
          node: chartNodes.current.divergencias ?? null,
        },
      ];

      const tables: BiPdfTable[] = [
        {
          title: 'Bens por local',
          head: ['Local', 'Código', 'Qtd. bens', 'Valor total', '% do valor'],
          align: ['left', 'left', 'right', 'right', 'right'],
          body: data.local.map((row) => [
            row.local ?? 'Sem local',
            row.codigo_local ?? '-',
            formatNumber(row.total_bens),
            formatCurrency(row.valor_total),
            formatPercent(percent(row.valor_total, kpis.valorAquisicao)),
          ]),
        },
        {
          title: 'Bens por responsável',
          head: ['Responsável', 'Matrícula', 'Qtd. bens', 'Valor total', '% do valor'],
          align: ['left', 'left', 'right', 'right', 'right'],
          body: data.responsavel.map((row) => [
            row.responsavel ?? 'Sem responsável',
            row.matricula ?? '-',
            formatNumber(row.total_bens),
            formatCurrency(row.valor_total),
            formatPercent(percent(row.valor_total, kpis.valorAquisicao)),
          ]),
        },
        {
          title: 'Depreciação',
          head: ['Tombo', 'Descrição', 'Método', 'Taxa anual', 'Depreciado', 'Valor contábil', '% depreciado', 'Cálculo'],
          align: ['left', 'left', 'left', 'right', 'right', 'right', 'right', 'right'],
          body: data.depreciacao.map((row) => [
            row.numero_tombo ?? `#${row.bem_patrimonial_id}`,
            row.descricao ?? '',
            row.metodo ?? '-',
            formatPercent(row.taxa_anual),
            formatCurrency(row.valor_depreciado_acumulado),
            formatCurrency(row.valor_contabil),
            formatPercent(percent(row.valor_depreciado_acumulado, row.valor_contabil + row.valor_depreciado_acumulado)),
            formatDate(row.data_calculo),
          ]),
          emptyText: 'Nenhum cálculo de depreciação registrado.',
        },
        {
          title: 'Inventários',
          head: ['Inventário', 'Status', 'Início', 'Fim', 'Itens', 'Encontrados', 'Cobertura', 'Divergências'],
          align: ['left', 'left', 'left', 'left', 'right', 'right', 'right', 'right'],
          body: data.inventario.map((row) => [
            row.nome,
            STATUS_INVENTARIO_LABEL[row.status] ?? row.status,
            formatDate(row.data_inicio),
            formatDate(row.data_fim),
            formatNumber(row.total_itens),
            formatNumber(row.total_bens_encontrados),
            formatPercent(percent(row.total_bens_encontrados, row.total_itens)),
            formatNumber(row.divergencias),
          ]),
          emptyText: 'Nenhum inventário cadastrado.',
        },
        {
          title: 'Divergências',
          head: ['Inventário', 'Tombo', 'Bem', 'Tipo', 'Descrição'],
          body: data.divergencias.map((row) => [
            row.inventario ?? `#${row.inventario_id}`,
            row.numero_tombo ?? '-',
            row.descricao_bem ?? '',
            TIPO_DIVERGENCIA_LABEL[row.tipo_divergencia] ?? row.tipo_divergencia,
            row.descricao ?? '',
          ]),
          emptyText: 'Nenhuma divergência registrada - patrimônio conciliado.',
        },
      ];

      await generateBiReportPdf({
        empresaNome: empresaNome ?? 'Empresa ativa',
        empresaCnpj,
        filtros: [
          filialNome ? `Filial: ${filialNome}` : 'Todas as filiais',
          inventarioNome ? `Inventário: ${inventarioNome}` : 'Todos os inventários',
        ],
        geradoEm: new Date(),
        kpis: [
          { label: 'Bens patrimoniais', value: formatNumber(kpis.totalBens), hint: `${formatNumber(data.local.length)} local(is)` },
          { label: 'Valor de aquisição', value: formatCurrency(kpis.valorAquisicao), hint: 'Soma dos bens do recorte' },
          { label: 'Valor contábil líquido', value: formatCurrency(kpis.valorContabil), hint: `${formatPercent(kpis.percentualDepreciado)} depreciado` },
          { label: 'Depreciação acumulada', value: formatCurrency(kpis.depreciacaoAcumulada), hint: `${formatNumber(data.depreciacao.length)} cálculo(s)` },
          {
            label: 'Inventários abertos',
            value: `${formatNumber(kpis.inventariosAbertos)} / ${formatNumber(kpis.totalInventarios)}`,
            hint: `Cobertura ${formatPercent(kpis.coberturaInventario)}`,
          },
          { label: 'Divergências', value: formatNumber(kpis.totalDivergencias), hint: `${formatPercent(kpis.taxaDivergencia)} dos itens inventariados` },
        ],
        insights,
        charts,
        tables,
      });
    } catch (pdfFailure) {
      setPdfError(pdfFailure instanceof Error ? pdfFailure.message : 'Não foi possível gerar o PDF.');
    } finally {
      setPdfBusy(false);
    }
  }
  const metricLabel = metric === 'valor' ? 'Valor' : 'Quantidade';
  const formatMetric = (value: unknown) => (metric === 'valor' ? formatCurrency(Number(value)) : `${value} bens`);

  const localColumns: Array<Column<BensPorLocalRow & { key: string }>> = [
    { key: 'local', label: 'Local', render: (row) => <span className="font-semibold">{row.local ?? 'Sem local'}</span>, sortValue: (row) => row.local ?? '' },
    { key: 'codigo', label: 'Código', render: (row) => <span className="text-[var(--muted)]">{row.codigo_local ?? '—'}</span> },
    { key: 'qtd', label: 'Qtd. bens', align: 'right', render: (row) => formatNumber(row.total_bens), sortValue: (row) => row.total_bens },
    { key: 'valor', label: 'Valor total', align: 'right', render: (row) => formatCurrency(row.valor_total), sortValue: (row) => row.valor_total },
    { key: 'share', label: '% do valor', align: 'right', render: (row) => formatPercent(percent(row.valor_total, kpis.valorAquisicao)), sortValue: (row) => row.valor_total },
  ];

  const responsavelColumns: Array<Column<BensPorResponsavelRow & { key: string }>> = [
    { key: 'nome', label: 'Responsável', render: (row) => <span className="font-semibold">{row.responsavel ?? 'Sem responsável'}</span>, sortValue: (row) => row.responsavel ?? '' },
    { key: 'matricula', label: 'Matrícula', render: (row) => <span className="text-[var(--muted)]">{row.matricula ?? '—'}</span> },
    { key: 'qtd', label: 'Qtd. bens', align: 'right', render: (row) => formatNumber(row.total_bens), sortValue: (row) => row.total_bens },
    { key: 'valor', label: 'Valor total', align: 'right', render: (row) => formatCurrency(row.valor_total), sortValue: (row) => row.valor_total },
    { key: 'share', label: '% do valor', align: 'right', render: (row) => formatPercent(percent(row.valor_total, kpis.valorAquisicao)), sortValue: (row) => row.valor_total },
  ];

  const depreciacaoColumns: Array<Column<DepreciacaoRow & { key: number }>> = [
    {
      key: 'bem',
      label: 'Bem',
      render: (row) => (
        <span>
          <span className="font-semibold">{row.numero_tombo ?? `#${row.bem_patrimonial_id}`}</span>
          <span className="block text-[12px] text-[var(--muted)]">{row.descricao ?? ''}</span>
        </span>
      ),
      sortValue: (row) => row.numero_tombo ?? '',
    },
    { key: 'metodo', label: 'Método', render: (row) => row.metodo ?? '—' },
    { key: 'taxa', label: 'Taxa anual', align: 'right', render: (row) => formatPercent(row.taxa_anual), sortValue: (row) => row.taxa_anual },
    { key: 'acum', label: 'Depreciado', align: 'right', render: (row) => formatCurrency(row.valor_depreciado_acumulado), sortValue: (row) => row.valor_depreciado_acumulado },
    { key: 'contabil', label: 'Valor contábil', align: 'right', render: (row) => formatCurrency(row.valor_contabil), sortValue: (row) => row.valor_contabil },
    {
      key: 'pct',
      label: '% depreciado',
      align: 'right',
      render: (row) => formatPercent(percent(row.valor_depreciado_acumulado, row.valor_contabil + row.valor_depreciado_acumulado)),
      sortValue: (row) => percent(row.valor_depreciado_acumulado, row.valor_contabil + row.valor_depreciado_acumulado),
    },
    { key: 'data', label: 'Cálculo', align: 'right', render: (row) => formatDate(row.data_calculo), sortValue: (row) => row.data_calculo ?? '' },
  ];

  const inventarioColumns: Array<Column<InventarioRow & { key: number }>> = [
    { key: 'nome', label: 'Inventário', render: (row) => <span className="font-semibold">{row.nome}</span>, sortValue: (row) => row.nome },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} />, sortValue: (row) => row.status },
    { key: 'periodo', label: 'Período', render: (row) => `${formatDate(row.data_inicio)} → ${formatDate(row.data_fim)}`, sortValue: (row) => row.data_inicio ?? '' },
    { key: 'itens', label: 'Itens', align: 'right', render: (row) => formatNumber(row.total_itens), sortValue: (row) => row.total_itens },
    { key: 'enc', label: 'Encontrados', align: 'right', render: (row) => formatNumber(row.total_bens_encontrados), sortValue: (row) => row.total_bens_encontrados },
    {
      key: 'cob',
      label: 'Cobertura',
      align: 'right',
      render: (row) => formatPercent(percent(row.total_bens_encontrados, row.total_itens)),
      sortValue: (row) => percent(row.total_bens_encontrados, row.total_itens),
    },
    {
      key: 'div',
      label: 'Divergências',
      align: 'right',
      render: (row) => <span className={row.divergencias ? 'font-semibold text-[var(--rose)]' : ''}>{formatNumber(row.divergencias)}</span>,
      sortValue: (row) => row.divergencias,
    },
  ];

  const divergenciaColumns: Array<Column<DivergenciaRow & { key: number }>> = [
    { key: 'inv', label: 'Inventário', render: (row) => row.inventario ?? `#${row.inventario_id}`, sortValue: (row) => row.inventario ?? '' },
    {
      key: 'bem',
      label: 'Bem',
      render: (row) => (
        <span>
          <span className="font-semibold">{row.numero_tombo ?? '—'}</span>
          <span className="block text-[12px] text-[var(--muted)]">{row.descricao_bem ?? ''}</span>
        </span>
      ),
      sortValue: (row) => row.numero_tombo ?? '',
    },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (row) => (
        <span className="inline-flex rounded-full bg-[rgba(225,29,72,0.1)] px-2 py-0.5 text-[11px] font-semibold text-[var(--rose)]">
          {TIPO_DIVERGENCIA_LABEL[row.tipo_divergencia] ?? row.tipo_divergencia}
        </span>
      ),
      sortValue: (row) => row.tipo_divergencia,
    },
    { key: 'desc', label: 'Descrição', render: (row) => <span className="text-[var(--muted)]">{row.descricao ?? '—'}</span> },
  ];

  return (
    <div className="bi-report space-y-4">
      {/* Cabeçalho + filtros */}
      <section className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Relatórios · BI patrimonial</p>
            <h2 className="mt-1.5 text-[1.35rem] font-semibold tracking-[-0.045em] text-[var(--ink)] md:text-[1.65rem]">
              Painel analítico do patrimônio
            </h2>
            <p className="mt-2 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
              Indicadores, gráficos e alertas calculados sobre os relatórios da API, com exportação em PDF, Excel e CSV para apoiar a tomada de decisão.
            </p>
            <p className="mt-1 text-[11px] text-[var(--muted)]">
              {updatedAt ? `Atualizado às ${updatedAt.toLocaleTimeString('pt-BR')}` : 'Carregando dados...'}
              {filialNome ? ` · Filial: ${filialNome}` : ' · Todas as filiais'}
              {inventarioNome ? ` · Inventário: ${inventarioNome}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button type="button" onClick={() => void loadReports()} className={SECONDARY_ACTION} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
            <button type="button" onClick={() => window.print()} className={SECONDARY_ACTION}>
              Imprimir
            </button>
            <button type="button" onClick={() => void downloadPdf()} className={PRIMARY_ACTION} disabled={loading || pdfBusy}>
              {pdfBusy ? 'Gerando PDF...' : 'Baixar PDF do relatório BI'}
            </button>
          </div>
        </div>

        {pdfError ? (
          <p className="mt-3 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-2.5 text-[13px] text-[var(--rose)] print:hidden">
            {pdfError}
          </p>
        ) : null}

        <div className="mt-4 grid gap-3 rounded-[18px] border border-[var(--line)] bg-[#fafafa] p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] print:hidden">
          <label className="admin-field">
            Filial (bens por local / responsável)
            <select className="admin-select" value={filialId} onChange={(event) => setFilialId(event.target.value)}>
              <option value="">Todas as filiais</option>
              {filiais.map((filial) => (
                <option key={filial.id} value={filial.id}>
                  {filial.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            Inventário (divergências)
            <select className="admin-select" value={inventarioId} onChange={(event) => setInventarioId(event.target.value)}>
              <option value="">Todos os inventários</option>
              {inventarios.map((inventario) => (
                <option key={inventario.id} value={inventario.id}>
                  {inventario.nome}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setFilialId('');
                setInventarioId('');
              }}
              className="admin-btn-secondary w-full disabled:opacity-50 sm:w-auto"
              disabled={!filialId && !inventarioId}
            >
              Limpar filtros
            </button>
          </div>
        </div>

        {friendlyError ? (
          <div className="mt-4 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
            <p className="font-semibold">{friendlyError.title}</p>
            <p className="mt-0.5">{friendlyError.text}</p>
          </div>
        ) : null}
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6" aria-busy={loading}>
        <KpiTile label="Bens patrimoniais" value={formatNumber(kpis.totalBens)} hint={`${formatNumber(data.local.length)} local(is)`} tone="accent" />
        <KpiTile label="Valor de aquisição" value={formatCurrency(kpis.valorAquisicao)} hint="Soma dos bens do recorte" tone="mint" />
        <KpiTile label="Valor contábil líquido" value={formatCurrency(kpis.valorContabil)} hint={`${formatPercent(kpis.percentualDepreciado)} depreciado`} tone="blue" />
        <KpiTile label="Depreciação acumulada" value={formatCurrency(kpis.depreciacaoAcumulada)} hint={`${formatNumber(data.depreciacao.length)} cálculo(s)`} />
        <KpiTile
          label="Inventários abertos"
          value={`${formatNumber(kpis.inventariosAbertos)} / ${formatNumber(kpis.totalInventarios)}`}
          hint={`Cobertura ${formatPercent(kpis.coberturaInventario)}`}
          tone={kpis.inventariosAbertos ? 'accent' : 'neutral'}
        />
        <KpiTile
          label="Divergências"
          value={formatNumber(kpis.totalDivergencias)}
          hint={`${formatPercent(kpis.taxaDivergencia)} dos itens`}
          tone={kpis.totalDivergencias ? 'rose' : 'mint'}
        />
      </section>

      {/* Distribuição por local + insights */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <ChartCard
          title="Distribuição por local"
          subtitle={metric === 'quantidade' ? 'Quantidade de bens por local físico (top 8)' : 'Valor de aquisição por local físico (top 8)'}
          action={<MetricToggle value={metric} onChange={setMetric} />}
        >
          {localChart.length ? (
            <div className="h-[280px]" ref={chartRef('local')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={localChart} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(17,24,39,0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#70757f', fontSize: 11 }}
                    tickFormatter={(value) => (metric === 'valor' ? formatCurrency(Number(value)) : String(value))}
                  />
                  <YAxis type="category" dataKey="nome" width={120} tickLine={false} axisLine={false} tick={{ fill: '#3d4450', fontSize: 12 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatMetric(value), metricLabel]} />
                  <Bar isAnimationActive={false} dataKey={metric} radius={[0, 8, 8, 0]} maxBarSize={26}>
                    {localChart.map((entry, index) => (
                      <Cell key={entry.nome} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text={loading ? 'Carregando...' : 'Nenhum bem encontrado para o recorte.'} />
          )}
        </ChartCard>

        <ChartCard title="Alertas e recomendações" subtitle="Leitura automática dos indicadores para apoiar decisões">
          {insights.length ? (
            <ul className="space-y-2">
              {insights.map((insight) => (
                <InsightCard key={insight.title} insight={insight} />
              ))}
            </ul>
          ) : (
            <EmptyChart text="Analisando indicadores..." />
          )}
        </ChartCard>
      </section>

      {/* Responsáveis + depreciação */}
      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Custódia por responsável"
          subtitle={metric === 'quantidade' ? 'Bens sob responsabilidade de cada pessoa' : 'Valor sob responsabilidade de cada pessoa'}
          action={<MetricToggle value={metric} onChange={setMetric} />}
        >
          {responsavelChart.length ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]" ref={chartRef('responsavel')}>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie isAnimationActive={false} data={responsavelChart} dataKey={metric} nameKey="nome" innerRadius={58} outerRadius={96} paddingAngle={3}>
                      {responsavelChart.map((entry, index) => (
                        <Cell key={entry.nome} fill={PALETTE[index % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [formatMetric(value), metricLabel]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <LegendList items={responsavelChart.map((entry) => ({ nome: entry.nome, valor: entry[metric] }))} colors={PALETTE} />
            </div>
          ) : (
            <EmptyChart text={loading ? 'Carregando...' : 'Nenhum responsável com bens vinculados.'} />
          )}
        </ChartCard>

        <ChartCard title="Depreciação por bem" subtitle="Valor contábil × depreciação acumulada (10 maiores bases)">
          {depreciacaoChart.length ? (
            <div className="h-[240px]" ref={chartRef('depreciacao')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={depreciacaoChart} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(17,24,39,0.08)" vertical={false} />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} tick={{ fill: '#70757f', fontSize: 11 }} interval={0} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#70757f', fontSize: 11 }} tickFormatter={(value) => formatCurrency(Number(value))} width={90} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value, name) => [formatCurrency(Number(value)), name === 'contabil' ? 'Valor contábil' : 'Depreciado']}
                    labelFormatter={(label, payload) => {
                      const descricao = (payload?.[0]?.payload as { descricao?: string } | undefined)?.descricao;
                      return descricao ? `${label} · ${descricao}` : String(label);
                    }}
                  />
                  <Legend formatter={(value) => (value === 'contabil' ? 'Valor contábil' : 'Depreciação acumulada')} wrapperStyle={{ fontSize: 12 }} />
                  <Bar isAnimationActive={false} dataKey="contabil" stackId="a" fill="#374151" maxBarSize={36} />
                  <Bar isAnimationActive={false} dataKey="depreciado" stackId="a" fill="#f6a400" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text={loading ? 'Carregando...' : 'Nenhum cálculo de depreciação registrado.'} />
          )}
        </ChartCard>
      </section>

      {/* Inventário + divergências */}
      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Andamento dos inventários" subtitle="Itens previstos, encontrados e divergências por inventário">
          {inventarioChart.length ? (
            <div className="h-[240px]" ref={chartRef('inventario')}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventarioChart} margin={{ left: 0, right: 8, top: 8, bottom: 4 }}>
                  <CartesianGrid stroke="rgba(17,24,39,0.08)" vertical={false} />
                  <XAxis dataKey="nome" tickLine={false} axisLine={false} tick={{ fill: '#70757f', fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#70757f', fontSize: 11 }} allowDecimals={false} width={36} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, INVENTARIO_SERIES_LABEL[String(name)] ?? name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={(value) => INVENTARIO_SERIES_LABEL[String(value)] ?? value} />
                  <Bar isAnimationActive={false} dataKey="itens" fill="#9ca3af" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  <Bar isAnimationActive={false} dataKey="encontrados" fill="#4ade80" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  <Bar isAnimationActive={false} dataKey="divergencias" fill="#e11d48" radius={[6, 6, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart text={loading ? 'Carregando...' : 'Nenhum inventário cadastrado.'} />
          )}
        </ChartCard>

        <ChartCard title="Divergências por tipo" subtitle={inventarioNome ? `Inventário: ${inventarioNome}` : 'Todos os inventários da empresa'}>
          {divergenciaChart.length ? (
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]" ref={chartRef('divergencias')}>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie isAnimationActive={false} data={divergenciaChart} dataKey="quantidade" nameKey="nome" innerRadius={58} outerRadius={96} paddingAngle={3}>
                      {divergenciaChart.map((entry, index) => (
                        <Cell key={entry.nome} fill={DIVERGENCIA_PALETTE[index % DIVERGENCIA_PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${value} ocorrência(s)`, 'Quantidade']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <LegendList items={divergenciaChart.map((entry) => ({ nome: entry.nome, valor: entry.quantidade }))} colors={DIVERGENCIA_PALETTE} />
            </div>
          ) : (
            <EmptyChart text={loading ? 'Carregando...' : 'Nenhuma divergência registrada — patrimônio conciliado.'} />
          )}
        </ChartCard>
      </section>

      {/* Detalhamento */}
      <section className="panel-surface overflow-hidden rounded-[22px] md:rounded-[28px]">
        <div className="flex flex-col gap-3 border-b border-[var(--line)] p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Detalhamento</p>
            <h3 className="mt-1 text-[16px] font-semibold tracking-[-0.02em] text-[var(--ink)]">Dados analíticos do relatório</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Exportar</span>
            {backendExports[tab].map((item) => (
              <a key={item.label} href={item.href} className={SECONDARY_ACTION}>
                {item.label}
              </a>
            ))}
            <button type="button" onClick={exportCurrentTableCsv} className={SECONDARY_ACTION} disabled={!data[tab].length}>
              CSV desta tabela
            </button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--line)] px-3 pt-2 print:hidden">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              aria-pressed={tab === item.key}
              className={[
                'whitespace-nowrap rounded-t-[12px] border-b-2 px-3.5 py-2.5 text-[13px] font-semibold transition',
                tab === item.key ? 'border-[var(--accent)] text-[var(--ink)]' : 'border-transparent text-[var(--muted)] hover:text-[var(--ink)]',
              ].join(' ')}
            >
              {item.label}
              <span className="ml-1.5 rounded-full bg-[rgba(17,24,39,0.06)] px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--muted)]">
                {data[item.key].length}
              </span>
            </button>
          ))}
        </div>

        {tab === 'local' ? (
          <SortableTable rows={data.local.map((row) => ({ ...row, key: String(row.local_id ?? 'null') }))} columns={localColumns} emptyText="Nenhum bem no recorte selecionado." />
        ) : null}
        {tab === 'responsavel' ? (
          <SortableTable rows={data.responsavel.map((row) => ({ ...row, key: String(row.responsavel_id ?? 'null') }))} columns={responsavelColumns} emptyText="Nenhum bem no recorte selecionado." />
        ) : null}
        {tab === 'depreciacao' ? (
          <SortableTable rows={data.depreciacao.map((row) => ({ ...row, key: row.id }))} columns={depreciacaoColumns} emptyText="Nenhum cálculo de depreciação registrado." />
        ) : null}
        {tab === 'inventario' ? (
          <SortableTable rows={data.inventario.map((row) => ({ ...row, key: row.id }))} columns={inventarioColumns} emptyText="Nenhum inventário cadastrado." />
        ) : null}
        {tab === 'divergencias' ? (
          <SortableTable rows={data.divergencias.map((row) => ({ ...row, key: row.id }))} columns={divergenciaColumns} emptyText="Nenhuma divergência registrada." />
        ) : null}
      </section>
    </div>
  );
}
