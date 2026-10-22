'use client';

import { useCallback, useEffect, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

/**
 * CIAP de um bem: crédito de ICMS apropriado em 48 meses (Bloco G).
 *
 * Só aparece preenchido para contribuinte de ICMS. Entidade sem operação de
 * ICMS (imune, por exemplo) simplesmente não informa crédito e o controle
 * fica vazio.
 */

type Parcela = {
  parcela: number;
  mes: string;
  fator: number;
  valor_apropriado: number;
  acumulado: number;
  saldo: number;
};

type Cronograma = {
  tem_credito: boolean;
  valor_credito_icms: number;
  parcela_mensal?: number;
  total_apropriado?: number;
  parcelas: Parcela[];
};

function moeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export default function CiapBem({ bemId }: { bemId: number }) {
  const [dados, setDados] = useState<Cronograma | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarTudo, setMostrarTudo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/admin/bens/${bemId}/ciap`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const c = (await r.json().catch(() => null)) as { data?: Cronograma; message?: string } | null;
      if (handleUnauthorizedClientResponse(r.status, c?.message)) return;
      if (r.ok && c?.data) {
        setDados(c.data);
        setValor(c.data.valor_credito_icms ? String(c.data.valor_credito_icms) : '');
      }
    } catch {
      // apoio
    } finally {
      setCarregando(false);
    }
  }, [bemId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/admin/bens/${bemId}/ciap`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          valor_credito_icms: valor ? Number(valor.replace(',', '.')) : null,
          data_credito_icms: data || null,
        }),
      });
      const c = (await r.json().catch(() => null)) as { message?: string } | null;
      if (handleUnauthorizedClientResponse(r.status, c?.message)) return;
      if (!r.ok) throw new Error(c?.message ?? 'Não foi possível salvar.');
      setEditando(false);
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  const parcelas = dados?.parcelas ?? [];
  const visiveis = mostrarTudo ? parcelas : parcelas.slice(0, 12);

  return (
    <article className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Fiscal · ICMS</p>
          <h3 className="mt-1.5 text-lg font-semibold text-[var(--ink)]">CIAP — crédito de ICMS do ativo</h3>
          <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">
            Para contribuinte de ICMS: o imposto pago na compra é creditado em 48 parcelas (Bloco G). Entidade sem
            operação de ICMS não preenche.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditando((v) => !v)}
          className="inline-flex h-9 shrink-0 items-center rounded-full border border-[var(--line)] bg-[var(--nc-card)] px-4 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
        >
          {editando ? 'Fechar' : dados?.tem_credito ? 'Editar crédito' : 'Informar crédito'}
        </button>
      </div>

      {editando ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--nc-surface-elevated)] p-4 sm:grid-cols-2">
          <label className="admin-field">
            Crédito de ICMS (R$)
            <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00 (vazio = sem crédito)" className="admin-input" />
          </label>
          <label className="admin-field">
            Mês inicial do crédito
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="admin-input" />
            <span className="text-[11px] text-[var(--muted)]">Em branco, usa a data de aquisição.</span>
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      ) : null}

      {erro ? <p className="mt-3 text-[13px] font-medium text-[var(--rose)]">{erro}</p> : null}

      {!carregando && !dados?.tem_credito && !editando ? (
        <p className="mt-4 text-[13px] text-[var(--muted)]">Nenhum crédito de ICMS informado para este bem.</p>
      ) : null}

      {!carregando && dados?.tem_credito ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--nc-surface-elevated)] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Crédito total</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">{moeda(dados.valor_credito_icms)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--nc-surface-elevated)] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Parcela base (1/48)</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">{moeda(dados.parcela_mensal ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--nc-surface-elevated)] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Apropriado</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">{moeda(dados.total_apropriado ?? 0)}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[460px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="py-2 pr-3">Parcela</th>
                  <th className="py-2 pr-3">Mês</th>
                  <th className="py-2 pr-3 text-right">Fator</th>
                  <th className="py-2 pr-3 text-right">Apropriado</th>
                  <th className="py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr key={p.parcela} className="border-b border-[var(--line)] last:border-0">
                    <td className="py-2 pr-3 text-[var(--muted)]">{p.parcela}/48</td>
                    <td className="py-2 pr-3 font-medium text-[var(--ink)]">{p.mes}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-[var(--muted)]">{p.fator.toFixed(4)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-[var(--ink)]">{moeda(p.valor_apropriado)}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--muted)]">{moeda(p.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parcelas.length > 12 ? (
            <button
              type="button"
              onClick={() => setMostrarTudo((v) => !v)}
              className="mt-3 inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-[var(--nc-card)] px-4 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]"
            >
              {mostrarTudo ? 'Mostrar só 12 meses' : 'Ver as 48 parcelas'}
            </button>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
