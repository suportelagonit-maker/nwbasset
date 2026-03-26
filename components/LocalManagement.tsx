"use client";

import { useEffect, useMemo, useState } from "react";

import { handleUnauthorizedClientResponse } from "@/lib/client-auth";

import SystemConfirmDialog from "./SystemConfirmDialog";
import SystemFeedbackStack from "./SystemFeedbackStack";

type FilialItem = {
  id: number;
  nome: string;
  matriz: boolean;
};

type UnidadeItem = {
  id: number;
  filial_id: number;
  nome: string;
};

type DepartamentoItem = {
  id: number;
  filial_id: number;
  unidade_administrativa_id: number;
  nome: string;
};

type LocalItem = {
  id: number;
  filial_id: number;
  unidade_administrativa_id: number;
  departamento_id: number;
  nome: string;
  codigo: string;
  endereco?: string | null;
  descricao?: string | null;
  status: string;
};

type LocalFormState = {
  filial_id: string;
  unidade_administrativa_id: string;
  departamento_id: string;
  nome: string;
  endereco: string;
  descricao: string;
  status: string;
};

const initialForm: LocalFormState = {
  filial_id: "",
  unidade_administrativa_id: "",
  departamento_id: "",
  nome: "",
  endereco: "",
  descricao: "",
  status: "ativo",
};
type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => Promise<void> | void;
};

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M1.5 12s3.9-6.5 10.5-6.5S22.5 12 22.5 12 18.6 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="m4 20 4.1-1 9.8-9.8a2.1 2.1 0 0 0-3-3L5.1 16 4 20Z" />
      <path d="m13.5 6.5 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-4 w-4"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4.8c0-.4.4-.8.8-.8h4.4c.4 0 .8.4.8.8V7" />
      <path d="M6.2 7 7 19.2c0 .5.4.8.8.8h8.4c.4 0 .8-.3.8-.8L17.8 7" />
      <path d="M10 11.2v4.6" />
      <path d="M14 11.2v4.6" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" />
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

export default function LocalManagement({
  empresaId,
}: {
  empresaId: number | null;
}) {
  const [locais, setLocais] = useState<LocalItem[]>([]);
  const [filiais, setFiliais] = useState<FilialItem[]>([]);
  const [unidades, setUnidades] = useState<UnidadeItem[]>([]);
  const [departamentos, setDepartamentos] = useState<DepartamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view" | null>(
    null,
  );
  const [selectedLocal, setSelectedLocal] = useState<LocalItem | null>(null);
  const [form, setForm] = useState<LocalFormState>(initialForm);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(
    null,
  );
  const [confirmBusy, setConfirmBusy] = useState(false);
  const isReadOnly = modalMode === "view";

  useEffect(() => {
    if (!modalMode) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalMode]);

  useEffect(() => {
    void Promise.all([
      loadLocais(),
      loadFiliais(),
      loadUnidades(),
      loadDepartamentos(),
    ]);
  }, []);

  const unidadesDisponiveis = useMemo(
    () =>
      unidades.filter(
        (unidade) =>
          !form.filial_id || unidade.filial_id === Number(form.filial_id),
      ),
    [form.filial_id, unidades],
  );

  const departamentosDisponiveis = useMemo(
    () =>
      departamentos.filter((departamento) => {
        if (
          form.filial_id &&
          departamento.filial_id !== Number(form.filial_id)
        ) {
          return false;
        }

        if (
          form.unidade_administrativa_id &&
          departamento.unidade_administrativa_id !==
            Number(form.unidade_administrativa_id)
        ) {
          return false;
        }

        return true;
      }),
    [departamentos, form.filial_id, form.unidade_administrativa_id],
  );

  async function loadLocais() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/locais", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as {
        data?: LocalItem[];
        message?: string;
      } | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok) {
        throw new Error(
          payload?.message ?? `Falha ao consultar locais: ${response.status}`,
        );
      }

      setLocais(payload?.data ?? []);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Não foi possível consultar os locais.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadFiliais() {
    try {
      const response = await fetch("/api/filiais", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as {
        data?: FilialItem[];
      } | null;

      if (handleUnauthorizedClientResponse(response.status)) {
        return;
      }

      if (response.ok) {
        setFiliais(payload?.data ?? []);
      }
    } catch {
      // Mantem a tela funcional.
    }
  }

  async function loadUnidades() {
    try {
      const response = await fetch("/api/unidades-administrativas", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as {
        data?: UnidadeItem[];
      } | null;

      if (handleUnauthorizedClientResponse(response.status)) {
        return;
      }

      if (response.ok) {
        setUnidades(payload?.data ?? []);
      }
    } catch {
      // Mantem a tela funcional.
    }
  }

  async function loadDepartamentos() {
    try {
      const response = await fetch("/api/departamentos", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as {
        data?: DepartamentoItem[];
      } | null;

      if (handleUnauthorizedClientResponse(response.status)) {
        return;
      }

      if (response.ok) {
        setDepartamentos(payload?.data ?? []);
      }
    } catch {
      // Mantem a tela funcional.
    }
  }

  function resetModal() {
    setModalMode(null);
    setSelectedLocal(null);
    setForm(initialForm);
  }

  function updateField<K extends keyof LocalFormState>(
    field: K,
    value: LocalFormState[K],
  ) {
    setForm((current) => {
      if (field === "filial_id") {
        return {
          ...current,
          filial_id: value as string,
          unidade_administrativa_id: "",
          departamento_id: "",
        };
      }

      if (field === "unidade_administrativa_id") {
        return {
          ...current,
          unidade_administrativa_id: value as string,
          departamento_id: "",
        };
      }

      return { ...current, [field]: value };
    });
  }

  function openCreateModal() {
    const filialMatriz = filiais.find((filial) => filial.matriz);

    setSelectedLocal(null);
    setForm({
      ...initialForm,
      filial_id: filialMatriz ? String(filialMatriz.id) : "",
    });
    setModalMode("create");
  }

  function openViewModal(local: LocalItem) {
    setSelectedLocal(local);
    setForm({
      filial_id: String(local.filial_id),
      unidade_administrativa_id: String(local.unidade_administrativa_id),
      departamento_id: String(local.departamento_id),
      nome: local.nome ?? "",
      endereco: local.endereco ?? "",
      descricao: local.descricao ?? "",
      status: local.status ?? "ativo",
    });
    setModalMode("view");
  }

  function openEditModal(local: LocalItem) {
    setSelectedLocal(local);
    setForm({
      filial_id: String(local.filial_id),
      unidade_administrativa_id: String(local.unidade_administrativa_id),
      departamento_id: String(local.departamento_id),
      nome: local.nome ?? "",
      endereco: local.endereco ?? "",
      descricao: local.descricao ?? "",
      status: local.status ?? "ativo",
    });
    setModalMode("edit");
  }

  async function handleSubmit() {
    const endpoint =
      modalMode === "edit" && selectedLocal
        ? `/api/locais/${selectedLocal.id}`
        : "/api/locais";
    const method = modalMode === "edit" ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        ...form,
        filial_id: Number(form.filial_id),
        unidade_administrativa_id: Number(form.unidade_administrativa_id),
        departamento_id: Number(form.departamento_id),
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      data?: LocalItem;
      message?: string;
      errors?: Record<string, string[]>;
    } | null;

    if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
      return;
    }

    if (!response.ok || !payload?.data) {
      const firstError = payload?.errors
        ? Object.values(payload.errors).flat().find(Boolean)
        : null;
      setError(
        firstError ?? payload?.message ?? "Não foi possível salvar o local.",
      );
      return;
    }

    setMessage(
      modalMode === "edit"
        ? "Local atualizado com sucesso."
        : "Local cadastrado com sucesso.",
    );
    resetModal();
    await loadLocais();
  }

  async function handleDelete(local: LocalItem) {
    setConfirmDialog({
      title: "Excluir local",
      description: `Deseja excluir o local "${local.nome}"?`,
      confirmLabel: "Excluir",
      action: async () => {
        const response = await fetch(`/api/locais/${local.id}`, {
          method: "DELETE",
          headers: { Accept: "application/json" },
        });

        const payload = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;

        if (
          handleUnauthorizedClientResponse(response.status, payload?.message)
        ) {
          return;
        }

        if (!response.ok) {
          setError(payload?.message ?? "Não foi possível excluir o local.");
          return;
        }

        setMessage(payload?.message ?? "Local removido com sucesso.");
        await loadLocais();
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
    return (
      filiais.find((filial) => filial.id === filialId)?.nome ??
      `Filial #${filialId}`
    );
  }

  function getUnidadeNome(unidadeId: number) {
    return (
      unidades.find((unidade) => unidade.id === unidadeId)?.nome ??
      `Unidade #${unidadeId}`
    );
  }

  function getDepartamentoNome(departamentoId: number) {
    return (
      departamentos.find((departamento) => departamento.id === departamentoId)
        ?.nome ?? `Departamento #${departamentoId}`
    );
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
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Locais
            </p>
            <h2 className="mt-1.5 text-[1.6rem] font-semibold tracking-[-0.045em] text-[var(--ink)]">
              Locais físicos de alocação
            </h2>
            <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-[var(--muted)]">
              O local representa o ponto físico onde o bem fica alocado, sempre
              abaixo de filial, unidade administrativa e departamento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-4.5 text-[13px] font-semibold text-white transition hover:opacity-90"
            >
              Novo local
            </button>
            <button
              type="button"
              onClick={() =>
                void Promise.all([
                  loadLocais(),
                  loadFiliais(),
                  loadUnidades(),
                  loadDepartamentos(),
                ])
              }
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
                  <th className="px-4 py-4">Local</th>
                  <th className="px-4 py-4">Código</th>
                  <th className="px-4 py-4">Departamento</th>
                  <th className="px-4 py-4">Filial / Unidade</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-[var(--muted)]"
                    >
                      Carregando locais...
                    </td>
                  </tr>
                ) : locais.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-sm text-[var(--muted)]"
                    >
                      Nenhum local cadastrado.
                    </td>
                  </tr>
                ) : (
                  locais.map((local) => (
                    <tr
                      key={local.id}
                      className="border-t border-[var(--line)] text-sm text-[var(--ink)]"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[rgba(37,99,235,0.08)] text-[var(--accent)]">
                            <GlobeIcon />
                          </span>
                          <div>
                            <p className="font-semibold">{local.nome}</p>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              ID {local.id}
                              {local.endereco
                                ? `| ${local.endereco}`
                                : "| Sem endereco informado"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{local.codigo}</td>
                      <td className="px-4 py-4">
                        {getDepartamentoNome(local.departamento_id)}
                      </td>
                      <td className="px-4 py-4">
                        <p>{getFilialNome(local.filial_id)}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {getUnidadeNome(local.unidade_administrativa_id)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={local.status} />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openViewModal(local)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            aria-label="Visualizar local"
                            title="Visualizar local"
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(local)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                            aria-label="Editar local"
                            title="Editar local"
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(local)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(190,18,60,0.15)] bg-white text-[var(--rose)] transition hover:border-[rgba(190,18,60,0.35)] hover:bg-[rgba(190,18,60,0.06)]"
                            aria-label="Excluir local"
                            title="Excluir local"
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
          <div className="panel-surface admin-modal-shell admin-modal-shell--md rounded-[28px] p-3 shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="admin-modal-kicker">Locais</p>
                <h3 className="admin-modal-title">
                  {modalMode === "create"
                    ? "Novo local"
                    : modalMode === "edit"
                      ? "Editar local"
                      : "Visualizar local"}
                </h3>
                <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-[var(--muted)]">
                  O local depende da hierarquia organizacional e usa codigo
                  gerado automaticamente pelo backend.
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
                    <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">
                      Monte o local dentro da estrutura correta de filial,
                      unidade e departamento.
                    </p>
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--ink)]">
                    {modalMode === "create"
                      ? "Novo cadastro"
                      : modalMode === "edit"
                        ? "Edicao"
                        : "Consulta"}
                  </p>
                </div>
              </section>

              <div className="mt-3">
                <div className="admin-modal-block">
                  <div className="admin-modal-form-grid md:grid-cols-2 xl:grid-cols-3">
                    <label className="admin-field">
                      Filial
                      <select
                        value={form.filial_id}
                        onChange={(event) =>
                          updateField("filial_id", event.target.value)
                        }
                        disabled={isReadOnly}
                        className="admin-select"
                      >
                        <option value="">Selecione uma filial</option>
                        {filiais.map((filial) => (
                          <option key={filial.id} value={filial.id}>
                            {filial.nome} {filial.matriz ? "- Matriz" : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field">
                      Unidade administrativa
                      <select
                        value={form.unidade_administrativa_id}
                        onChange={(event) =>
                          updateField(
                            "unidade_administrativa_id",
                            event.target.value,
                          )
                        }
                        disabled={isReadOnly || !form.filial_id}
                        className="admin-select"
                      >
                        <option value="">Selecione uma unidade</option>
                        {unidadesDisponiveis.map((unidade) => (
                          <option key={unidade.id} value={unidade.id}>
                            {unidade.nome}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field">
                      Departamento
                      <select
                        value={form.departamento_id}
                        onChange={(event) =>
                          updateField("departamento_id", event.target.value)
                        }
                        disabled={isReadOnly || !form.unidade_administrativa_id}
                        className="admin-select"
                      >
                        <option value="">Selecione um departamento</option>
                        {departamentosDisponiveis.map((departamento) => (
                          <option key={departamento.id} value={departamento.id}>
                            {departamento.nome}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field">
                      Código do cadastro
                      <input
                        type="text"
                        value={selectedLocal?.codigo ?? ""}
                        disabled
                        placeholder="Gerado automaticamente ao salvar"
                        className="admin-input"
                      />
                    </label>

                    <label className="admin-field md:col-span-2 xl:col-span-3">
                      Nome do local
                      <input
                        type="text"
                        value={form.nome}
                        onChange={(event) =>
                          updateField("nome", event.target.value)
                        }
                        disabled={isReadOnly}
                        className="admin-input"
                      />
                    </label>

                    <label className="admin-field md:col-span-2 xl:col-span-2">
                      Endereco
                      <input
                        type="text"
                        value={form.endereco}
                        onChange={(event) =>
                          updateField("endereco", event.target.value)
                        }
                        disabled={isReadOnly}
                        className="admin-input"
                      />
                    </label>

                    <label className="admin-field">
                      Status
                      <select
                        value={form.status}
                        onChange={(event) =>
                          updateField("status", event.target.value)
                        }
                        disabled={isReadOnly}
                        className="admin-select"
                      >
                        <option value="ativo">Ativo</option>
                        <option value="inativo">Inativo</option>
                      </select>
                    </label>

                    <label className="admin-field md:col-span-2 xl:col-span-3">
                    Descrição
                      <textarea
                        value={form.descricao}
                        onChange={(event) =>
                          updateField("descricao", event.target.value)
                        }
                        disabled={isReadOnly}
                        rows={3}
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
                    {modalMode === "edit"
                      ? "Salvar alterações"
                      : "Cadastrar local"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <SystemConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ""}
        description={confirmDialog?.description ?? ""}
        confirmLabel={confirmDialog?.confirmLabel}
        busy={confirmBusy}
        onCancel={() => !confirmBusy && setConfirmDialog(null)}
        onConfirm={() => void handleConfirmAction()}
      />
    </>
  );
}



