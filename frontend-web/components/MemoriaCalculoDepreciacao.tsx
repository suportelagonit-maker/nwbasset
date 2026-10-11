'use client';

import { useCallback, useEffect, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

/**
 * Memória de cálculo da depreciação de um bem, mês a mês.
 *
 * É o que permite conferir o número em vez de confiar nele: qual regra foi
 * aplicada, de onde ela veio, quando a depreciação começa e quanto cai em
 * cada competência até zerar.
 */

type Parcela = {
  competencia: string;
  mes: string;
  valor_depreciacao: number;
  acumulado: number;
  valor_contabil: number;
  meses_depreciados: number;
};

type Cronograma = {
  bem: { id: number; numero_tombo: string | null; descricao: string | null; data_aquisicao: string | null; data_inicio_uso: string | null };
  base_regra: string;
  depreciavel: boolean;
  motivo: string | null;
  regra: {
    nome: string | null;
    origem: string | null;
    metodo: string | null;
    vida_util_anos: number | null;
    taxa_anual_percentual: number | null;
    coeficiente_aceleracao: number;
    por_produto: boolean;
  };
  valor_aquisicao: number;
  valor_residual: number;
  valor_depreciavel: number;
  inicio: string | null;
  meses_vida_util: number;
  parcelas: Parcela[];
};

const METODOS: Record<string, string> = {
  linha_reta: 'Linha reta',
  soma_digitos: 'Soma dos dígitos',
  unidades_produzidas: 'Unidades produzidas',
};

const ORIGENS: Record<string, string> = {
  parametro_bem: 'Ajuste próprio deste bem',
  regra_padrao: 'Regra padrão da empresa',
  fallback_legado: 'Padrão herdado (sem regra cadastrada)',
};

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export default function MemoriaCalculoDepreciacao({ bemId }: { bemId: number }) {
  const [base, setBase] = useState('fiscal');
  const [dados, setDados] = useState<Cronograma | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarTudo, setMostrarTudo] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await fetch(`/api/admin/bens/${bemId}/cronograma-depreciacao?base_regra=${base}`, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const corpo = (await resposta.json().catch(() => null)) as { data?: Cronograma; message?: string } | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (!resposta.ok || !corpo?.data) {
        throw new Error(corpo?.message ?? 'Não foi possível carregar a memória de cálculo.');
      }

      setDados(corpo.data);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar a memória de cálculo.');
    } finally {
      setCarregando(false);
    }
  }, [base, bemId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const parcelas = dados?.parcelas ?? [];
  const visiveis = mostrarTudo ? parcelas : parcelas.slice(0, 12);

  return (
    <article className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Memória de cálculo</p>
          <h3 className="mt-1.5 text-lg font-semibold text-[var(--ink)]">Depreciação mês a mês</h3>
        </div>

        <div className="flex gap-1.5 rounded-full border border-[var(--line)] bg-white p-1">
          {[
            { valor: 'fiscal', rotulo: 'Fiscal' },
            { valor: 'contabil', rotulo: 'Societária' },
          ].map((item) => (
            <button
              key={item.valor}
              type="button"
              onClick={() => setBase(item.valor)}
              className={`inline-flex h-8 items-center rounded-full px-3.5 text-[12px] font-semibold transition ${
                base === item.valor ? 'bg-[var(--accent)] text-white' : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      </div>

      {carregando ? <p className="mt-5 text-sm text-[var(--muted)]">Carregando…</p> : null}
      {erro ? <p className="mt-5 text-[13px] font-medium text-[var(--rose)]">{erro}</p> : null}

      {!carregando && dados && !dados.depreciavel ? (
        <p className="mt-5 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          {dados.motivo ?? 'Este bem não deprecia.'}
        </p>
      ) : null}

      {!carregando && dados?.depreciavel ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Regra aplicada</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">{dados.regra.nome ?? 'Padrão'}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]">
                {ORIGENS[dados.regra.origem ?? ''] ?? 'Regra vigente'}
                {dados.regra.por_produto ? ' · específica do produto' : ''}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Método e taxa</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">
                {METODOS[dados.regra.metodo ?? ''] ?? dados.regra.metodo}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]">
                {dados.regra.vida_util_anos} anos · {Number(dados.regra.taxa_anual_percentual ?? 0).toFixed(2)}% a.a.
                {dados.regra.coeficiente_aceleracao > 1 ? ` · acelerada ${dados.regra.coeficiente_aceleracao}×` : ''}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Base depreciável</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">{moeda(dados.valor_depreciavel)}</p>
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]">
                {moeda(dados.valor_aquisicao)} − {moeda(dados.valor_residual)} de residual
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Início</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--ink)]">
                {dados.inicio ? dados.inicio.slice(0, 7).split('-').reverse().join('/') : '—'}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-[var(--muted)]">
                {dados.bem.data_inicio_uso && dados.bem.data_inicio_uso !== dados.bem.data_aquisicao
                  ? 'Pela data de início de uso'
                  : 'Pela data de aquisição'}
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--line)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="py-2 pr-3">Competência</th>
                  <th className="py-2 pr-3 text-right">Depreciação</th>
                  <th className="py-2 pr-3 text-right">Acumulado</th>
                  <th className="py-2 text-right">Valor contábil</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((parcela) => (
                  <tr key={parcela.competencia} className="border-b border-[var(--line)] last:border-0">
                    <td className="py-2 pr-3 font-medium text-[var(--ink)]">{parcela.mes}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-[var(--ink)]">{moeda(parcela.valor_depreciacao)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-[var(--muted)]">{moeda(parcela.acumulado)}</td>
                    <td className="py-2 text-right tabular-nums font-semibold text-[var(--ink)]">{moeda(parcela.valor_contabil)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {parcelas.length > 12 ? (
            <button
              type="button"
              onClick={() => setMostrarTudo((atual) => !atual)}
              className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
            >
              {mostrarTudo ? 'Mostrar só os 12 primeiros meses' : `Ver as ${parcelas.length} competências`}
            </button>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
