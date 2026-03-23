'use client';

import { useEffect, useState, useTransition } from 'react';

import type { EmpresaItem } from '@/lib/admin-api';
import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

import EmpresaModal from './EmpresaModal';
import SystemConfirmDialog from './SystemConfirmDialog';
import SystemFeedbackStack from './SystemFeedbackStack';

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

type EmpresaRecord = EmpresaItem & {
  timezone?: string | null;
  cep?: string | null;
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  filiais?: Array<{
    id: number;
    matriz?: boolean;
    endereco?: string | null;
    cep?: string | null;
    numero?: string | null;
    complemento?: string | null;
    bairro?: string | null;
    cidade?: string | null;
    estado?: string | null;
  }>;
};

type ModalMode = 'create' | 'view' | 'edit' | null;
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => Promise<void> | void;
};

const initialEmpresaForm: EmpresaFormState = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  inscricao_estadual: '',
  email: '',
  telefone: '',
  status: 'ativo',
};

const initialEnderecoForm: EnderecoFormState = {
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M1.5 12s3.9-6.5 10.5-6.5S22.5 12 22.5 12 18.6 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="m4 20 4.1-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.1 16 4 20Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M4 7h16" />
      <path d="M9 7V4.8c0-.4.4-.8.8-.8h4.4c.4 0 .8.4.8.8V7" />
      <path d="M6.2 7 7 19.2c0 .5.4.8.8.8h8.4c.4 0 .8-.3.8-.8L17.8 7" />
      <path d="M10 11.2v4.6" />
      <path d="M14 11.2v4.6" />
    </svg>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full bg-[rgba(246,164,0,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
      {status}
    </span>
  );
}

export default function EmpresaManagement({ initialEmpresas }: { initialEmpresas: EmpresaItem[] }) {
  const [empresas, setEmpresas] = useState<EmpresaRecord[]>(initialEmpresas);
  const [empresaForm, setEmpresaForm] = useState<EmpresaFormState>(initialEmpresaForm);
  const [enderecoForm, setEnderecoForm] = useState<EnderecoFormState>(initialEnderecoForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [consultaError, setConsultaError] = useState<string | null>(null);
  const [consultaMessage, setConsultaMessage] = useState<string | null>(null);
  const [isLoadingEmpresas, setIsLoadingEmpresas] = useState(false);
  const [isConsultandoCnpj, setIsConsultandoCnpj] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaRecord | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [removeLogoRequested, setRemoveLogoRequested] = useState(false);

  useEffect(() => {
    if (!modalMode) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalMode]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  function updateEmpresaField<K extends keyof EmpresaFormState>(field: K, value: EmpresaFormState[K]) {
    setEmpresaForm((current) => ({ ...current, [field]: value }));
  }

  function updateEnderecoField<K extends keyof EnderecoFormState>(field: K, value: EnderecoFormState[K]) {
    setEnderecoForm((current) => ({ ...current, [field]: value }));
  }

  function resetModal() {
    if (logoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setModalMode(null);
    setModalStep(1);
    setSelectedEmpresa(null);
    setEmpresaForm(initialEmpresaForm);
    setEnderecoForm(initialEnderecoForm);
    setError(null);
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setRemoveLogoRequested(false);
  }

  function hydrateFormsFromEmpresa(empresa: EmpresaRecord) {
    const matriz = empresa.filiais?.find((filial) => filial.matriz) ?? empresa.filiais?.[0];

    setEmpresaForm({
      razao_social: empresa.razao_social ?? '',
      nome_fantasia: empresa.nome_fantasia ?? '',
      cnpj: empresa.cnpj ?? '',
      inscricao_estadual: '',
      email: empresa.email ?? '',
      telefone: empresa.telefone ?? '',
      status: empresa.status ?? 'ativo',
    });
    setEnderecoForm({
      cep: empresa.cep ?? matriz?.cep ?? '',
      endereco: empresa.endereco ?? matriz?.endereco ?? '',
      numero: empresa.numero ?? matriz?.numero ?? '',
      complemento: empresa.complemento ?? matriz?.complemento ?? '',
      bairro: empresa.bairro ?? matriz?.bairro ?? '',
      cidade: empresa.cidade ?? matriz?.cidade ?? '',
      estado: empresa.estado ?? matriz?.estado ?? '',
    });
    setLogoFile(null);
    setLogoPreviewUrl(empresa.logo_url ?? null);
    setRemoveLogoRequested(false);
  }

  async function fetchEmpresaDetail(empresaId: number) {
    const response = await fetch(`/api/empresas/${empresaId}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    const payload = (await response.json().catch(() => null)) as { data?: EmpresaRecord; message?: string } | null;

    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      return null;
    }

    if (!response.ok || !payload?.data) {
      throw new Error(payload?.message ?? `Falha ao consultar a empresa: ${response.status}`);
    }

    return payload.data;
  }

  function openCreateModal() {
    resetModal();
    setModalMode('create');
  }

  async function openViewModal(empresa: EmpresaRecord) {
    setError(null);

    try {
      const detailedEmpresa = await fetchEmpresaDetail(empresa.id);

      if (!detailedEmpresa) {
        return;
      }

      setSelectedEmpresa(detailedEmpresa);
      hydrateFormsFromEmpresa(detailedEmpresa);
      setModalStep(1);
      setModalMode('view');
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'NÃ£o foi possÃ­vel carregar os dados da empresa.');
    }
  }

  async function openEditModal(empresa: EmpresaRecord) {
    setError(null);

    try {
      const detailedEmpresa = await fetchEmpresaDetail(empresa.id);

      if (!detailedEmpresa) {
        return;
      }

      setSelectedEmpresa(detailedEmpresa);
      hydrateFormsFromEmpresa(detailedEmpresa);
      setModalStep(1);
      setModalMode('edit');
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'NÃ£o foi possÃ­vel carregar os dados da empresa.');
    }
  }

  async function handleConsultarEmpresas() {
    setConsultaError(null);
    setConsultaMessage(null);
    setIsLoadingEmpresas(true);

    try {
      const response = await fetch('/api/empresas', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as { data?: EmpresaRecord[]; message?: string } | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message ?? `Falha ao consultar empresas: ${response.status}`);
      }

      setEmpresas(payload?.data ?? []);
      setConsultaMessage('Consulta executada com sucesso.');
    } catch (fetchError) {
      setConsultaError(fetchError instanceof Error ? fetchError.message : 'NÃ£o foi possÃ­vel consultar as empresas.');
    } finally {
      setIsLoadingEmpresas(false);
    }
  }

  async function persistEmpresa() {
    const endpoint = modalMode === 'edit' && selectedEmpresa ? `/api/empresas/${selectedEmpresa.id}` : '/api/empresas';
    const method = modalMode === 'edit' ? 'PUT' : 'POST';

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...empresaForm,
        ...enderecoForm,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          data?: EmpresaRecord;
          message?: string;
          errors?: Record<string, string[]>;
        }
      | null;

    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      throw new Error('Sessao expirada.');
    }

    if (!response.ok || !payload?.data) {
      const firstError = payload?.errors ? Object.values(payload.errors).flat().find(Boolean) : null;
      throw new Error(firstError ?? payload?.message ?? 'NÃ£o foi possÃ­vel salvar a empresa.');
    }

    return payload.data;
  }

  async function persistEmpresaLogo(empresaId: number) {
    const fileToUpload = logoFile;

    if (!fileToUpload && !removeLogoRequested) {
      return null;
    }

    if (!fileToUpload && removeLogoRequested) {
      const response = await fetch(`/api/admin/empresas/${empresaId}/logo`, {
        method: 'DELETE',
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            data?: EmpresaRecord;
            message?: string;
          }
        | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        throw new Error('Sessao expirada.');
      }

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message ?? 'Nao foi possivel remover o logo da empresa.');
      }

      return payload.data;
    }

    if (!fileToUpload) {
      return null;
    }

    const formData = new FormData();
    formData.append('logo', fileToUpload);

    const response = await fetch(`/api/admin/empresas/${empresaId}/logo`, {
      method: 'POST',
      body: formData,
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          data?: EmpresaRecord;
          message?: string;
          errors?: Record<string, string[]>;
        }
      | null;

    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      throw new Error('Sessao expirada.');
    }

    if (!response.ok || !payload?.data) {
      const firstError = payload?.errors ? Object.values(payload.errors).flat().find(Boolean) : null;
      throw new Error(firstError ?? payload?.message ?? 'Nao foi possivel enviar o logo da empresa.');
    }

    return payload.data;
  }

  async function handleConsultarCnpj() {
    setError(null);
    setConsultaError(null);
    setConsultaMessage(null);

    const cnpjDigits = empresaForm.cnpj.replace(/\D/g, '');

    if (cnpjDigits.length !== 14) {
      setError('Informe um CNPJ valido para consultar.');
      return;
    }

    setIsConsultandoCnpj(true);

    try {
      const response = await fetch(`/api/empresas/cnpj?cnpj=${cnpjDigits}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            data?: Partial<EmpresaFormState & EnderecoFormState>;
            message?: string;
          }
        | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message ?? 'NÃ£o foi possÃ­vel consultar este CNPJ.');
      }

      setEmpresaForm((current) => ({
        ...current,
        cnpj: payload.data?.cnpj ?? current.cnpj,
        razao_social: payload.data?.razao_social ?? current.razao_social,
        nome_fantasia: payload.data?.nome_fantasia ?? current.nome_fantasia,
        email: payload.data?.email ?? current.email,
        telefone: payload.data?.telefone ?? current.telefone,
      }));

      setEnderecoForm((current) => ({
        ...current,
        cep: payload.data?.cep ?? current.cep,
        endereco: payload.data?.endereco ?? current.endereco,
        numero: payload.data?.numero ?? current.numero,
        complemento: payload.data?.complemento ?? current.complemento,
        bairro: payload.data?.bairro ?? current.bairro,
        cidade: payload.data?.cidade ?? current.cidade,
        estado: payload.data?.estado ?? current.estado,
      }));

      setConsultaMessage('Dados da empresa preenchidos a partir do CNPJ.');
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'NÃ£o foi possÃ­vel consultar o CNPJ.');
    } finally {
      setIsConsultandoCnpj(false);
    }
  }

  function handleLogoChange(file: File | null) {
    if (logoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(file);
    setRemoveLogoRequested(false);
    setLogoPreviewUrl(file ? URL.createObjectURL(file) : selectedEmpresa?.logo_url ?? null);
  }

  function handleRemoveLogo() {
    if (logoPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(null);
    setLogoPreviewUrl(null);
    setRemoveLogoRequested(true);
  }

  async function handleModalNext() {
    setError(null);
    setMessage(null);

    if (modalMode === 'view') {
      if (modalStep === 1) {
        setModalStep(2);
      } else {
        resetModal();
      }
      return;
    }

    if (modalStep === 1) {
      setModalStep(2);
      return;
    }

    try {
      const savedEmpresa = await persistEmpresa();
      const savedEmpresaWithLogo = (await persistEmpresaLogo(savedEmpresa.id)) ?? savedEmpresa;

      startTransition(() => {
        setEmpresas((current) => {
          if (modalMode === 'edit') {
            return current.map((empresa) => (empresa.id === savedEmpresa.id ? savedEmpresaWithLogo : empresa));
          }

          return [savedEmpresaWithLogo, ...current];
        });
      });

      setMessage(modalMode === 'edit' ? 'Empresa atualizada com sucesso.' : 'Empresa cadastrada com sucesso.');
      resetModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'NÃ£o foi possÃ­vel salvar a empresa.');
    }
  }

  async function handleDeleteEmpresa(empresa: EmpresaRecord) {
    setConfirmDialog({
      title: 'Excluir empresa',
      description: `Deseja excluir a empresa "${empresa.nome_fantasia}"?`,
      confirmLabel: 'Excluir',
      action: async () => {
        setConsultaError(null);
        setConsultaMessage(null);

        const response = await fetch(`/api/empresas/${empresa.id}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        });

        const payload = (await response.json().catch(() => null)) as { message?: string } | null;

        if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
          return;
        }

        if (!response.ok) {
          setConsultaError(payload?.message ?? 'NÃ£o foi possÃ­vel excluir a empresa.');
          return;
        }

        setEmpresas((current) => current.filter((item) => item.id !== empresa.id));
        setConsultaMessage(payload?.message ?? 'Empresa excluida com sucesso.');
      },
    });
  }

  async function handleConfirmAction() {
    if (!confirmDialog) {
      return;
    }

    setConfirmBusy(true);

    try {
      await confirmDialog.action();
      setConfirmDialog(null);
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <>
      <SystemFeedbackStack
        error={consultaError ?? error}
        message={consultaMessage ?? message}
        onCloseError={() => {
          setConsultaError(null);
          setError(null);
        }}
        onCloseMessage={() => {
          setConsultaMessage(null);
          setMessage(null);
        }}
      />
      <section className="panel-surface rounded-[28px] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Empresas cadastradas</p>
            <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">Base empresarial do NWB Asset</h2>
            <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
              Cadastro manual com popup em etapas e consulta sob demanda. Ao criar a empresa, o sistema ja gera automaticamente a filial matriz. A integracao automatica com o NWB System pode ser conectada a esta mesma tela depois.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={openCreateModal} className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:opacity-90">
              Cadastro Empresa
            </button>
            <button
              type="button"
              onClick={handleConsultarEmpresas}
              disabled={isLoadingEmpresas}
              className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoadingEmpresas ? 'Consultando...' : 'Consultar empresas'}
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-[var(--line)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  <th className="px-4 py-4">Empresa</th>
                  <th className="px-4 py-4">ID / Codigo</th>
                  <th className="px-4 py-4">CNPJ</th>
                  <th className="px-4 py-4">Contato</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {empresas.map((empresa) => (
                  <tr key={empresa.id} className="border-t border-[var(--line)] text-sm text-[var(--ink)]">
                    <td className="px-4 py-4">
                      <p className="font-semibold">{empresa.nome_fantasia}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{empresa.razao_social}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold">ID {empresa.id}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{empresa.codigo ?? 'Codigo automatico'}</p>
                    </td>
                    <td className="px-4 py-4">{empresa.cnpj}</td>
                    <td className="px-4 py-4">
                      <p>{empresa.email ?? 'Sem e-mail'}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{empresa.telefone ?? 'Sem telefone'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={empresa.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button type="button" onClick={() => openViewModal(empresa)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]" aria-label="Visualizar empresa" title="Visualizar empresa">
                          <EyeIcon />
                        </button>
                        <button type="button" onClick={() => openEditModal(empresa)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]" aria-label="Editar empresa" title="Editar empresa">
                          <PencilIcon />
                        </button>
                        <button type="button" onClick={() => handleDeleteEmpresa(empresa)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(190,18,60,0.15)] bg-white text-[var(--rose)] transition hover:border-[rgba(190,18,60,0.35)] hover:bg-[rgba(190,18,60,0.06)]" aria-label="Excluir empresa" title="Excluir empresa">
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {empresas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      Clique em &quot;Consultar empresas&quot; para carregar os registros ou use &quot;Cadastro Empresa&quot; para abrir o formulario popup.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {modalMode ? (
        <EmpresaModal
          mode={modalMode}
          step={modalStep}
          isPending={isPending}
          isConsultandoCnpj={isConsultandoCnpj}
          empresa={selectedEmpresa}
          empresaForm={empresaForm}
          enderecoForm={enderecoForm}
          error={error}
          logoPreviewUrl={logoPreviewUrl}
          hasLogo={Boolean(logoPreviewUrl)}
          onClose={resetModal}
          onBack={() => setModalStep((current) => (current === 2 ? 1 : current))}
          onNext={handleModalNext}
          onConsultarCnpj={handleConsultarCnpj}
          onLogoChange={handleLogoChange}
          onRemoveLogo={handleRemoveLogo}
          onEmpresaChange={updateEmpresaField}
          onEnderecoChange={updateEnderecoField}
        />
      ) : null}

      <SystemConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel}
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirmDialog(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </>
  );
}

