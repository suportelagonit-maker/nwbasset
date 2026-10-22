'use client';

import { useCallback, useEffect, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

/**
 * Trilha de auditoria: a linha do tempo do que aconteceu na empresa.
 *
 * O sistema já registrava tudo (acessos em `auditoria_eventos`, operações
 * no patrimônio em `logs_operacoes_patrimoniais`), mas não havia onde olhar.
 * Esta tela junta as duas fontes num feed filtrável — é o que um auditor
 * pede primeiro.
 */

type Linha = {
  fonte: 'acesso' | 'operacao';
  id: number;
  evento: string;
  rotulo: string;
  entidade: string | null;
  entidade_id: number | null;
  descricao: string | null;
  ip: string | null;
  usuario: { id: number; nome: string | null; email: string | null } | null;
  em: string;
};

type Meta = { pagina: number; por_pagina: number; total: number; ultima_pagina: number };

const FONTES = [
  { valor: '', rotulo: 'Tudo' },
  { valor: 'acesso', rotulo: 'Acessos' },
  { valor: 'operacao', rotulo: 'Operações no patrimônio' },
];

function formatar(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TrilhaAuditoria() {
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [fonte, setFonte] = useState('');
  const [busca, setBusca] = useState('');
  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [pagina, setPagina] = useState(1);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const params = new URLSearchParams({ pagina: String(pagina), per_page: '20' });
    if (fonte) params.set('fonte', fonte);
    if (busca.trim()) params.set('busca', busca.trim());
    if (dataInicial) params.set('data_inicial', dataInicial);
    if (dataFinal) params.set('data_final', dataFinal);

    try {
      const resposta = await fetch(`/api/admin/trilha-auditoria?${params.toString()}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const corpo = (await resposta.json().catch(() => null)) as { data?: Linha[]; meta?: Meta; message?: string } | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (resposta.status === 403) {
        throw new Error('Seu perfil não tem permissão para ver a trilha de auditoria.');
      }

      if (!resposta.ok) {
        throw new Error(corpo?.message ?? 'Não foi possível carregar a trilha.');
      }

      setLinhas(corpo?.data ?? []);
      setMeta(corpo?.meta ?? null);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar a trilha.');
    } finally {
      setCarregando(false);
    }
  }, [busca, dataFinal, dataInicial, fonte, pagina]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function aplicarFiltro(acao: () => void) {
    setPagina(1);
    acao();
  }

  return (
    <section className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Auditoria</p>
          <h2 className="mt-1.5 text-[1.45rem] font-semibold tracking-[-0.04em] text-[var(--ink)]">Trilha de eventos</h2>
          <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
            Quem entrou, quem mexeu no quê e quando. Junta os acessos e as operações no patrimônio numa linha do
            tempo só.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="admin-field">
          Tipo
          <select value={fonte} onChange={(e) => aplicarFiltro(() => setFonte(e.target.value))} className="admin-input">
            {FONTES.map((f) => (
              <option key={f.valor} value={f.valor}>{f.rotulo}</option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          De
          <input type="date" value={dataInicial} onChange={(e) => aplicarFiltro(() => setDataInicial(e.target.value))} className="admin-input" />
        </label>
        <label className="admin-field">
          Até
          <input type="date" value={dataFinal} onChange={(e) => aplicarFiltro(() => setDataFinal(e.target.value))} className="admin-input" />
        </label>
        <form
          className="admin-field"
          onSubmit={(e) => {
            e.preventDefault();
            aplicarFiltro(() => undefined);
            void carregar();
          }}
        >
          Buscar
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="evento ou descrição" className="admin-input" />
        </form>
      </div>

      {erro ? <p className="mt-4 text-[13px] font-medium text-[var(--rose)]">{erro}</p> : null}
      {carregando ? <p className="mt-4 text-sm text-[var(--muted)]">Carregando…</p> : null}

      {!carregando && !erro ? (
        <>
          <div className="mt-5 grid gap-2">
            {linhas.length === 0 ? (
              <p className="rounded-2xl border border-[var(--line)] bg-[var(--nc-surface-elevated)] px-4 py-6 text-center text-sm text-[var(--muted)]">
                Nenhum evento no período.
              </p>
            ) : null}
            {linhas.map((linha) => (
              <div
                key={`${linha.fonte}-${linha.id}`}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--nc-surface-elevated)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[var(--ink)]">{linha.rotulo}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        linha.fonte === 'acesso'
                          ? 'bg-[rgba(37,99,235,0.1)] text-[var(--blue)]'
                          : 'bg-[rgba(var(--accent-rgb),0.16)] text-[var(--accent-deep)]'
                      }`}
                    >
                      {linha.fonte === 'acesso' ? 'Acesso' : 'Patrimônio'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] leading-5 text-[var(--muted)]">
                    {linha.descricao
                      ?? [linha.entidade, linha.entidade_id ? `#${linha.entidade_id}` : null].filter(Boolean).join(' ')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    {linha.usuario?.nome ?? 'Sistema'}
                    {linha.usuario?.email ? ` · ${linha.usuario.email}` : ''}
                    {linha.ip ? ` · IP ${linha.ip}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-[12px] font-medium text-[var(--muted)]">{formatar(linha.em)}</span>
              </div>
            ))}
          </div>

          {meta && meta.ultima_pagina > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-[12px] text-[var(--muted)]">
                Página {meta.pagina} de {meta.ultima_pagina} · {meta.total} eventos
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={meta.pagina <= 1}
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  className="inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-[var(--nc-card)] px-4 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  disabled={meta.pagina >= meta.ultima_pagina}
                  onClick={() => setPagina((p) => p + 1)}
                  className="inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-[var(--nc-card)] px-4 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] disabled:opacity-50"
                >
                  Próxima
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
