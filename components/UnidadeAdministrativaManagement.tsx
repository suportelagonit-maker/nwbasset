'use client';

import { useEffect, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

import SystemConfirmDialog from './SystemConfirmDialog';
import SystemFeedbackStack from './SystemFeedbackStack';

type FilialItem = {
  id: number;
  nome: string;
  codigo: string;
  matriz: boolean;
  status: string;
};

type UnidadeItem = {
  id: number;
  empresa_id: number;
  filial_id: number;
  nome: string;
  codigo: string;
  descricao?: string | null;
  status: string;
};

type UnidadeFormState = {
  filial_id: string;
  nome: string;
  descricao: string;
  status: string;
};

const initialForm: UnidadeFormState = {
  filial_id: '',
  nome: '',
  descricao: '',
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

function OfficeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
      <path d="M3 20h18" />
      <path d="M5 20V8l7-4 7 4v12" />
      <path d="M9 12h1M9 15h1M14 12h1M14 15h1" />
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

export default function UnidadeAdministrativaManagement(_: { empresaId: number | null }) {
  const [unidades, setUnidades] = useState<UnidadeItem[]>([]);
  const [filiais, setFiliais] = useState<FilialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | null>(null);
  const [selectedUnidade, setSelectedUnidade] = useState<UnidadeItem | null>(null);
  const [form, setForm] = useState<UnidadeFormState>(initialForm);
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
    void Promise.all([loadUnidades(), loadFiliais()]);
  }, []);

  async function loadUnidades() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/unidades-administrativas', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as { data?: UnidadeItem[]; message?: string } | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message ?? `Falha ao consultar unidades administrativas: ${response.status}`);
      }

      setUnidades(payload?.data ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'NÃ£o foi possÃ­vel consultar as unidades administrativas.');
    } finally {
      setLoading(false);
    }
  }

  async function loadFiliais() {
    try {
      const response = await fetch('/api/filiais', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = (await response.json().catch(() => null)) as { data?: FilialItem[] } | null;

      if (handleUnauthorizedClientResponse(response.status)) {
        return;
      }

      if (response.ok) {
        setFiliais(payload?.data ?? []);
      }
    } catch {
      // Mantem a tela funcional mesmo se a carga auxiliar falhar.
    }
  }

  function resetModal() {
    setModalMode(null);
    setSelectedUnidade(null);
    setForm(initialForm);
  }

  function updateField<K extends keyof UnidadeFormState>(field: K, value: UnidadeFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreateModal() {
    setSelectedUnidade(null);
    setForm({
      ...initialForm,
      filial_id: filiais.find((filial) => filial.matriz)?.id?.toString() ?? '',
    });
    setModalMode('create');
  }

  function openViewModal(unidade: UnidadeItem) {
    setSelectedUnidade(unidade);
    setForm({
      filial_id: String(unidade.filial_id),
      nome: unidade.nome ?? '',
      descricao: unidade.descricao ?? '',
      status: unidade.status ?? 'ativo',
    });
    setModalMode('view');
  }

  function openEditModal(unidade: UnidadeItem) {
    setSelectedUnidade(unidade);
    setForm({
      filial_id: String(unidade.filial_id),
      nome: unidade.nome ?? '',
      descricao: unidade.descricao ?? '',
      status: unidade.status ?? 'ativo',
    });
    setModalMode('edit');
  }

  async function handleSubmit() {
    const endpoint = modalMode === 'edit' && selectedUnidade ? `/api/unidades-administrativas/${selectedUnidade.id}` : '/api/unidades-administrativas';
    const method = modalMode === 'edit' ? 'PUT' : 'POST';

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...form,
        filial_id: Number(form.filial_id),
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          data?: UnidadeItem;
          message?: string;
          errors?: Record<string, string[]>;
        }
      | null;

    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      return;
    }

    if (!response.ok || !payload?.data) {
      const firstError = payload?.errors ? Object.values(payload.errors).flat().find(Boolean) : null;
      setError(firstError ?? payload?.message ?? 'NÃ£o foi possÃ­vel salvar a unidade administrativa.');
      return;
    }

    setMessage(modalMode === 'edit' ? 'Unidade administrativa atualizada com sucesso.' : 'Unidade administrativa cadastrada com sucesso.');
    resetModal();
    await loadUnidades();
  }

  async function handleDelete(unidade: UnidadeItem) {
    setConfirmDialog({
      title: 'Excluir unidade administrativa',
      description: `Deseja excluir a unidade administrativa "${unidade.nome}"?`,
      confirmLabel: 'Excluir',
      action: async () => {
        const response = await fetch(`/api/unidades-administrativas/${unidade.id}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        });

        const payload = (await response.json().catch(() => null)) as { message?: string } | null;

        if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
          return;
        }

        if (!response.ok) {
          setError(payload?.message ?? 'NÃ£o foi possÃ­vel excluir a unidade administrativa.');
          return;
        }

        setMessage(payload?.message ?? 'Unidade administrativa removida com sucesso.');
        await loadUnidades();
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

  function getFilialNome(filialId: number) {
    return filiais.find((filial) => filial.id === filialId)?.nome ?? `Filial #${filialId}`;
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
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Unidades Administrativas</p>
            <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">Estrutura administrativa por filial</h2>
            <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
              As unidades administrativas organizam a gestao interna abaixo da filial. Exemplo: Administrativo, Patrimonio, Financeiro, Operacoes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4.5 text-[13px] font-semibold text-white transition hover:opacity-90"
            >
              Nova unidade
            </button>
            <button
              type="button"
              onClick={() => void Promise.all([loadUnidades(), loadFiliais()])}
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
                <tr className="bg-[#f8fafc] text-left text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  <th className="px-4 py-4">Unidade</th>
                  <th className="px-4 py-4">Codigo</th>
                  <th className="px-4 py-4">Filial</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      Carregando unidades administrativas...
                    </td>
                  </tr>
                ) : unidades.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--muted)]">
                      Nenhuma unidade administrativa cadastrada.
                    </td>
                  </tr>
                ) : (
                  unidades.map((unidade) => (
                    <tr key={unidade.id} className="border-t border-[var(--line)] text-sm text-[var(--ink)]">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(37,99,235,0.08)] text-[var(--accent)]">
                            <OfficeIcon />
                          </span>
                          <div>
                            <p className="font-semibold">{unidade.nome}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">ID {unidade.id} {unidade.descricao ? `| ${unidade.descricao}` : '| Sem descricao informada'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{unidade.codigo}</td>
                      <td className="px-4 py-4">{getFilialNome(unidade.filial_id)}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={unidade.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openViewModal(unidade)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            aria-label="Visualizar unidade administrativa"
                            title="Visualizar unidade administrativa"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(unidade)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            aria-label="Editar unidade administrativa"
                            title="Editar unidade administrativa"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(unidade)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(190,18,60,0.15)] bg-white text-[var(--rose)] transition hover:border-[rgba(190,18,60,0.35)] hover:bg-[rgba(190,18,60,0.06)]"
                            aria-label="Excluir unidade administrativa"
                            title="Excluir unidade administrativa"
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
                <p className="admin-modal-kicker">Unidades administrativas</p>
                <h3 className="admin-modal-title">
                  {modalMode === 'create' ? 'Nova unidade administrativa' : modalMode === 'edit' ? 'Editar unidade administrativa' : 'Visualizar unidade administrativa'}
                </h3>
                <p className="admin-modal-copy">
                  A unidade administrativa organiza a gestao abaixo da filial e pode representar setores como Administrativo, Patrimonio ou Operacoes.
                </p>
              </div>

              <button
                type="button"
                onClick={resetModal}
                className="admin-btn-secondary"
              >
                Fechar
              </button>
            </div>

            <div className="admin-modal-content mt-3 pr-1">
            <section className="admin-step-shell">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="admin-modal-kicker">Dados do cadastro</p>
                  <p className="mt-1 text-[12px] text-[var(--muted)]">Vincule a unidade a uma filial e mantenha a hierarquia organizacional consistente.</p>
                </div>
                <p className="text-[13px] font-semibold text-[var(--ink)]">{modalMode === 'create' ? 'Novo cadastro' : modalMode === 'edit' ? 'Edicao' : 'Consulta'}</p>
              </div>
            </section>

            <div className="mt-3">
              <div className="admin-modal-block">
                <div className="admin-modal-form-grid md:grid-cols-2">
                  <label className="admin-field md:col-span-2">
                    Filial
                    <select
                      value={form.filial_id}
                      onChange={(event) => updateField('filial_id', event.target.value)}
                      disabled={isReadOnly}
                      className="admin-select"
                    >
                      <option value="">Selecione uma filial</option>
                      {filiais.map((filial) => (
                        <option key={filial.id} value={filial.id}>
                          {filial.nome} {filial.matriz ? '- Matriz' : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="admin-field md:col-span-2">
                    Nome da unidade administrativa
                    <input
                      type="text"
                      value={form.nome}
                      onChange={(event) => updateField('nome', event.target.value)}
                      disabled={isReadOnly}
                      className="admin-input"
                    />
                  </label>

                  <label className="admin-field">
                    Codigo do cadastro
                    <input
                      type="text"
                      value={selectedUnidade?.codigo ?? ''}
                      disabled
                      placeholder="Gerado automaticamente ao salvar"
                      className="admin-input"
                    />
                  </label>

                  <label className="admin-field">
                    Status
                    <select
                      value={form.status}
                      onChange={(event) => updateField('status', event.target.value)}
                      disabled={isReadOnly}
                      className="admin-select"
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </label>

                  <label className="admin-field md:col-span-2">
                    Descricao
                    <textarea
                      value={form.descricao}
                      onChange={(event) => updateField('descricao', event.target.value)}
                      disabled={isReadOnly}
                      rows={4}
                      className="admin-textarea"
                    />
                  </label>
                </div>
              </div>
            </div>
            </div>

            {!isReadOnly ? (
              <div className="admin-modal-footer -mx-3 px-3 md:-mx-3.5 md:px-3.5">
                <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  className="admin-btn-primary"
                >
                  {modalMode === 'edit' ? 'Salvar alteracoes' : 'Cadastrar unidade'}
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

