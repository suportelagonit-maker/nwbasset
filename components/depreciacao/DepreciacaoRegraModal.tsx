'use client';

import type { MetodoDepreciacao, RegraDepreciacaoForm } from './types';

type DepreciacaoRegraModalProps = {
  open: boolean;
  title: string;
  methods: MetodoDepreciacao[];
  tiposBem: string[];
  form: RegraDepreciacaoForm;
  saving: boolean;
  onClose: () => void;
  onChange: (nextForm: RegraDepreciacaoForm) => void;
  onTipoBemChange: (tipoBem: string) => void;
  onSubmit: () => void;
};

function calcularTaxaAutomatica(vidaUtilAnos: string) {
  const vidaUtil = Number(vidaUtilAnos);
  if (!Number.isFinite(vidaUtil) || vidaUtil <= 0) return '';
  return (100 / vidaUtil).toFixed(4);
}

function formatarTaxaPreview(valor: string) {
  const taxa = Number(valor);
  if (!Number.isFinite(taxa)) return '-';
  return `${taxa.toFixed(4)}%`;
}

export default function DepreciacaoRegraModal({
  open,
  title,
  methods,
  tiposBem,
  form,
  saving,
  onClose,
  onChange,
  onTipoBemChange,
  onSubmit,
}: DepreciacaoRegraModalProps) {
  if (!open) {
    return null;
  }

  const vidaUtilNumero = Number(form.vidaUtilAnos);
  const taxaAutomatica = calcularTaxaAutomatica(form.vidaUtilAnos);
  const taxaPreview = form.calcularTaxaAutomaticamente ? taxaAutomatica : form.taxaAnual;
  const residualPreview = Number(form.valorResidualPercentual || 0);
  const metodoSelecionado = methods.find((method) => String(method.id) === form.metodoDepreciacaoId);
  const vidaUtilMuitoBaixa = Number.isFinite(vidaUtilNumero) && vidaUtilNumero > 0 && vidaUtilNumero < 2;

  return (
    <div className="admin-modal-overlay">
      <div className="panel-surface admin-modal-shell admin-modal-shell--md rounded-[24px] p-3 md:p-3.5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-2.5">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Depreciacoes</p>
            <h3 className="mt-1 text-[1.2rem] font-semibold tracking-[-0.04em] text-[var(--ink)]">{title}</h3>
            <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">Configure a regra contabil por tipo de bem.</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Fechar
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="admin-field">
            Tipo de bem
            <select
              value={form.tipoBem}
              onChange={(event) => onTipoBemChange(event.target.value)}
              className="admin-input"
              disabled={saving}
            >
              <option value="">Selecione um tipo</option>
              {tiposBem.map((tipoBem) => (
                <option key={tipoBem} value={tipoBem}>
                  {tipoBem}
                </option>
              ))}
            </select>
          </label>

          <label className="admin-field">
            Base da regra
            <select
              value={form.baseRegra}
              onChange={(event) => onChange({ ...form, baseRegra: event.target.value as 'fiscal' | 'contabil' })}
              className="admin-input"
              disabled={saving}
            >
              <option value="fiscal">Fiscal</option>
              <option value="contabil">Contabil</option>
            </select>
          </label>

          <label className="admin-field">
            Metodo de depreciacao
            <select
              value={form.metodoDepreciacaoId}
              onChange={(event) => onChange({ ...form, metodoDepreciacaoId: event.target.value })}
              className="admin-input"
              disabled={saving}
            >
              <option value="">Selecione o metodo</option>
              {methods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.nome}
                  {method.codigo ? ` (${method.codigo})` : ''}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-[var(--muted)]">{metodoSelecionado?.descricao || 'Linha reta e o metodo padrao.'}</span>
          </label>

          <label className="admin-field">
            Vigencia inicial
            <input
              type="date"
              value={form.dataInicioVigencia}
              onChange={(event) => onChange({ ...form, dataInicioVigencia: event.target.value })}
              className="admin-input"
              disabled={saving}
            />
          </label>

          <label className="admin-field">
            Vigencia final
            <input
              type="date"
              value={form.dataFimVigencia}
              onChange={(event) => onChange({ ...form, dataFimVigencia: event.target.value })}
              className="admin-input"
              disabled={saving}
            />
          </label>

          <label className="admin-field">
            Vida util economica (anos)
            <input
              type="number"
              min={1}
              step={1}
              value={form.vidaUtilAnos}
              onChange={(event) => {
                const nextVidaUtil = event.target.value;
                onChange({
                  ...form,
                  vidaUtilAnos: nextVidaUtil,
                  taxaAnual: form.calcularTaxaAutomaticamente ? calcularTaxaAutomatica(nextVidaUtil) : form.taxaAnual,
                });
              }}
              className="admin-input"
              disabled={saving || !form.depreciavel}
            />
          </label>

          <label className="admin-field">
            Valor residual (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.0001}
              value={form.valorResidualPercentual}
              onChange={(event) => onChange({ ...form, valorResidualPercentual: event.target.value })}
              className="admin-input"
              disabled={saving}
            />
          </label>

          <div className="admin-field sm:col-span-2">
            <div className="mb-2 grid gap-2 sm:grid-cols-3">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.depreciavel}
                  onChange={(event) => {
                    const depreciavel = event.target.checked;
                    onChange({
                      ...form,
                      depreciavel,
                      taxaAnual: depreciavel ? form.taxaAnual : '0',
                    });
                  }}
                  disabled={saving}
                />
                Depreciavel
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(event) => onChange({ ...form, ativo: event.target.checked })}
                  disabled={saving}
                />
                Regra ativa
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--ink)]">
                <input
                  type="checkbox"
                  checked={form.calcularTaxaAutomaticamente}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    onChange({
                      ...form,
                      calcularTaxaAutomaticamente: checked,
                      taxaAnual: checked ? calcularTaxaAutomatica(form.vidaUtilAnos) : form.taxaAnual,
                    });
                  }}
                  disabled={saving || !form.depreciavel}
                />
                Taxa automatica (100 / vida util)
              </label>
            </div>

            <label className="admin-field">
              Taxa anual (%)
              <input
                type="number"
                min={0}
                step={0.0001}
                value={form.taxaAnual}
                onChange={(event) => onChange({ ...form, taxaAnual: event.target.value })}
                className="admin-input"
                disabled={saving || form.calcularTaxaAutomaticamente || !form.depreciavel}
              />
            </label>
          </div>
        </div>

        {vidaUtilMuitoBaixa && form.depreciavel ? (
          <div className="mt-3 rounded-[14px] border border-[rgba(217,119,6,0.28)] bg-[rgba(245,158,11,0.12)] px-3 py-2 text-[12px] text-[#92400e]">
            Atencao: vida util inferior a 2 anos pode gerar distorcao contabil.
          </div>
        ) : null}

        <section className="mt-3 rounded-[16px] border border-[var(--line)] bg-[#fafafa] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Preview da regra contabil</p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-[12px] border border-[var(--line)] bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Taxa anual</p>
              <p className="mt-1 text-[15px] font-semibold text-[var(--ink)]">{formatarTaxaPreview(form.depreciavel ? taxaPreview : '0')}</p>
            </div>
            <div className="rounded-[12px] border border-[var(--line)] bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Tempo de depreciacao</p>
              <p className="mt-1 text-[15px] font-semibold text-[var(--ink)]">
                {form.depreciavel && Number.isFinite(vidaUtilNumero) && vidaUtilNumero > 0 ? `${vidaUtilNumero} anos` : 'Nao depreciavel'}
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--line)] bg-white px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Valor residual</p>
              <p className="mt-1 text-[15px] font-semibold text-[var(--ink)]">{Number.isFinite(residualPreview) ? `${residualPreview.toFixed(4)}%` : '-'}</p>
            </div>
          </div>
        </section>

        <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--line)] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="inline-flex h-9 items-center justify-center rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar regra'}
          </button>
        </div>
      </div>
    </div>
  );
}
