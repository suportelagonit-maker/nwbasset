'use client';

import { useCallback, useEffect, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

/**
 * Eventos de valor de um bem: acréscimo, reavaliação, impairment e baixa
 * parcial. Cada um recalcula a depreciação a partir da competência.
 */

type Evento = {
  id: number;
  tipo: string;
  rotulo: string;
  competencia: string | null;
  mes: string | null;
  valor: number;
  nova_vida_util_meses: number | null;
  descricao: string | null;
};

const TIPOS = [
  { valor: 'ACRESCIMO', rotulo: 'Acréscimo / benfeitoria', ajuda: 'Valor acrescido ao bem.' },
  { valor: 'REAVALIACAO', rotulo: 'Reavaliação', ajuda: 'O novo valor contábil do bem na data.' },
  { valor: 'IMPAIRMENT', rotulo: 'Impairment (perda ao recuperável)', ajuda: 'Quanto reduzir do valor.' },
  { valor: 'BAIXA_PARCIAL', rotulo: 'Baixa parcial', ajuda: 'Quanto do valor contábil sai (parte do bem).' },
];

function moeda(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function mesAtual() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}`;
}

export default function EventosValorBem({ bemId, onMudou }: { bemId: number; onMudou?: () => void }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abrindo, setAbrindo] = useState(false);
  const [tipo, setTipo] = useState('ACRESCIMO');
  const [competencia, setCompetencia] = useState(mesAtual);
  const [valor, setValor] = useState('');
  const [novaVidaAnos, setNovaVidaAnos] = useState('');
  const [descricao, setDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch(`/api/admin/bens/${bemId}/eventos-valor`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const c = (await r.json().catch(() => null)) as { data?: Evento[]; message?: string } | null;
      if (handleUnauthorizedClientResponse(r.status, c?.message)) return;
      if (r.ok) setEventos(c?.data ?? []);
    } catch {
      // silencioso: a lista é apoio
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
    setRecado(null);
    try {
      const r = await fetch(`/api/admin/bens/${bemId}/eventos-valor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          tipo,
          competencia: `${competencia}-01`,
          valor: Number(valor.replace(',', '.')),
          nova_vida_util_meses: novaVidaAnos ? Number(novaVidaAnos) * 12 : null,
          descricao: descricao || null,
        }),
      });
      const c = (await r.json().catch(() => null)) as { message?: string; errors?: Record<string, string[]> } | null;
      if (handleUnauthorizedClientResponse(r.status, c?.message)) return;
      if (!r.ok) {
        const primeiro = c?.errors ? Object.values(c.errors)[0]?.[0] : null;
        throw new Error(primeiro ?? c?.message ?? 'Não foi possível registrar o evento.');
      }
      setRecado(c?.message ?? 'Evento registrado.');
      setValor('');
      setNovaVidaAnos('');
      setDescricao('');
      setAbrindo(false);
      await carregar();
      onMudou?.();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível registrar o evento.');
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id: number) {
    if (!window.confirm('Remover este evento? A depreciação volta ao cálculo sem ele.')) return;
    try {
      const r = await fetch(`/api/admin/bens/${bemId}/eventos-valor/${id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });
      const c = (await r.json().catch(() => null)) as { message?: string } | null;
      if (handleUnauthorizedClientResponse(r.status, c?.message)) return;
      if (r.ok) {
        await carregar();
        onMudou?.();
      }
    } catch {
      setErro('Não foi possível remover o evento.');
    }
  }

  const tipoAtual = TIPOS.find((t) => t.valor === tipo);

  return (
    <article className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Valor do bem</p>
          <h3 className="mt-1.5 text-lg font-semibold text-[var(--ink)]">Eventos de valor</h3>
          <p className="mt-1 text-[13px] leading-5 text-[var(--muted)]">
            Benfeitoria, reavaliação, impairment ou baixa parcial. Cada um recalcula a depreciação a partir da
            competência.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAbrindo((v) => !v)}
          className="inline-flex h-9 shrink-0 items-center rounded-full bg-[var(--accent)] px-4 text-[12px] font-semibold text-white transition hover:opacity-90"
        >
          {abrindo ? 'Fechar' : '+ Registrar evento'}
        </button>
      </div>

      {abrindo ? (
        <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--line)] bg-[#fafafa] p-4 sm:grid-cols-2">
          <label className="admin-field">
            Tipo
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="admin-input">
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>{t.rotulo}</option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            Competência
            <input type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} className="admin-input" />
          </label>
          <label className="admin-field">
            Valor (R$)
            <input type="text" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" className="admin-input" />
            <span className="text-[11px] text-[var(--muted)]">{tipoAtual?.ajuda}</span>
          </label>
          <label className="admin-field">
            Nova vida útil (anos, opcional)
            <input type="number" min={1} value={novaVidaAnos} onChange={(e) => setNovaVidaAnos(e.target.value)} placeholder="manter a atual" className="admin-input" />
          </label>
          <label className="admin-field sm:col-span-2">
            Descrição (opcional)
            <input type="text" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="admin-input" />
          </label>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={salvando || !valor}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {salvando ? 'Salvando…' : 'Registrar'}
            </button>
          </div>
        </div>
      ) : null}

      {recado ? <p className="mt-3 text-[13px] font-medium text-[#15803d]">{recado}</p> : null}
      {erro ? <p className="mt-3 text-[13px] font-medium text-[var(--rose)]">{erro}</p> : null}

      {!carregando && eventos.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {eventos.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  {e.rotulo} · {moeda(e.valor)}
                </p>
                <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                  {e.mes}
                  {e.nova_vida_util_meses ? ` · nova vida ${Math.round(e.nova_vida_util_meses / 12)} anos` : ''}
                  {e.descricao ? ` · ${e.descricao}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remover(e.id)}
                className="inline-flex h-8 items-center rounded-full border border-[var(--line)] bg-white px-3 text-[12px] font-semibold text-[var(--rose)] transition hover:border-[var(--rose)]"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {!carregando && eventos.length === 0 && !abrindo ? (
        <p className="mt-4 text-[13px] text-[var(--muted)]">Nenhum evento de valor registrado.</p>
      ) : null}
    </article>
  );
}
