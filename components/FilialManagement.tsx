'use client';

import { useEffect, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

import SystemConfirmDialog from './SystemConfirmDialog';
import SystemFeedbackStack from './SystemFeedbackStack';

type FilialItem = {
  id: number;
  empresa_id: number;
  codigo: string;
  nome: string;
  cnpj?: string | null;
  matriz: boolean;
  endereco?: string | null;
  cep?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  status: string;
};

type FilialFormState = {
  nome: string;
  cnpj: string;
  endereco: string;
  cep: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  status: string;
};

const initialForm: FilialFormState = {
  nome: '',
  cnpj: '',
  endereco: '',
  cep: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  status: 'ativo',
};
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => Promise<void> | void;
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

function BranchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M12 5v14" />
      <path d="M12 9h6" />
      <path d="M12 15H6" />
      <circle cx="12" cy="5" r="2" />
      <circle cx="18" cy="9" r="2" />
      <circle cx="6" cy="15" r="2" />
    </svg>
  );
}

function StatusBadge({ status, matriz = false }: { status: string; matriz?: boolean }) {
  if (matriz) {
    return (
      <span className="inline-flex rounded-full bg-[rgba(37,99,235,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
        Matriz
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-[rgba(246,164,0,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
      {status}
    </span>
  );
}

function maskCnpj(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14);

  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export default function FilialManagement(_: { empresaId: number | null }) {
  const [filiais, setFiliais] = useState<FilialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedFilial, setSelectedFilial] = useState<FilialItem | null>(null);
  const [form, setForm] = useState<FilialFormState>(initialForm);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const isReadOnly = modalMode === 'view';

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
    void loadFiliais();
  }, []);

  async function loadFiliais() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/filiais', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as { data?: FilialItem[]; message?: string } | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message ?? `Falha ao consultar filiais: ${response.status}`);
      }

      setFiliais(payload?.data ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Não foi possível consultar as filiais.');
    } finally {
      setLoading(false);
    }
  }

  function resetModal() {
    setModalMode(null);
    setSelectedFilial(null);
    setForm(initialForm);
  }

  function updateField<K extends keyof FilialFormState>(field: K, value: FilialFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setSelectedFilial(null);
    setForm(initialForm);
    setModalMode('create');
  }

  function openViewModal(filial: FilialItem) {
    setSelectedFilial(filial);
    setForm({
      nome: filial.nome ?? '',
      cnpj: filial.cnpj ?? '',
      endereco: filial.endereco ?? '',
      cep: filial.cep ?? '',
      numero: filial.numero ?? '',
      complemento: filial.complemento ?? '',
      bairro: filial.bairro ?? '',
      cidade: filial.cidade ?? '',
      estado: filial.estado ?? '',
      status: filial.status ?? 'ativo',
    });
    setModalMode('view');
  }

  function openEditModal(filial: FilialItem) {
    setSelectedFilial(filial);
    setForm({
      nome: filial.nome ?? '',
      cnpj: filial.cnpj ?? '',
      endereco: filial.endereco ?? '',
      cep: filial.cep ?? '',
      numero: filial.numero ?? '',
      complemento: filial.complemento ?? '',
      bairro: filial.bairro ?? '',
      cidade: filial.cidade ?? '',
      estado: filial.estado ?? '',
      status: filial.status ?? 'ativo',
    });
    setModalMode('edit');
  }

  async function handleSubmit() {
    const endpoint = modalMode === 'edit' && selectedFilial ? `/api/filiais/${selectedFilial.id}` : '/api/filiais';
    const method = modalMode === 'edit' ? 'PUT' : 'POST';

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...form,
        cnpj: form.cnpj || null,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          data?: FilialItem;
          message?: string;
          errors?: Record<string, string[]>;
        }
      | null;

    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      return;
    }

    if (!response.ok || !payload?.data) {
      const firstError = payload?.errors ? Object.values(payload.errors).flat().find(Boolean) : null;
      setError(firstError ?? payload?.message ?? 'Não foi possível salvar a filial.');
      return;
    }

    setMessage(modalMode === 'edit' ? 'Filial atualizada com sucesso.' : 'Filial cadastrada com sucesso.');
    resetModal();
    await loadFiliais();
  }

  async function handleDelete(filial: FilialItem) {
    setConfirmDialog({
      title: 'Excluir filial',
      description: `Deseja excluir a filial "${filial.nome}"?`,
      confirmLabel: 'Excluir',
      action: async () => {
        const response = await fetch(`/api/filiais/${filial.id}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        });

        const payload = (await response.json().catch(() => null)) as { message?: string } | null;

        if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
          return;
        }

        if (!response.ok) {
          setError(payload?.message ?? 'Não foi possível excluir a filial.');
          return;
        }

        setMessage(payload?.message ?? 'Filial excluida com sucesso.');
        await loadFiliais();
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
        error={error}
        message={message}
        onCloseError={() => setError(null)}
        onCloseMessage={() => setMessage(null)}
      />
      <section className="panel-surface rounded-[28px] p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Filiais</p>
            <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">Estrutura de filiais da empresa</h2>
            <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
              Toda empresa possui pelo menos uma filial matriz. Se a empresa Não tiver outras unidades, essa matriz representa a própria operação principal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4.5 text-[13px] font-semibold text-white transition hover:opacity-90"
            >
              Nova filial
            </button>
            <button
              type="button"
              onClick={() => void loadFiliais()}
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4.5 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              Atualizar
            </button>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-[24px] border border-[var(--line)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                  <th className="px-4 py-3.5">Filial</th>
                  <th className="px-4 py-3.5">Código</th>
                  <th className="px-4 py-3.5">Cidade / UF</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      Carregando filiais...
                    </td>
                  </tr>
                ) : filiais.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      Nenhuma filial cadastrada.
                    </td>
                  </tr>
                ) : (
                  filiais.map((filial) => (
                    <tr key={filial.id} className="border-t border-[var(--line)] text-[13px] text-[var(--ink)]">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(37,99,235,0.08)] text-[var(--accent)]">
                          <BranchIcon />
                        </span>
                        <div>
                          <p className="font-semibold">{filial.nome}</p>
                          <p className="mt-1 text-xs text-[var(--muted)]">ID {filial.id} {filial.cnpj ? `| ${filial.cnpj}` : '| Sem CNPJ informado'}</p>
                        </div>
                      </div>
                    </td>
                      <td className="px-4 py-3.5">{filial.codigo}</td>
                      <td className="px-4 py-3.5">{[filial.cidade, filial.estado].filter(Boolean).join(' / ') || 'Não informado'}</td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={filial.status} matriz={filial.matriz} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openViewModal(filial)}
                            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            aria-label="Visualizar filial"
                            title="Visualizar filial"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(filial)}
                            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            aria-label="Editar filial"
                            title="Editar filial"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(filial)}
                            className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[rgba(190,18,60,0.15)] bg-white text-[var(--rose)] transition hover:border-[rgba(190,18,60,0.35)] hover:bg-[rgba(190,18,60,0.06)]"
                            aria-label="Excluir filial"
                            title="Excluir filial"
                          >
                            <TrashIcon />
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
      </section>

      {modalMode ? (
        <div className="admin-modal-overlay">
          <div className="panel-surface admin-modal-shell admin-modal-shell--md rounded-[28px] p-3 md:p-3.5 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="admin-modal-kicker">Filiais</p>
                <h3 className="admin-modal-title">
                  {modalMode === 'create' ? 'Nova filial' : modalMode === 'edit' ? 'Editar filial' : 'Visualizar filial'}
                </h3>
                <p className="admin-modal-copy">
                  A filial matriz representa a unidade principal da empresa. Novas filiais sao unidades adicionais.
                </p>
              </div>

              <button type="button" onClick={resetModal} className="admin-btn-secondary">
                Fechar
              </button>
            </div>

            <div className="admin-modal-content mt-3 pr-1">
            <section className="admin-step-shell">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="admin-modal-kicker">Dados do cadastro</p>
                  <p className="mt-1 text-[12px] text-[var(--muted)]">Estruture a matriz ou filial adicional com o mesmo visual do modulo patrimonial.</p>
                </div>
                <p className="text-[13px] font-semibold text-[var(--ink)]">{modalMode === 'create' ? 'Novo cadastro' : modalMode === 'edit' ? 'Edicao' : 'Consulta'}</p>
              </div>
            </section>

            <div className="mt-3">
              <div className="admin-modal-block">
                <div className="admin-modal-form-grid md:grid-cols-2">
                  <label className="admin-field md:col-span-2">
                    Nome da filial
                    <input type="text" value={form.nome} onChange={(event) => updateField('nome', event.target.value)} disabled={isReadOnly} className="admin-input" />
                  </label>
                  <label className="admin-field">
                    Código do cadastro
                    <input
                      type="text"
                      value={selectedFilial?.codigo ?? ''}
                      disabled
                      placeholder="Gerado automaticamente ao salvar"
                      className="admin-input"
                    />
                  </label>
                  <label className="admin-field">
                    CNPJ
                    <input type="text" value={maskCnpj(form.cnpj)} onChange={(event) => updateField('cnpj', maskCnpj(event.target.value))} disabled={isReadOnly} placeholder="00.000.000/0000-00" className="admin-input" />
                  </label>
                  <label className="admin-field md:col-span-2">
                    Endereco
                    <input type="text" value={form.endereco} onChange={(event) => updateField('endereco', event.target.value)} disabled={isReadOnly} className="admin-input" />
                  </label>
                  <label className="admin-field">
                    CEP
                    <input type="text" value={form.cep} onChange={(event) => updateField('cep', event.target.value)} disabled={isReadOnly} className="admin-input" />
                  </label>
                  <label className="admin-field">
                    Numero
                    <input type="text" value={form.numero} onChange={(event) => updateField('numero', event.target.value)} disabled={isReadOnly} className="admin-input" />
                  </label>
                  <label className="admin-field md:col-span-2">
                    Complemento
                    <input type="text" value={form.complemento} onChange={(event) => updateField('complemento', event.target.value)} disabled={isReadOnly} className="admin-input" />
                  </label>
                  <label className="admin-field md:col-span-2">
                    Bairro
                    <input type="text" value={form.bairro} onChange={(event) => updateField('bairro', event.target.value)} disabled={isReadOnly} className="admin-input" />
                  </label>
                  <label className="admin-field">
                    Cidade
                    <input type="text" value={form.cidade} onChange={(event) => updateField('cidade', event.target.value)} disabled={isReadOnly} className="admin-input" />
                  </label>
                  <label className="admin-field">
                    Estado
                    <input type="text" value={form.estado} onChange={(event) => updateField('estado', event.target.value.toUpperCase().slice(0, 2))} disabled={isReadOnly} className="admin-input" />
                  </label>
                  <label className="admin-field">
                    Status
                    <select value={form.status} onChange={(event) => updateField('status', event.target.value)} disabled={isReadOnly} className="admin-select">
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
            </div>

            {!isReadOnly ? (
              <div className="admin-modal-footer -mx-3 px-3 md:-mx-3.5 md:px-3.5">
                <div className="flex justify-end">
                <button type="button" onClick={() => void handleSubmit()} className="admin-btn-primary">
                  {modalMode === 'edit' ? 'Salvar altera??es' : 'Cadastrar filial'}
                </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
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



