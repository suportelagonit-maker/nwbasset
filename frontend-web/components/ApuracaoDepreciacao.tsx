'use client';

import { useCallback, useEffect, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

/**
 * Apuração mensal da depreciação: calcular a competência, fechar o mês e
 * reabrir quando preciso.
 *
 * O fechamento é o que dá confiança ao número: mês fechado não é
 * recalculado, mesmo que alguém mude uma taxa depois. Mês aberto sempre
 * reflete a regra vigente.
 */

type Fechamento = {
  id: number;
  base_regra: string;
  competencia: string;
  bens_processados: number;
  valor_total: string | number;
  fechado_em: string | null;
  reaberto_em: string | null;
  motivo_reabertura: string | null;
};

const BASES = [
  { valor: 'fiscal', rotulo: 'Fiscal (IN RFB 1.700/2017)' },
  { valor: 'contabil', rotulo: 'Societária (CPC 27)' },
];

function competenciaAtual() {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

function formatarCompetencia(iso: string) {
  const [ano, mes] = iso.slice(0, 7).split('-');
  return `${mes}/${ano}`;
}

export default function ApuracaoDepreciacao({ empresaId }: { empresaId: number | null }) {
  const [competencia, setCompetencia] = useState(competenciaAtual);
  const [base, setBase] = useState('fiscal');
  const [fechamentos, setFechamentos] = useState<Fechamento[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [recado, setRecado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/depreciacao/fechamentos', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const corpo = (await resposta.json().catch(() => null)) as { data?: Fechamento[]; message?: string } | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (resposta.ok) {
        setFechamentos(corpo?.data ?? []);
      }
    } catch {
      // A lista é apoio: falhar aqui não pode travar a apuração.
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar, empresaId]);

  async function chamar(caminho: string, corpoEnvio: Record<string, unknown>) {
    setOcupado(true);
    setErro(null);
    setRecado(null);

    try {
      const resposta = await fetch(`/api/admin/depreciacao/${caminho}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(corpoEnvio),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        | { message?: string; data?: Record<string, unknown>; errors?: Record<string, string[]> }
        | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return null;
      }

      if (!resposta.ok) {
        const primeiro = corpo?.errors ? Object.values(corpo.errors)[0]?.[0] : null;
        throw new Error(primeiro ?? corpo?.message ?? `Falha na operação: ${resposta.status}`);
      }

      setRecado(corpo?.message ?? 'Operação concluída.');
      await carregar();

      return corpo?.data ?? null;
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível concluir a operação.');
      return null;
    } finally {
      setOcupado(false);
    }
  }

  async function apurar() {
    const dados = await chamar('processar', { competencia: `${competencia}-01`, base_regra: base });

    if (dados) {
      const meses = Number(dados.competencias_processadas ?? 0);
      const total = Number(dados.valor_total ?? 0);
      setRecado(
        meses === 0
          ? 'Nada a apurar: todos os meses até aqui já estão fechados.'
          : `${meses} ${meses === 1 ? 'competência apurada' : 'competências apuradas'} · ${formatarMoeda(total)} de depreciação.`,
      );
    }
  }

  async function fechar() {
    await chamar('fechar', { competencia: `${competencia}-01`, base_regra: base });
  }

  async function reabrir(alvo: Fechamento) {
    const motivo = window.prompt(
      `Reabrir ${formatarCompetencia(alvo.competencia)}?\n\nDescreva o motivo (fica registrado):`,
    );

    if (!motivo || motivo.trim().length < 10) {
      if (motivo !== null) {
        setErro('Informe um motivo com pelo menos 10 caracteres.');
      }
      return;
    }

    await chamar('reabrir', {
      competencia: alvo.competencia,
      base_regra: alvo.base_regra,
      motivo: motivo.trim(),
    });
  }

  async function aplicarTabela() {
    const confirmado = window.confirm(
      'Carregar as taxas do Anexo III da IN RFB 1.700/2017 nas bases fiscal e societária?\n\n'
        + 'Regras que você já ajustou não são alteradas.',
    );

    if (confirmado) {
      await chamar('tabela-padrao', {});
    }
  }

  const fechados = fechamentos.filter((item) => item.fechado_em && !item.reaberto_em);

  return (
    <section className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Apuração mensal</p>
          <h2 className="mt-1.5 text-[1.45rem] font-semibold tracking-[-0.04em] text-[var(--ink)]">
            Calcular e fechar a competência
          </h2>
          <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
            A depreciação é apurada mês a mês, a partir do mês em que cada bem entrou em uso. Fechar a competência
            congela o valor: mesmo que uma taxa mude depois, o mês fechado não é recalculado.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void aplicarTabela()}
          disabled={ocupado}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:opacity-60"
        >
          Carregar tabela da Receita
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="admin-field">
          Competência
          <input
            type="month"
            value={competencia}
            onChange={(evento) => setCompetencia(evento.target.value)}
            className="admin-input"
          />
        </label>

        <label className="admin-field">
          Base
          <select value={base} onChange={(evento) => setBase(evento.target.value)} className="admin-input">
            {BASES.map((item) => (
              <option key={item.valor} value={item.valor}>
                {item.rotulo}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={() => void apurar()}
            disabled={ocupado}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {ocupado ? 'Processando…' : 'Apurar até esta competência'}
          </button>
          <button
            type="button"
            onClick={() => void fechar()}
            disabled={ocupado}
            className="inline-flex h-10 flex-1 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:opacity-60"
          >
            Fechar mês
          </button>
        </div>
      </div>

      {recado ? <p className="mt-4 text-[13px] font-medium text-[#15803d]">{recado}</p> : null}
      {erro ? <p className="mt-4 text-[13px] font-medium text-[var(--rose)]">{erro}</p> : null}

      {fechados.length > 0 ? (
        <div className="mt-6 border-t border-[var(--line)] pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Competências fechadas</p>
          <div className="mt-3 grid gap-2">
            {fechados.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--ink)]">
                    {formatarCompetencia(item.competencia)}
                    <span className="ml-2 rounded-full bg-[rgba(37,99,235,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">
                      {item.base_regra === 'contabil' ? 'Societária' : 'Fiscal'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--muted)]">
                    {item.bens_processados} {item.bens_processados === 1 ? 'bem' : 'bens'} ·{' '}
                    {formatarMoeda(Number(item.valor_total))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void reabrir(item)}
                  disabled={ocupado}
                  className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--line)] bg-white px-3 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:opacity-60"
                >
                  Reabrir
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
