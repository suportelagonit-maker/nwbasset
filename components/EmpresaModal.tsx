'use client';

import Image from 'next/image';

type EmpresaFormState = {
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  inscricao_estadual: string;
  email: string;
  telefone: string;
  status: string;
};

type EnderecoFormState = {
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
};

type EmpresaRecord = {
  id: number;
  nome_fantasia: string;
  codigo?: string | null;
  logo_url?: string | null;
  status: string;
  updated_at?: string | null;
};

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M4 20V6.8c0-.4.3-.8.8-.8h8.4c.5 0 .8.4.8.8V20" />
      <path d="M14 10.8h4.2c.4 0 .8.3.8.8V20" />
      <path d="M8 10h2" />
      <path d="M8 13h2" />
      <path d="M8 16h2" />
      <path d="M14 14h2" />
      <path d="M11 20v-3.6c0-.2.2-.4.4-.4h1.2c.2 0 .4.2.4.4V20" />
    </svg>
  );
}

function MarkerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </svg>
  );
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

function maskCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskTelefone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full bg-[rgba(246,164,0,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
      {status}
    </span>
  );
}

export default function EmpresaModal({
  mode,
  step,
  isPending,
  isConsultandoCnpj,
  empresa,
  empresaForm,
  enderecoForm,
  error,
  logoPreviewUrl,
  hasLogo,
  onClose,
  onBack,
  onNext,
  onConsultarCnpj,
  onLogoChange,
  onRemoveLogo,
  onEmpresaChange,
  onEnderecoChange,
}: {
  mode: 'create' | 'view' | 'edit';
  step: 1 | 2;
  isPending: boolean;
  isConsultandoCnpj: boolean;
  empresa: EmpresaRecord | null;
  empresaForm: EmpresaFormState;
  enderecoForm: EnderecoFormState;
  error: string | null;
  logoPreviewUrl: string | null;
  hasLogo: boolean;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
  onConsultarCnpj: () => void;
  onLogoChange: (file: File | null) => void;
  onRemoveLogo: () => void;
  onEmpresaChange: <K extends keyof EmpresaFormState>(field: K, value: EmpresaFormState[K]) => void;
  onEnderecoChange: <K extends keyof EnderecoFormState>(field: K, value: EnderecoFormState[K]) => void;
}) {
  const isReadOnly = mode === 'view';
  const title = mode === 'create' ? 'Cadastro de empresa' : mode === 'edit' ? 'Editar empresa' : 'Visualizar empresa';
  const description =
    step === 1
      ? 'Etapa 1 de 2: dados principais da empresa conforme a tabela atual do sistema.'
      : 'Etapa 2 de 2: endereco visual para complementar o fluxo de cadastro no popup.';
  const logoInputId = `empresa-logo-${empresa?.id ?? 'novo'}`;

  return (
    <div className="admin-modal-overlay">
      <div className="panel-surface admin-modal-shell admin-modal-shell--md rounded-[28px] p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
        <div className="flex flex-col gap-2.5 border-b border-[var(--line)] pb-2.5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="admin-modal-kicker">Empresas</p>
            <h3 className="admin-modal-title">{title}</h3>
            <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-[var(--muted)]">{description}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="admin-btn-secondary"
          >
            Fechar
          </button>
        </div>

        <div className="admin-modal-content mt-2.5 pr-1">
        <section className="admin-step-shell">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="admin-modal-kicker">Etapas do cadastro</p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                {step === 1 ? 'Preencha os dados principais da empresa.' : 'Complete o fluxo com o endereco de apoio.'}
              </p>
            </div>
            <p className="text-[13px] font-semibold text-[var(--ink)]">Etapa {step} de 2</p>
          </div>

          <div className="admin-step-grid mt-2.5 md:grid-cols-2">
            <div className={`admin-step-card ${step === 1 ? 'admin-step-card--active' : step === 2 ? 'admin-step-card--done' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="admin-step-badge">1</span>
                <div>
                  <p className="admin-step-title">Dados da empresa</p>
                  <p className="admin-step-copy">Razao social, contato e status.</p>
                </div>
              </div>
            </div>
            <div className={`admin-step-card ${step === 2 ? 'admin-step-card--active' : ''}`}>
              <div className="flex items-start gap-3">
                <span className="admin-step-badge">2</span>
                <div>
                  <p className="admin-step-title">Endereco</p>
                  <p className="admin-step-copy">Complemento visual e dados auxiliares.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-2.5">
          <div className="admin-modal-block">
            {step === 1 ? (
              <div className="admin-modal-form-grid md:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-[18px] border border-[var(--line)] bg-[#fcfdff] p-3 md:col-span-2 xl:col-span-2 xl:row-span-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Logo da empresa</p>
                  <div className="mt-3 flex min-h-[148px] items-center justify-center overflow-hidden rounded-[16px] border border-dashed border-[var(--line)] bg-white p-3">
                    {logoPreviewUrl ? (
                      <Image
                        src={logoPreviewUrl}
                        alt="Logo da empresa"
                        width={220}
                        height={120}
                        className="h-auto max-h-[112px] w-auto max-w-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="text-center text-[12px] leading-5 text-[var(--muted)]">
                        Envie o logo para usar na placa
                        <br />
                        patrimonial da empresa.
                      </div>
                    )}
                  </div>
                  {!isReadOnly ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <input
                        id={logoInputId}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => onLogoChange(event.target.files?.[0] ?? null)}
                      />
                      <label htmlFor={logoInputId} className="admin-btn-secondary cursor-pointer">
                        {hasLogo ? 'Trocar logo' : 'Upload do logo'}
                      </label>
                      {hasLogo ? (
                        <button type="button" onClick={onRemoveLogo} className="admin-btn-secondary">
                          Remover
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <label className="admin-field md:col-span-2">
                  Razao social
                  <input type="text" value={empresaForm.razao_social} onChange={(event) => onEmpresaChange('razao_social', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field md:col-span-2 xl:col-span-2">
                  Nome fantasia
                  <input type="text" value={empresaForm.nome_fantasia} onChange={(event) => onEmpresaChange('nome_fantasia', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field xl:col-span-2">
                  Código de cadastro
                  <input
                    type="text"
                    value={empresa?.codigo ?? ''}
                    disabled
                    placeholder="Gerado automaticamente"
                    className="admin-input"
                  />
                </label>
                <div className="admin-field xl:col-span-2">
                  <span>CNPJ</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={maskCnpj(empresaForm.cnpj)}
                      onChange={(event) => onEmpresaChange('cnpj', maskCnpj(event.target.value))}
                      disabled={isReadOnly}
                      placeholder="00.000.000/0000-00"
                      className="admin-input flex-1"
                    />
                    {!isReadOnly ? (
                      <button
                        type="button"
                        onClick={onConsultarCnpj}
                        disabled={isConsultandoCnpj}
                        className="admin-btn-secondary shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isConsultandoCnpj ? 'Consultando...' : 'Consultar'}
                      </button>
                    ) : null}
                  </div>
                </div>
                <label className="admin-field xl:col-span-2">
                  Inscricao estadual
                  <input type="text" value={empresaForm.inscricao_estadual} onChange={(event) => onEmpresaChange('inscricao_estadual', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field xl:col-span-2">
                  E-mail
                  <input type="email" value={empresaForm.email} onChange={(event) => onEmpresaChange('email', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field xl:col-span-1">
                  Telefone
                  <input
                    type="text"
                    value={maskTelefone(empresaForm.telefone)}
                    onChange={(event) => onEmpresaChange('telefone', maskTelefone(event.target.value))}
                    disabled={isReadOnly}
                    placeholder="(00) 00000-0000"
                    className="admin-input"
                  />
                </label>
                <label className="admin-field xl:col-span-1">
                  Status
                  <select value={empresaForm.status} onChange={(event) => onEmpresaChange('status', event.target.value)} disabled={isReadOnly} className="admin-select">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </label>
              </div>
            ) : (
              <div className="admin-modal-form-grid md:grid-cols-2 xl:grid-cols-4">
                <label className="admin-field">
                  CEP
                  <input type="text" value={enderecoForm.cep} onChange={(event) => onEnderecoChange('cep', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field">
                  Numero
                  <input type="text" value={enderecoForm.numero} onChange={(event) => onEnderecoChange('numero', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field xl:col-span-2">
                  Complemento
                  <input type="text" value={enderecoForm.complemento} onChange={(event) => onEnderecoChange('complemento', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field md:col-span-2 xl:col-span-4">
                  Endereco
                  <input type="text" value={enderecoForm.endereco} onChange={(event) => onEnderecoChange('endereco', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field">
                  Bairro
                  <input type="text" value={enderecoForm.bairro} onChange={(event) => onEnderecoChange('bairro', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field">
                  Cidade
                  <input type="text" value={enderecoForm.cidade} onChange={(event) => onEnderecoChange('cidade', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <label className="admin-field">
                  Estado
                  <input type="text" value={enderecoForm.estado} onChange={(event) => onEnderecoChange('estado', event.target.value)} disabled={isReadOnly} className="admin-input" />
                </label>
                <div className="rounded-[16px] border border-dashed border-[var(--line)] bg-white px-3 py-3 text-[12px] leading-5 text-[var(--muted)] md:col-span-2">
                  Esta etapa de endereco foi adicionada ao popup conforme o fluxo visual solicitado. O backend atual continua preservado.
                </div>
              </div>
            )}
          </div>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
            {error}
          </div>
        ) : null}
        </div>

        <div className="admin-modal-footer -mx-3 mt-3 px-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              disabled={step === 1}
              className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Voltar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="admin-btn-secondary"
            >
              Cancelar
            </button>
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={isPending}
            className="admin-btn-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isReadOnly ? (step === 1 ? 'Avançar etapa' : 'Fechar consulta') : step === 1 ? 'Continuar' : isPending ? 'Salvando...' : mode === 'edit' ? 'Salvar alterações' : 'Cadastrar empresa'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}


