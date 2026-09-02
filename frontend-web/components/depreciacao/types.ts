export type MetodoDepreciacao = {
  id: number;
  nome: string;
  codigo?: string | null;
  descricao?: string | null;
};

export type RegraDepreciacaoTipoBem = {
  id: number;
  empresa_id: number;
  tipo_bem_id?: number | null;
  tipo_bem: string;
  nome_regra?: string | null;
  base_regra?: 'fiscal' | 'contabil' | string;
  metodo_depreciacao_id: number;
  metodo_depreciacao?: string | null;
  vida_util_anos: number;
  taxa_anual: number | string;
  taxa_anual_percentual?: number | string;
  valor_residual_percentual?: number | string;
  depreciavel?: boolean;
  requer_override_manual?: boolean;
  data_inicio_vigencia?: string | null;
  data_fim_vigencia?: string | null;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type RegraDepreciacaoForm = {
  tipoBem: string;
  metodoDepreciacaoId: string;
  baseRegra: 'fiscal' | 'contabil';
  vidaUtilAnos: string;
  taxaAnual: string;
  valorResidualPercentual: string;
  depreciavel: boolean;
  ativo: boolean;
  dataInicioVigencia: string;
  dataFimVigencia: string;
  calcularTaxaAutomaticamente: boolean;
};
