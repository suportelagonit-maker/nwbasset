import type { ModuleConfig } from '@/components/GenericModuleManagement';

const filialLookup = {
  key: 'filiais',
  path: 'filiais',
  label: (item: Record<string, unknown>) => `${item.nome ?? `Filial #${item.id ?? ''}`}${item.matriz ? ' - Matriz' : ''}`,
} as const;

const unidadeLookup = {
  key: 'unidades',
  path: 'unidades-administrativas',
  label: (item: Record<string, unknown>) => String(item.nome ?? `Unidade #${item.id ?? ''}`),
} as const;

const departamentoLookup = {
  key: 'departamentos',
  path: 'departamentos',
  label: (item: Record<string, unknown>) => String(item.nome ?? `Departamento #${item.id ?? ''}`),
} as const;

const localLookup = {
  key: 'locais',
  path: 'locais',
  label: (item: Record<string, unknown>) => String(item.nome ?? `Local #${item.id ?? ''}`),
} as const;

const responsavelLookup = {
  key: 'responsaveis',
  path: 'responsaveis',
  label: (item: Record<string, unknown>) => String(item.nome ?? `Responsável #${item.id ?? ''}`),
} as const;

const bemLookup = {
  key: 'bens',
  path: 'bens',
  label: (item: Record<string, unknown>) =>
    `${item.numero_tombo ?? `Bem #${item.id ?? ''}`}${item.descricao ? ` - ${item.descricao}` : ''}`,
} as const;

const inventarioLookup = {
  key: 'inventarios',
  path: 'inventarios',
  label: (item: Record<string, unknown>) => `${item.nome ?? `Inventário #${item.id ?? ''}`}${item.status ? ` - ${item.status}` : ''}`,
} as const;

const metodoLookup = {
  key: 'metodos',
  path: 'metodos-depreciacao',
  label: (item: Record<string, unknown>) => `${item.nome ?? `Método #${item.id ?? ''}`}${item.codigo ? ` - ${item.codigo}` : ''}`,
} as const;

const tipoBemLookup = {
  key: 'tipos_bens',
  path: 'tipos-bens-patrimoniais',
  label: (item: Record<string, unknown>) => String(item.nome ?? `Tipo #${item.id ?? ''}`),
} as const;

function primaryCell(title: unknown, subtitle: unknown) {
  return (
    <div>
      <p className="font-semibold">{String(title ?? 'Sem identificação')}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{String(subtitle ?? 'Sem detalhes')}</p>
    </div>
  );
}

function formatCurrency(value: unknown) {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue)) {
    return 'R$ 0,00';
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericValue);
}

const baixaMotivoOptions = [
  { value: 'OBSOLESCENCIA', label: 'Obsolescência' },
  { value: 'DANO_IRRECUPERAVEL', label: 'Dano irrecuperável' },
  { value: 'ROUBO_FURTO', label: 'Roubo / furto' },
  { value: 'EXTRAVIO', label: 'Extravio' },
  { value: 'SINISTRO', label: 'Sinistro' },
  { value: 'DOACAO', label: 'Doação' },
  { value: 'VENDA', label: 'Venda' },
  { value: 'SUCATEAMENTO', label: 'Sucateamento' },
  { value: 'AJUSTE_INVENTARIO', label: 'Ajuste de inventário' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

function getBaixaMotivoLabel(value: unknown) {
  return baixaMotivoOptions.find((option) => option.value === String(value ?? ''))?.label ?? String(value ?? 'Sem motivo');
}

export const moduleCrudConfig: Record<string, ModuleConfig> = {
  responsaveis: {
    key: 'responsaveis',
    label: 'Responsáveis',
    summary: 'Gestão de responsáveis patrimoniais',
    endpoint: 'responsaveis',
    createLabel: 'Novo responsável',
    emptyMessage: 'Nenhum responsável cadastrado.',
    lookups: [filialLookup, departamentoLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'filial_id', label: 'Filial', type: 'select', valueType: 'number', lookupKey: 'filiais', required: true, clearOnChange: ['departamento_id'] },
      { name: 'departamento_id', label: 'Departamento', type: 'select', valueType: 'number', lookupKey: 'departamentos', required: true, disabled: (form) => !form.filial_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'nome', label: 'Nome', type: 'text', required: true },
      { name: 'telefone', label: 'Contato telefônico', type: 'text' },
      { name: 'email', label: 'E-mail', type: 'email' },
      { name: 'cpf', label: 'CPF', type: 'text' },
      { name: 'cargo', label: 'Cargo', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', defaultValue: 'ativo', options: [{ value: 'ativo', label: 'Ativo' }, { value: 'inativo', label: 'Inativo' }] },
    ],
    columns: [
      {
        label: 'Responsável',
        render: (item) => primaryCell(item.nome, `ID ${item.id}`),
      },
      {
        label: 'Filial',
        render: (item, context) => context.getLookupLabel('filiais', item.filial_id),
      },
      {
        label: 'Departamento',
        render: (item, context) => context.getLookupLabel('departamentos', item.departamento_id),
      },
      {
        label: 'Contato',
        render: (item) => primaryCell(item.email ?? 'Sem e-mail', item.telefone ?? 'Sem telefone'),
      },
      {
        label: 'Status',
        render: (item) => String(item.status ?? 'Sem status'),
      },
    ],
  },
  bens: {
    key: 'bens',
    label: 'Bens Patrimoniais',
    summary: 'Cadastro de bens patrimoniais tangíveis',
    endpoint: 'bens',
    createLabel: 'Novo bem',
    emptyMessage: 'Nenhum bem patrimonial cadastrado.',
    modalMaxWidthClassName: 'admin-modal-shell--md',
    steppedBodyMinHeightClassName: 'min-h-[300px] lg:min-h-[320px]',
    lookups: [filialLookup, unidadeLookup, departamentoLookup, localLookup, responsavelLookup, tipoBemLookup],
    steps: [
      {
        key: 'estrutura',
        label: 'Estrutura',
        description: 'Defina a localização organizacional e o responsável do ativo.',
        fields: ['filial_id', 'unidade_administrativa_id', 'departamento_id', 'local_id', 'responsavel_id'],
        compactSummary: true,
        formGridClassName: 'sm:grid-cols-2 xl:grid-cols-3',
      },
      {
        key: 'identificacao',
        label: 'Identificação',
        description: 'Cadastre tombo, sórie e informações principais do bem.',
        fields: ['numero_tombo', 'numero_serie', 'descricao', 'categoria', 'marca', 'modelo'],
        compactSummary: true,
        formGridClassName: 'sm:grid-cols-2 xl:grid-cols-3',
      },
      {
        key: 'valores',
        label: 'Valores e status',
        description: 'Informe aquisição, vida útil e situação atual do ativo.',
        fields: ['data_aquisicao', 'valor_aquisicao', 'valor_residual', 'vida_util_anos', 'status_bem', 'estado_conservacao'],
        compactSummary: true,
        formGridClassName: 'sm:grid-cols-2 xl:grid-cols-3',
      },
      {
        key: 'anexos',
        label: 'Anexos',
        description: 'Envie imagens do bem e a Nota Fiscal em PDF ou XML.',
        fields: [],
        compactSummary: true,
        formGridClassName: 'grid-cols-1',
      },
    ],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'filial_id', label: 'Filial', type: 'select', valueType: 'number', lookupKey: 'filiais', clearOnChange: ['unidade_administrativa_id', 'departamento_id', 'local_id', 'responsavel_id'] },
      { name: 'unidade_administrativa_id', label: 'Unidade administrativa', type: 'select', valueType: 'number', lookupKey: 'unidades', clearOnChange: ['departamento_id', 'local_id'], disabled: (form) => !form.filial_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'departamento_id', label: 'Departamento', type: 'select', valueType: 'number', lookupKey: 'departamentos', clearOnChange: ['local_id', 'responsavel_id'], disabled: (form) => !form.unidade_administrativa_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.unidade_administrativa_id ?? '') === String(form.unidade_administrativa_id ?? '') },
      { name: 'local_id', label: 'Local', type: 'select', valueType: 'number', lookupKey: 'locais', disabled: (form) => !form.departamento_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.unidade_administrativa_id ?? '') === String(form.unidade_administrativa_id ?? '') && String(option.departamento_id ?? '') === String(form.departamento_id ?? '') },
      { name: 'responsavel_id', label: 'Responsável', type: 'select', valueType: 'number', lookupKey: 'responsaveis', disabled: (form) => !form.departamento_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.departamento_id ?? '') === String(form.departamento_id ?? '') },
      { name: 'numero_tombo', label: 'Número do tombo', type: 'text', required: true },
      { name: 'numero_serie', label: 'Número de sórie', type: 'text' },
      { name: 'descricao', label: 'Descrição', type: 'textarea', required: true },
      { name: 'categoria', label: 'Tipo do bem', type: 'select', lookupKey: 'tipos_bens', lookupValueKey: 'nome', required: true },
      { name: 'marca', label: 'Marca', type: 'text' },
      { name: 'modelo', label: 'Modelo', type: 'text' },
      { name: 'data_aquisicao', label: 'Data de aquisição', type: 'date' },
      { name: 'valor_aquisicao', label: 'Valor de aquisição', type: 'number' },
      { name: 'valor_residual', label: 'Valor residual', type: 'number' },
      { name: 'vida_util_anos', label: 'Vida útil (anos)', type: 'number', valueType: 'number' },
      { name: 'status_bem', label: 'Status do bem', type: 'text', defaultValue: 'ativo' },
      { name: 'estado_conservacao', label: 'Estado de conservação', type: 'text', defaultValue: 'bom' },
    ],
    columns: [
      {
        label: 'Bem',
        render: (item) => (
          <div className="flex items-start gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[16px] border border-[var(--line)] bg-[#eef2f7]">
              {item.imagem_principal_url ? (
                <img src={String(item.imagem_principal_url)} alt={String(item.descricao ?? 'Bem patrimonial')} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                  Sem foto
                </div>
              )}
            </div>
            {primaryCell(item.descricao, `Tombo ${item.numero_tombo ?? 'Sem tombo'} | ID ${item.id}`)}
          </div>
        ),
      },
      {
        label: 'Estrutura',
        render: (item, context) =>
          primaryCell(context.getLookupLabel('filiais', item.filial_id), `${context.getLookupLabel('unidades', item.unidade_administrativa_id)} / ${context.getLookupLabel('departamentos', item.departamento_id)}`),
      },
      {
        label: 'Local / Responsável',
        render: (item, context) =>
          primaryCell(context.getLookupLabel('locais', item.local_id), item.responsavel_id ? context.getLookupLabel('responsaveis', item.responsavel_id) : 'Sem responsável'),
      },
      {
        label: 'Valores do ativo',
        render: (item) =>
          primaryCell(
            formatCurrency(item.valor_aquisicao),
            `Residual ${formatCurrency(item.valor_residual)}${item.vida_util_anos ? ` | Vida útil ${item.vida_util_anos} anos` : ''}`,
          ),
      },
      {
        label: 'Status',
        render: (item) => primaryCell(item.status_bem, item.estado_conservacao),
      },
    ],
  },
  plaquetas: {
    key: 'plaquetas',
    label: 'Plaquetas',
    summary: 'Controle de plaquetas e QR Code',
    endpoint: 'plaquetas',
    createLabel: 'Nova plaqueta',
    emptyMessage: 'Nenhuma plaqueta cadastrada.',
    lookups: [filialLookup, bemLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'filial_id', label: 'Filial', type: 'select', valueType: 'number', lookupKey: 'filiais', clearOnChange: ['bem_patrimonial_id'] },
      { name: 'bem_patrimonial_id', label: 'Bem patrimonial', type: 'select', valueType: 'number', lookupKey: 'bens', disabled: (form) => !form.filial_id, filterOption: (option, form) => !form.filial_id || String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'status', label: 'Status', type: 'select', defaultValue: 'GERADA', options: [{ value: 'GERADA', label: 'GERADA' }, { value: 'APLICADA', label: 'APLICADA' }, { value: 'INATIVA', label: 'INATIVA' }, { value: 'SUBSTITUIDA', label: 'SUBSTITUIDA' }] },
      { name: 'data_geracao', label: 'Data de geração', type: 'date' },
      { name: 'data_aplicacao', label: 'Data de aplicação', type: 'date' },
      { name: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      {
        label: 'Plaqueta',
        render: (item) => primaryCell(`Patrimônio ${item.numero_plaqueta ?? item.codigo_plaqueta ?? 'Sem número'}`, `ID ${item.id}`),
      },
      {
        label: 'Bem',
        render: (item, context) => context.getLookupLabel('bens', item.bem_patrimonial_id),
      },
      {
        label: 'Filial',
        render: (item, context) => context.getLookupLabel('filiais', item.filial_id),
      },
      {
        label: 'Código de barras',
        render: (item) => (
          <div>
            <p className="font-semibold">{String(item.codigo_barras_conteudo ?? 'Sem código')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a
                href={`/patrimonio/etiqueta?codigo=${encodeURIComponent(String(item.codigo_barras_conteudo ?? item.codigo_plaqueta ?? ''))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
              >
                Etiqueta
              </a>
              <a
                href={`/patrimonio/consulta?codigo=${encodeURIComponent(String(item.codigo_barras_conteudo ?? item.codigo_plaqueta ?? ''))}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
              >
                Consulta
              </a>
            </div>
          </div>
        ),
      },
      {
        label: 'Status',
        render: (item) => primaryCell(item.status, item.data_aplicacao ?? item.data_geracao ?? 'Sem datas'),
      },
    ],
  },
  inventarios: {
    key: 'inventarios',
    label: 'Inventários',
    summary: 'Planejamento e execução de inventários patrimoniais',
    endpoint: 'inventarios',
    createLabel: 'Novo inventário',
    emptyMessage: 'Nenhum inventário cadastrado.',
    lookups: [filialLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'filial_id', label: 'Filial', type: 'select', valueType: 'number', lookupKey: 'filiais' },
      { name: 'nome', label: 'Nome do inventário', type: 'text' },
      { name: 'data_inicio', label: 'Data de início', type: 'date' },
      { name: 'data_fim', label: 'Data de fim', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', defaultValue: 'ABERTO', options: [{ value: 'ABERTO', label: 'ABERTO' }, { value: 'EM_ANDAMENTO', label: 'EM ANDAMENTO' }, { value: 'FINALIZADO', label: 'FINALIZADO' }] },
    ],
    columns: [
      {
        label: 'Inventário',
        render: (item) => primaryCell(item.nome, `ID ${item.id}`),
      },
      {
        label: 'Filial',
        render: (item, context) => context.getLookupLabel('filiais', item.filial_id),
      },
      {
        label: 'Periodo',
        render: (item) => primaryCell(item.data_inicio ?? 'Sem inicio', item.data_fim ?? 'Sem fim'),
      },
      {
        label: 'Status',
        render: (item) => String(item.status ?? 'Sem status'),
      },
    ],
  },
  'transferencias-bens': {
    key: 'transferencias-bens',
    label: 'Transferências',
    summary: 'Transferências patrimoniais entre locais',
    endpoint: 'transferencias-bens',
    createLabel: 'Nova transferência',
    emptyMessage: 'Nenhuma transferência cadastrada.',
    lookups: [filialLookup, bemLookup, responsavelLookup, unidadeLookup, departamentoLookup, localLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'filial_id', label: 'Filial', type: 'select', valueType: 'number', lookupKey: 'filiais', clearOnChange: ['bem_patrimonial_id', 'origem_unidade_administrativa_id', 'origem_departamento_id', 'origem_local_id', 'origem_responsavel_id', 'destino_unidade_administrativa_id', 'destino_departamento_id', 'destino_local_id', 'destino_responsavel_id'] },
      { name: 'bem_patrimonial_id', label: 'Bem patrimonial', type: 'select', valueType: 'number', lookupKey: 'bens', clearOnChange: ['origem_unidade_administrativa_id', 'origem_departamento_id', 'origem_local_id', 'origem_responsavel_id'], disabled: (form) => !form.filial_id, filterOption: (option, form) => !form.filial_id || String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'origem_unidade_administrativa_id', label: 'Origem unidade', type: 'select', valueType: 'number', lookupKey: 'unidades', clearOnChange: ['origem_departamento_id', 'origem_local_id'], filterOption: (option, form) => !form.filial_id || String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'origem_departamento_id', label: 'Origem departamento', type: 'select', valueType: 'number', lookupKey: 'departamentos', clearOnChange: ['origem_local_id'], disabled: (form) => !form.origem_unidade_administrativa_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.unidade_administrativa_id ?? '') === String(form.origem_unidade_administrativa_id ?? '') },
      { name: 'origem_local_id', label: 'Origem local', type: 'select', valueType: 'number', lookupKey: 'locais', disabled: (form) => !form.origem_departamento_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.unidade_administrativa_id ?? '') === String(form.origem_unidade_administrativa_id ?? '') && String(option.departamento_id ?? '') === String(form.origem_departamento_id ?? '') },
      { name: 'origem_responsavel_id', label: 'Responsável de origem', type: 'select', valueType: 'number', lookupKey: 'responsaveis', disabled: () => true, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.departamento_id ?? '') === String(form.origem_departamento_id ?? '') },
      { name: 'destino_unidade_administrativa_id', label: 'Destino unidade', type: 'select', valueType: 'number', lookupKey: 'unidades', clearOnChange: ['destino_departamento_id', 'destino_local_id'], filterOption: (option, form) => !form.filial_id || String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'destino_departamento_id', label: 'Destino departamento', type: 'select', valueType: 'number', lookupKey: 'departamentos', clearOnChange: ['destino_local_id', 'destino_responsavel_id'], disabled: (form) => !form.destino_unidade_administrativa_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.unidade_administrativa_id ?? '') === String(form.destino_unidade_administrativa_id ?? '') },
      { name: 'destino_local_id', label: 'Destino local', type: 'select', valueType: 'number', lookupKey: 'locais', disabled: (form) => !form.destino_departamento_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.unidade_administrativa_id ?? '') === String(form.destino_unidade_administrativa_id ?? '') && String(option.departamento_id ?? '') === String(form.destino_departamento_id ?? '') },
      { name: 'destino_responsavel_id', label: 'Responsável de destino', type: 'select', valueType: 'number', lookupKey: 'responsaveis', disabled: (form) => !form.destino_departamento_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.departamento_id ?? '') === String(form.destino_departamento_id ?? '') },
      { name: 'atualizar_responsavel_bem', label: 'Atualizar responsável do bem', type: 'select', defaultValue: '0', options: [{ value: '0', label: 'Não' }, { value: '1', label: 'Sim' }] },
      { name: 'data_transferencia', label: 'Data da transferência', type: 'date' },
      { name: 'motivo', label: 'Motivo', type: 'text' },
      { name: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { label: 'Transferência', render: (item, context) => primaryCell(context.getLookupLabel('bens', item.bem_patrimonial_id), `ID ${item.id} | ${item.data_transferencia ?? 'Sem data'}`) },
      { label: 'Origem', render: (item, context) => primaryCell(context.getLookupLabel('unidades', item.origem_unidade_administrativa_id), `${context.getLookupLabel('departamentos', item.origem_departamento_id)} / ${context.getLookupLabel('locais', item.origem_local_id)} • ${context.getLookupLabel('responsaveis', item.origem_responsavel_id)}`) },
      { label: 'Destino', render: (item, context) => primaryCell(context.getLookupLabel('unidades', item.destino_unidade_administrativa_id), `${context.getLookupLabel('departamentos', item.destino_departamento_id)} / ${context.getLookupLabel('locais', item.destino_local_id)} • ${item.destino_responsavel_id ? context.getLookupLabel('responsaveis', item.destino_responsavel_id) : 'Sem responsável'}`) },
      { label: 'Motivo', render: (item) => primaryCell(item.motivo, item.observacoes ?? 'Sem observações') },
    ],
  },
  'baixas-bens': {
    key: 'baixas-bens',
    label: 'Baixas Patrimoniais',
    summary: 'Baixas formais e auditáveis de bens',
    endpoint: 'baixas-bens',
    createLabel: 'Nova baixa',
    emptyMessage: 'Nenhuma baixa patrimonial cadastrada.',
    lookups: [filialLookup, bemLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'filial_id', label: 'Filial', type: 'select', valueType: 'number', lookupKey: 'filiais', clearOnChange: ['bem_patrimonial_id'] },
      { name: 'bem_patrimonial_id', label: 'Bem patrimonial', type: 'select', valueType: 'number', lookupKey: 'bens', disabled: (form) => !form.filial_id, filterOption: (option, form) => !form.filial_id || String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'data_baixa', label: 'Data da baixa', type: 'date' },
      { name: 'motivo_baixa', label: 'Motivo da baixa', type: 'select', options: [...baixaMotivoOptions] },
      { name: 'valor_baixa', label: 'Valor da baixa', type: 'number' },
      { name: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { label: 'Baixa', render: (item, context) => primaryCell(context.getLookupLabel('bens', item.bem_patrimonial_id), `ID ${item.id} | ${item.data_baixa ?? 'Sem data'}`) },
      { label: 'Filial', render: (item, context) => context.getLookupLabel('filiais', item.filial_id) },
      { label: 'Motivo', render: (item) => primaryCell(getBaixaMotivoLabel(item.motivo_baixa), item.valor_baixa ? `Valor ${formatCurrency(item.valor_baixa)}` : 'Sem valor informado') },
      { label: 'Observações', render: (item) => String(item.observacoes ?? 'Sem observações') },
    ],
  },
  'responsabilidade-bens': {
    key: 'responsabilidade-bens',
    label: 'Responsabilidade de Bens',
    summary: 'Histórico de atribuição de responsabilidade',
    endpoint: 'responsabilidade-bens',
    createLabel: 'Nova responsabilidade',
    emptyMessage: 'Nenhum histórico de responsabilidade cadastrado.',
    lookups: [filialLookup, bemLookup, responsavelLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'filial_id', label: 'Filial', type: 'select', valueType: 'number', lookupKey: 'filiais', clearOnChange: ['bem_patrimonial_id', 'responsavel_id'] },
      { name: 'bem_patrimonial_id', label: 'Bem patrimonial', type: 'select', valueType: 'number', lookupKey: 'bens', clearOnChange: ['responsavel_id'], disabled: (form) => !form.filial_id, filterOption: (option, form) => !form.filial_id || String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      {
        name: 'responsavel_id',
        label: 'Responsável',
        type: 'select',
        valueType: 'number',
        lookupKey: 'responsaveis',
        disabled: (form) => !form.bem_patrimonial_id,
        filterOption: (option, form, lookups) => {
          const bemSelecionado = (lookups.bens ?? []).find(
            (bem) => String(bem.id ?? '') === String(form.bem_patrimonial_id ?? ''),
          );

          if (!form.filial_id || !bemSelecionado) {
            return false;
          }

          return (
            String(option.filial_id ?? '') === String(form.filial_id ?? '') &&
            String(option.departamento_id ?? '') === String(bemSelecionado.departamento_id ?? '')
          );
        },
      },
      { name: 'data_inicio', label: 'Data de início', type: 'date' },
      { name: 'data_fim', label: 'Data de fim', type: 'date' },
      { name: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { label: 'Bem', render: (item, context) => primaryCell(context.getLookupLabel('bens', item.bem_patrimonial_id), `ID ${item.id}`) },
      { label: 'Responsável', render: (item, context) => context.getLookupLabel('responsaveis', item.responsavel_id) },
      { label: 'Período', render: (item) => primaryCell(item.data_inicio ?? 'Sem início', item.data_fim ?? 'Em aberto') },
      { label: 'Observações', render: (item) => String(item.observacoes ?? 'Sem observações') },
    ],
  },
  'historico-localizacao-bens': {
    key: 'historico-localizacao-bens',
    label: 'Histórico de Localização',
    summary: 'Rastreabilidade de localização dos bens',
    endpoint: 'historico-localizacao-bens',
    createLabel: 'Novo histórico',
    emptyMessage: 'Nenhum histórico de localização cadastrado.',
    lookups: [filialLookup, bemLookup, unidadeLookup, departamentoLookup, localLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'filial_id', label: 'Filial', type: 'select', valueType: 'number', lookupKey: 'filiais', clearOnChange: ['bem_patrimonial_id', 'unidade_administrativa_id', 'departamento_id', 'local_id'] },
      { name: 'bem_patrimonial_id', label: 'Bem patrimonial', type: 'select', valueType: 'number', lookupKey: 'bens', disabled: (form) => !form.filial_id, filterOption: (option, form) => !form.filial_id || String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'unidade_administrativa_id', label: 'Unidade administrativa', type: 'select', valueType: 'number', lookupKey: 'unidades', clearOnChange: ['departamento_id', 'local_id'], filterOption: (option, form) => !form.filial_id || String(option.filial_id ?? '') === String(form.filial_id ?? '') },
      { name: 'departamento_id', label: 'Departamento', type: 'select', valueType: 'number', lookupKey: 'departamentos', clearOnChange: ['local_id'], disabled: (form) => !form.unidade_administrativa_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.unidade_administrativa_id ?? '') === String(form.unidade_administrativa_id ?? '') },
      { name: 'local_id', label: 'Local', type: 'select', valueType: 'number', lookupKey: 'locais', disabled: (form) => !form.departamento_id, filterOption: (option, form) => String(option.filial_id ?? '') === String(form.filial_id ?? '') && String(option.unidade_administrativa_id ?? '') === String(form.unidade_administrativa_id ?? '') && String(option.departamento_id ?? '') === String(form.departamento_id ?? '') },
      { name: 'data_inicio', label: 'Data de início', type: 'date' },
      { name: 'data_fim', label: 'Data de fim', type: 'date' },
      { name: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { label: 'Bem', render: (item, context) => primaryCell(context.getLookupLabel('bens', item.bem_patrimonial_id), `ID ${item.id}`) },
      { label: 'Estrutura', render: (item, context) => primaryCell(context.getLookupLabel('unidades', item.unidade_administrativa_id), `${context.getLookupLabel('departamentos', item.departamento_id)} / ${context.getLookupLabel('locais', item.local_id)}`) },
      { label: 'Período', render: (item) => primaryCell(item.data_inicio ?? 'Sem início', item.data_fim ?? 'Atual') },
      { label: 'Observações', render: (item) => String(item.observacoes ?? 'Sem observações') },
    ],
  },
  'metodos-depreciacao': {
    key: 'metodos-depreciacao',
    label: 'Métodos de Depreciação',
    summary: 'Métodos de cálculo de depreciação',
    endpoint: 'metodos-depreciacao',
    createLabel: 'Novo método',
    emptyMessage: 'Nenhum método de depreciação cadastrado.',
    fields: [
      { name: 'nome', label: 'Nome', type: 'text' },
      { name: 'codigo', label: 'Código', type: 'text' },
      { name: 'descricao', label: 'Descrição', type: 'textarea' },
    ],
    columns: [
      { label: 'Método', render: (item) => primaryCell(item.nome, `ID ${item.id}`) },
      { label: 'Código', render: (item) => String(item.codigo ?? 'Sem código') },
      { label: 'Descrição', render: (item) => String(item.descricao ?? 'Sem descrição') },
    ],
  },
  'parametros-depreciacao': {
    key: 'parametros-depreciacao',
    label: 'Parâmetros de Depreciação',
    summary: 'Parâmetros legados de depreciação (mantidos para compatibilidade)',
    endpoint: 'parametros-depreciacao',
    createLabel: 'Configurar parâmetro',
    emptyMessage: 'Nenhum parâmetro de depreciação cadastrado.',
    lookups: [metodoLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'metodo_depreciacao_id', label: 'Método de depreciação', type: 'select', valueType: 'number', lookupKey: 'metodos' },
      { name: 'vida_util_padrao', label: 'Vida útil padrão', type: 'number', valueType: 'number' },
      { name: 'taxa_padrao', label: 'Taxa padrão', type: 'number' },
    ],
    columns: [
      { label: 'Parâmetro', render: (item) => primaryCell(`Parâmetro #${item.id}`, `Empresa ${item.empresa_id ?? '-'}`) },
      { label: 'Método', render: (item, context) => context.getLookupLabel('metodos', item.metodo_depreciacao_id) },
      { label: 'Vida útil', render: (item) => `${item.vida_util_padrao ?? '-'} anos` },
      { label: 'Taxa', render: (item) => `${item.taxa_padrao ?? '-'}%` },
    ],
  },
  depreciacoes: {
    key: 'depreciacoes',
    label: 'Depreciações',
    summary: 'Registros de depreciação patrimonial',
    endpoint: 'depreciacoes',
    createLabel: 'Nova depreciação',
    allowCreate: false,
    emptyMessage: 'Nenhuma depreciação cadastrada.',
    lookups: [bemLookup, metodoLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'bem_patrimonial_id', label: 'Bem patrimonial', type: 'select', valueType: 'number', lookupKey: 'bens' },
      { name: 'metodo_depreciacao_id', label: 'Método de depreciação', type: 'select', valueType: 'number', lookupKey: 'metodos' },
      { name: 'valor_aquisicao', label: 'Valor de aquisicao', type: 'number' },
      { name: 'valor_residual', label: 'Valor residual', type: 'number' },
      { name: 'vida_util_anos', label: 'Vida util (anos)', type: 'number', valueType: 'number' },
      { name: 'data_calculo', label: 'Data do calculo', type: 'date' },
    ],
    columns: [
      { label: 'Depreciacao', render: (item, context) => primaryCell(context.getLookupLabel('bens', item.bem_patrimonial_id), `ID ${item.id} | ${item.data_calculo ?? 'Sem data'}`) },
      { label: 'Método', render: (item, context) => context.getLookupLabel('metodos', item.metodo_depreciacao_id) },
      { label: 'Valores', render: (item) => primaryCell(`Contabil ${item.valor_contabil ?? '-'}`, `Acumulado ${item.valor_depreciado_acumulado ?? '-'}`) },
      { label: 'Taxa anual', render: (item) => String(item.taxa_anual ?? 'Não calculada') },
    ],
  },
  conciliacoes: {
    key: 'conciliacoes',
    label: 'Conciliacoes',
    summary: 'Conciliacao patrimonial do inventario',
    endpoint: 'conciliacoes',
    createLabel: 'Nova conciliacao',
    emptyMessage: 'Nenhuma conciliacao cadastrada.',
    lookups: [inventarioLookup],
    fields: [
      { name: 'inventario_id', label: 'Inventario', type: 'select', valueType: 'number', lookupKey: 'inventarios' },
      { name: 'data_conciliacao', label: 'Data da conciliacao', type: 'date' },
    ],
    columns: [
      { label: 'Conciliacao', render: (item, context) => primaryCell(context.getLookupLabel('inventarios', item.inventario_id), `ID ${item.id}`) },
      { label: 'Sistema / Encontrados', render: (item) => primaryCell(item.total_bens_sistema ?? '-', item.total_bens_encontrados ?? '-') },
      { label: 'Divergencias', render: (item) => String(item.divergencias ?? '-') },
      { label: 'Data', render: (item) => String(item.data_conciliacao ?? 'Sem data') },
    ],
  },
  divergencias: {
    key: 'divergencias',
    label: 'Divergencias',
    summary: 'Apontamentos de divergencia do inventario',
    endpoint: 'divergencias',
    createLabel: 'Nova divergencia',
    emptyMessage: 'Nenhuma divergencia cadastrada.',
    lookups: [inventarioLookup, bemLookup],
    fields: [
      { name: 'inventario_id', label: 'Inventario', type: 'select', valueType: 'number', lookupKey: 'inventarios' },
      { name: 'bem_patrimonial_id', label: 'Bem patrimonial', type: 'select', valueType: 'number', lookupKey: 'bens' },
      { name: 'tipo_divergencia', label: 'Tipo de divergencia', type: 'select', options: [{ value: 'NAO_ENCONTRADO', label: 'NAO_ENCONTRADO' }, { value: 'SEM_TOMBO', label: 'SEM_TOMBO' }, { value: 'LOCAL_DIFERENTE', label: 'LOCAL_DIFERENTE' }, { value: 'RESPONSAVEL_DIFERENTE', label: 'RESPONSAVEL_DIFERENTE' }] },
      { name: 'descricao', label: 'Descrição', type: 'textarea' },
    ],
    columns: [
      { label: 'Divergencia', render: (item) => primaryCell(item.tipo_divergencia, `ID ${item.id}`) },
      { label: 'Inventario', render: (item, context) => context.getLookupLabel('inventarios', item.inventario_id) },
      { label: 'Bem', render: (item, context) => context.getLookupLabel('bens', item.bem_patrimonial_id) },
      { label: 'Descrição', render: (item) => String(item.descricao ?? 'Sem descrição') },
    ],
  },
  auditorias: {
    key: 'auditorias',
    label: 'Auditorias',
    summary: 'Auditorias patrimoniais vinculadas ao inventario',
    endpoint: 'auditorias',
    createLabel: 'Nova auditoria',
    emptyMessage: 'Nenhuma auditoria cadastrada.',
    lookups: [inventarioLookup],
    fields: [
      { name: 'empresa_id', label: 'Empresa', type: 'number', hidden: true, valueType: 'number', defaultValue: ({ empresaId }) => String(empresaId ?? '') },
      { name: 'inventario_id', label: 'Inventario', type: 'select', valueType: 'number', lookupKey: 'inventarios' },
      { name: 'data_auditoria', label: 'Data da auditoria', type: 'date' },
      { name: 'auditor', label: 'Auditor', type: 'text' },
      { name: 'observacoes', label: 'Observações', type: 'textarea' },
    ],
    columns: [
      { label: 'Auditoria', render: (item) => primaryCell(item.auditor, `ID ${item.id} | ${item.data_auditoria ?? 'Sem data'}`) },
      { label: 'Inventario', render: (item, context) => context.getLookupLabel('inventarios', item.inventario_id) },
      { label: 'Observações', render: (item) => String(item.observacoes ?? 'Sem observações') },
      { label: 'Empresa', render: (item) => String(item.empresa_id ?? '-') },
    ],
  },
};

export function getCrudModuleConfig(slug: string) {
  return moduleCrudConfig[slug] ?? null;
}

