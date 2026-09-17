'use client';

import { useEffect, useMemo, useState } from 'react';

import DepreciacaoRegraModal from '@/components/depreciacao/DepreciacaoRegraModal';
import DepreciacaoRulesTable from '@/components/depreciacao/DepreciacaoRulesTable';
import FontesConsultaButton from '@/components/FontesConsultaButton';
import type { MetodoDepreciacao, RegraDepreciacaoForm, RegraDepreciacaoTipoBem } from '@/components/depreciacao/types';
import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

type DepreciacaoUnifiedManagementProps = {
  empresaId: number | null;
};

type ApiCollectionResponse<T> = {
  data?: T[];
  message?: string;
};

type TipoBemPatrimonial = {
  id: number;
  nome: string;
};

const PRESETS_POR_TIPO: Array<{ match: string[]; vidaUtilAnos: number; valorResidualPercentual: number; depreciavel: boolean }> = [
  { match: ['informatica', 'computador', 'tecnologia'], vidaUtilAnos: 5, valorResidualPercentual: 0, depreciavel: true },
  { match: ['equipamentos', 'equipamento', 'maquina'], vidaUtilAnos: 10, valorResidualPercentual: 0, depreciavel: true },
  { match: ['mobiliario', 'movel', 'moveis'], vidaUtilAnos: 10, valorResidualPercentual: 0, depreciavel: true },
  { match: ['veiculos', 'veiculo', 'carro'], vidaUtilAnos: 5, valorResidualPercentual: 0, depreciavel: true },
  { match: ['imoveis', 'imovel', 'predio'], vidaUtilAnos: 25, valorResidualPercentual: 0, depreciavel: true },
  { match: ['edificacao', 'edificacoes'], vidaUtilAnos: 25, valorResidualPercentual: 0, depreciavel: true },
  { match: ['utensilios', 'utensilio'], vidaUtilAnos: 10, valorResidualPercentual: 0, depreciavel: true },
  { match: ['terreno', 'terrenos'], vidaUtilAnos: 1, valorResidualPercentual: 0, depreciavel: false },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultForm(): RegraDepreciacaoForm {
  return {
    tipoBem: '',
    metodoDepreciacaoId: '',
    baseRegra: 'fiscal',
    vidaUtilAnos: '',
    taxaAnual: '',
    valorResidualPercentual: '0',
    depreciavel: true,
    ativo: true,
    dataInicioVigencia: todayIso(),
    dataFimVigencia: '',
    calcularTaxaAutomaticamente: true,
  };
}

function calcularTaxaAutomatica(vidaUtilAnos: string) {
  const vidaUtil = Number(vidaUtilAnos);

  if (!Number.isFinite(vidaUtil) || vidaUtil <= 0) {
    return '';
  }

  return (100 / vidaUtil).toFixed(4);
}

function formatarTaxa(taxa: string) {
  const numero = Number(taxa);

  if (!Number.isFinite(numero)) {
    return '';
  }

  return numero.toFixed(4);
}

function formatarResidualPercentual(valor: string) {
  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return '';
  }

  return numero.toFixed(4);
}

function normalizarTipoBem(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function obterPresetTipoBem(tipoBem: string) {
  const tipoNormalizado = normalizarTipoBem(tipoBem);

  return PRESETS_POR_TIPO.find((preset) =>
    preset.match.some((token) => {
      const tokenNormalizado = normalizarTipoBem(token);
      return tipoNormalizado === tokenNormalizado || tipoNormalizado.includes(tokenNormalizado);
    }),
  );
}

function aplicarPresetNoFormulario(
  tipoBem: string,
  formAtual: RegraDepreciacaoForm,
  metodoLinhaRetaId: number | null,
): RegraDepreciacaoForm {
  const preset = obterPresetTipoBem(tipoBem);

  if (!preset) {
    return {
      ...formAtual,
      tipoBem,
      metodoDepreciacaoId: formAtual.metodoDepreciacaoId || (metodoLinhaRetaId ? String(metodoLinhaRetaId) : ''),
    };
  }

  const vidaUtilAnos = String(preset.vidaUtilAnos);
  const taxaAnual = preset.depreciavel ? calcularTaxaAutomatica(vidaUtilAnos) : '0';

  return {
    ...formAtual,
    tipoBem,
    metodoDepreciacaoId: formAtual.metodoDepreciacaoId || (metodoLinhaRetaId ? String(metodoLinhaRetaId) : ''),
    vidaUtilAnos,
    taxaAnual,
    valorResidualPercentual: String(preset.valorResidualPercentual),
    depreciavel: preset.depreciavel,
    calcularTaxaAutomaticamente: true,
  };
}

export default function DepreciacaoUnifiedManagement({ empresaId }: DepreciacaoUnifiedManagementProps) {
  const [regras, setRegras] = useState<RegraDepreciacaoTipoBem[]>([]);
  const [metodos, setMetodos] = useState<MetodoDepreciacao[]>([]);
  const [tiposBemDisponiveis, setTiposBemDisponiveis] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [regraEditando, setRegraEditando] = useState<RegraDepreciacaoTipoBem | null>(null);
  const [form, setForm] = useState<RegraDepreciacaoForm>(defaultForm());

  const metodoLinhaRetaId = useMemo(() => {
    const metodoLinhaReta = metodos.find((metodo) => metodo.codigo === 'LINHA_RETA');
    return metodoLinhaReta?.id ?? metodos[0]?.id ?? null;
  }, [metodos]);

  useEffect(() => {
    void carregarDados();
  }, [empresaId]);

  async function fetchCollection<T>(path: string) {
    const response = await fetch(`/api/admin/${path}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as ApiCollectionResponse<T> | null;

    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      return [] as T[];
    }

    if (!response.ok) {
      throw new Error(payload?.message ?? `Falha ao consultar ${path}: ${response.status}`);
    }

    return Array.isArray(payload?.data) ? payload.data : [];
  }

  async function carregarDados() {
    if (!empresaId) {
      setLoading(false);
      setRegras([]);
      setMetodos([]);
      setTiposBemDisponiveis([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [regrasData, metodosData, tiposData] = await Promise.all([
        fetchCollection<RegraDepreciacaoTipoBem>(`regras-depreciacao?empresa_id=${empresaId}&per_page=500`),
        fetchCollection<MetodoDepreciacao>('metodos-depreciacao?per_page=200'),
        fetchCollection<TipoBemPatrimonial>(`tipos-bens-patrimoniais?empresa_id=${empresaId}`),
      ]);

      setRegras(regrasData);
      setMetodos(metodosData);
      setTiposBemDisponiveis(
        tiposData
          .map((tipo) => String(tipo.nome || '').trim())
          .filter(Boolean),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar as regras de depreciacao.');
    } finally {
      setLoading(false);
    }
  }

  function abrirModalNovaRegra() {
    const proximoForm = defaultForm();
    proximoForm.tipoBem = tiposBemDisponiveis[0] ?? '';
    proximoForm.metodoDepreciacaoId = metodoLinhaRetaId ? String(metodoLinhaRetaId) : '';

    const formComPreset = aplicarPresetNoFormulario(proximoForm.tipoBem, proximoForm, metodoLinhaRetaId);

    setRegraEditando(null);
    setForm(formComPreset);
    setModalOpen(true);
    setError(null);
  }

  function abrirModalEdicao(regra: RegraDepreciacaoTipoBem) {
    const vidaUtil = String(regra.vida_util_anos);
    const taxa = Number(regra.taxa_anual_percentual ?? regra.taxa_anual);
    const taxaAutomatica = Number(calcularTaxaAutomatica(vidaUtil));
    const usaTaxaAutomatica = Number.isFinite(taxa) && Number.isFinite(taxaAutomatica) && Math.abs(taxa - taxaAutomatica) < 0.0001;

    setRegraEditando(regra);
    setForm({
      tipoBem: regra.tipo_bem,
      metodoDepreciacaoId: String(regra.metodo_depreciacao_id),
      baseRegra: regra.base_regra === 'contabil' ? 'contabil' : 'fiscal',
      vidaUtilAnos: vidaUtil,
      taxaAnual: formatarTaxa(String(regra.taxa_anual_percentual ?? regra.taxa_anual)),
      valorResidualPercentual: formatarResidualPercentual(String(regra.valor_residual_percentual ?? 0)),
      depreciavel: regra.depreciavel !== false,
      ativo: regra.ativo !== false,
      dataInicioVigencia: regra.data_inicio_vigencia ? String(regra.data_inicio_vigencia).slice(0, 10) : todayIso(),
      dataFimVigencia: regra.data_fim_vigencia ? String(regra.data_fim_vigencia).slice(0, 10) : '',
      calcularTaxaAutomaticamente: usaTaxaAutomatica,
    });
    setModalOpen(true);
    setError(null);
  }

  function fecharModal() {
    if (saving) {
      return;
    }

    setModalOpen(false);
    setRegraEditando(null);
    setForm(defaultForm());
  }

  function atualizarTipoBemComPreset(tipoBem: string) {
    setForm((atual) => aplicarPresetNoFormulario(tipoBem, atual, metodoLinhaRetaId));
  }

  async function salvarRegra() {
    if (!empresaId) {
      setError('Selecione uma empresa para cadastrar regras de depreciacao.');
      return;
    }

    if (!form.tipoBem) {
      setError('Selecione o tipo de bem.');
      return;
    }

    if (!form.metodoDepreciacaoId) {
      setError('Selecione o metodo de depreciacao.');
      return;
    }

    const vidaUtil = Number(form.vidaUtilAnos);
    if (form.depreciavel && (!Number.isFinite(vidaUtil) || vidaUtil <= 0)) {
      setError('Informe uma vida util economica valida.');
      return;
    }

    const taxaCalculada = form.depreciavel
      ? form.calcularTaxaAutomaticamente
        ? calcularTaxaAutomatica(form.vidaUtilAnos)
        : form.taxaAnual
      : '0';
    const taxa = Number(taxaCalculada);

    if (!Number.isFinite(taxa) || (form.depreciavel ? taxa <= 0 : taxa < 0)) {
      setError('Informe uma taxa anual valida.');
      return;
    }

    const valorResidualPercentual = Number(form.valorResidualPercentual);
    if (!Number.isFinite(valorResidualPercentual) || valorResidualPercentual < 0 || valorResidualPercentual > 100) {
      setError('Informe um valor residual entre 0% e 100%.');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const endpoint = regraEditando ? `/api/admin/regras-depreciacao/${regraEditando.id}` : '/api/admin/regras-depreciacao';
      const method = regraEditando ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          empresa_id: empresaId,
          tipo_bem: form.tipoBem,
          base_regra: form.baseRegra,
          metodo_depreciacao_id: Number(form.metodoDepreciacaoId),
          vida_util_anos: form.depreciavel ? vidaUtil : 1,
          taxa_anual: Number(formatarTaxa(String(taxa))),
          valor_residual_percentual: Number(formatarResidualPercentual(form.valorResidualPercentual)),
          depreciavel: form.depreciavel,
          ativo: form.ativo,
          data_inicio_vigencia: form.dataInicioVigencia || todayIso(),
          data_fim_vigencia: form.dataFimVigencia || null,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message ?? `Falha ao salvar regra: ${response.status}`);
      }

      setMessage(regraEditando ? 'Regra de depreciacao atualizada com sucesso.' : 'Regra de depreciacao criada com sucesso.');
      fecharModal();
      await carregarDados();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Nao foi possivel salvar a regra de depreciacao.');
    } finally {
      setSaving(false);
    }
  }

  async function excluirRegra(regra: RegraDepreciacaoTipoBem) {
    if (!window.confirm(`Deseja excluir a regra do tipo "${regra.tipo_bem}"?`)) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/regras-depreciacao/${regra.id}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      const payload = (await response.json().catch(() => null)) as { message?: string } | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message ?? `Falha ao excluir regra: ${response.status}`);
      }

      setMessage('Regra de depreciacao removida com sucesso.');
      await carregarDados();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Nao foi possivel excluir a regra de depreciacao.');
    }
  }

  return (
    <>
      <section className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Depreciacoes</p>
            <h2 className="mt-1.5 text-[1.65rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">Regras de depreciacao por tipo de bem</h2>
            <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
              Cada tipo de ativo possui sua regra padrao com base fiscal/contabil, vigencia e comportamento de depreciacao.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <FontesConsultaButton />
            <button
              type="button"
              onClick={abrirModalNovaRegra}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4.5 text-[13px] font-semibold text-white transition hover:opacity-90"
            >
              + Nova regra
            </button>
            <button
              type="button"
              onClick={() => void carregarDados()}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4.5 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Atualizar
            </button>
          </div>
        </div>

        {message ? (
          <div className="mt-5 rounded-2xl border border-[rgba(34,197,94,0.18)] bg-[rgba(34,197,94,0.08)] px-4 py-3 text-sm text-[var(--ink)]">{message}</div>
        ) : null}

        {error ? (
          <div className="mt-5 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">{error}</div>
        ) : null}

        <DepreciacaoRulesTable
          loading={loading}
          regras={regras}
          metodos={metodos}
          onEdit={abrirModalEdicao}
          onDelete={(regra) => void excluirRegra(regra)}
        />
      </section>

      <DepreciacaoRegraModal
        open={modalOpen}
        title={regraEditando ? 'Editar regra de depreciacao' : 'Nova regra de depreciacao'}
        methods={metodos}
        tiposBem={tiposBemDisponiveis}
        form={form}
        saving={saving}
        onClose={fecharModal}
        onChange={setForm}
        onTipoBemChange={atualizarTipoBemComPreset}
        onSubmit={() => void salvarRegra()}
      />
    </>
  );
}
