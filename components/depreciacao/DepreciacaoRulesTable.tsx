'use client';

import type { MetodoDepreciacao, RegraDepreciacaoTipoBem } from './types';

type DepreciacaoRulesTableProps = {
  loading: boolean;
  regras: RegraDepreciacaoTipoBem[];
  metodos: MetodoDepreciacao[];
  onEdit: (regra: RegraDepreciacaoTipoBem) => void;
  onDelete: (regra: RegraDepreciacaoTipoBem) => void;
};

function formatPercent(value: number | string | null | undefined) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '-';
  return `${parsed.toFixed(4)}%`;
}

function formatVigencia(inicio?: string | null, fim?: string | null) {
  if (!inicio && !fim) return '-';
  if (inicio && fim) return `${inicio} ate ${fim}`;
  if (inicio) return `${inicio} (aberta)`;
  return `ate ${fim}`;
}

function formatMetodo(regra: RegraDepreciacaoTipoBem, metodoLabelMap: Map<number, string>) {
  const fromMap = metodoLabelMap.get(regra.metodo_depreciacao_id);
  if (fromMap) return fromMap;
  if (regra.metodo_depreciacao) return regra.metodo_depreciacao;
  return `Metodo #${regra.metodo_depreciacao_id}`;
}

export default function DepreciacaoRulesTable({ loading, regras, metodos, onEdit, onDelete }: DepreciacaoRulesTableProps) {
  const metodoLabelMap = new Map(metodos.map((metodo) => [metodo.id, `${metodo.nome}${metodo.codigo ? ` (${metodo.codigo})` : ''}`]));

  return (
    <div className="mt-6 overflow-hidden rounded-[24px] border border-[var(--line)]">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
              <th className="px-4 py-3.5">Tipo de bem</th>
              <th className="px-4 py-3.5">Base</th>
              <th className="px-4 py-3.5">Metodo</th>
              <th className="px-4 py-3.5">Vida util</th>
              <th className="px-4 py-3.5">Taxa anual</th>
              <th className="px-4 py-3.5">Valor residual</th>
              <th className="px-4 py-3.5">Depreciavel</th>
              <th className="px-4 py-3.5">Vigencia</th>
              <th className="px-4 py-3.5">Ativo</th>
              <th className="px-4 py-3.5 text-right">Acoes</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Carregando regras de depreciacao...
                </td>
              </tr>
            ) : regras.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                  Nenhuma regra cadastrada para esta empresa.
                </td>
              </tr>
            ) : (
              regras.map((regra) => (
                <tr key={regra.id} className="border-t border-[var(--line)] text-[13px] text-[var(--ink)]">
                  <td className="px-4 py-3.5">{regra.tipo_bem}</td>
                  <td className="px-4 py-3.5">{(regra.base_regra || 'fiscal').toUpperCase()}</td>
                  <td className="px-4 py-3.5">{formatMetodo(regra, metodoLabelMap)}</td>
                  <td className="px-4 py-3.5">{regra.vida_util_anos} anos</td>
                  <td className="px-4 py-3.5">{formatPercent(regra.taxa_anual_percentual ?? regra.taxa_anual)}</td>
                  <td className="px-4 py-3.5">{formatPercent(regra.valor_residual_percentual ?? 0)}</td>
                  <td className="px-4 py-3.5">{regra.depreciavel === false ? 'Nao' : 'Sim'}</td>
                  <td className="px-4 py-3.5">{formatVigencia(regra.data_inicio_vigencia, regra.data_fim_vigencia)}</td>
                  <td className="px-4 py-3.5">{regra.ativo === false ? 'Nao' : 'Sim'}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(regra)}
                        className="inline-flex h-8.5 items-center justify-center rounded-full border border-[var(--line)] bg-white px-3 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(regra)}
                        className="inline-flex h-8.5 items-center justify-center rounded-full border border-[rgba(190,18,60,0.2)] bg-white px-3 text-[12px] font-semibold text-[var(--rose)] transition hover:border-[rgba(190,18,60,0.4)] hover:bg-[rgba(190,18,60,0.06)]"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
