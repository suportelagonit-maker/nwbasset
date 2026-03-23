'use client';

import { useEffect, useMemo, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

import SystemConfirmDialog from './SystemConfirmDialog';
import SystemFeedbackStack from './SystemFeedbackStack';

type UsuarioItem = {
  id: number;
  empresa_id: number | null;
  nome: string;
  email: string;
  role: string;
  role_atual: string;
  permissoes?: string[];
  ativo: boolean;
  ultimo_login_em: string | null;
};

type CatalogoGrupo = {
  grupo: string;
  itens: Array<{
    codigo: string;
    nome: string;
    descricao?: string | null;
  }>;
};

type CatalogoPayload = {
  roles: string[];
  grupos: CatalogoGrupo[];
  role_permissoes: Record<string, string[]>;
};

type ModalMode = 'create' | 'edit' | 'view' | null;

type UsuarioFormState = {
  nome: string;
  email: string;
  password: string;
  role: string;
  ativo: boolean;
  permissoes: string[];
};

type ConfirmDialogState = {
  title: string;
  description: string;
  confirmLabel?: string;
  action: () => Promise<void> | void;
};

const initialForm: UsuarioFormState = {
  nome: '',
  email: '',
  password: '',
  role: '',
  ativo: true,
  permissoes: [],
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
      <path d="M9 7V4.8c0-.4.4-.8.8-.8h4.4c0.4 0 .8.4.8.8V7" />
      <path d="M6.2 7 7 19.2c0 .5.4.8.8.8h8.4c.4 0 .8-.3.8-.8L17.8 7" />
      <path d="M10 11.2v4.6" />
      <path d="M14 11.2v4.6" />
    </svg>
  );
}

function roleLabel(role: string) {
  return (
    {
      SUPER_ADMIN: 'Super admin',
      ADMIN_EMPRESA: 'Admin da empresa',
      GESTOR_PATRIMONIAL: 'Gestor patrimonial',
      AUDITOR: 'Auditor',
      OPERADOR_INVENTARIO: 'Operador de inventÃ¡rio',
    }[role] ?? role
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return 'Nunca acessou';
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

function uniquePermissions(permissoes: string[]) {
  return Array.from(new Set(permissoes.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

async function parsePayload(response: Response) {
  return (await response.json().catch(() => null)) as
    | {
        data?: unknown;
        message?: string;
        errors?: Record<string, string[]>;
      }
    | null;
}

export default function UsersManagement() {
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [catalogo, setCatalogo] = useState<CatalogoPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioItem | null>(null);
  const [form, setForm] = useState<UsuarioFormState>(initialForm);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    void Promise.all([loadUsuarios(), loadCatalogo()]);
  }, []);

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

  const permissoesSelecionadas = useMemo(() => uniquePermissions(form.permissoes), [form.permissoes]);

  async function loadUsuarios() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/usuarios?per_page=100', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = (await parsePayload(response)) as { data?: UsuarioItem[]; message?: string } | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok) {
        throw new Error(payload?.message ?? `Falha ao consultar usuÃ¡rios: ${response.status}`);
      }

      setUsuarios(payload?.data ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'NÃ£o foi possÃ­vel consultar os usuÃ¡rios.');
    } finally {
      setLoading(false);
    }
  }

  async function loadCatalogo() {
    try {
      const response = await fetch('/api/admin/usuarios/catalogo-permissoes', {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      const payload = (await parsePayload(response)) as { data?: CatalogoPayload; message?: string } | null;

      if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
        return;
      }

      if (!response.ok || !payload?.data) {
        throw new Error(payload?.message ?? `Falha ao consultar catÃ¡logo de permissÃµes: ${response.status}`);
      }

      const catalogData = payload.data;

      setCatalogo(catalogData);
      setForm((current) => {
        if (current.role || catalogData.roles.length === 0) {
          return current;
        }

        const nextRole = catalogData.roles[0];

        return {
          ...current,
          role: nextRole,
          permissoes: uniquePermissions(catalogData.role_permissoes[nextRole] ?? []),
        };
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'NÃ£o foi possÃ­vel carregar o catÃ¡logo de permissÃµes.');
    }
  }

  function resetModal() {
    setModalMode(null);
    setSelectedUsuario(null);
    setForm({
      ...initialForm,
      role: catalogo?.roles[0] ?? '',
      permissoes: uniquePermissions(catalogo?.role_permissoes[catalogo?.roles[0] ?? ''] ?? []),
    });
  }

  function openCreateModal() {
    setError(null);
    setMessage(null);
    setSelectedUsuario(null);
    setForm({
      ...initialForm,
      role: catalogo?.roles[0] ?? '',
      permissoes: uniquePermissions(catalogo?.role_permissoes[catalogo?.roles[0] ?? ''] ?? []),
    });
    setModalMode('create');
  }

  function openViewModal(usuario: UsuarioItem) {
    setError(null);
    setMessage(null);
    setSelectedUsuario(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      password: '',
      role: usuario.role_atual ?? usuario.role,
      ativo: usuario.ativo,
      permissoes: uniquePermissions(usuario.permissoes ?? []),
    });
    setModalMode('view');
  }

  function openEditModal(usuario: UsuarioItem) {
    setError(null);
    setMessage(null);
    setSelectedUsuario(usuario);
    setForm({
      nome: usuario.nome,
      email: usuario.email,
      password: '',
      role: usuario.role_atual ?? usuario.role,
      ativo: usuario.ativo,
      permissoes: uniquePermissions(usuario.permissoes ?? catalogo?.role_permissoes[usuario.role_atual ?? usuario.role] ?? []),
    });
    setModalMode('edit');
  }

  function updateField<K extends keyof UsuarioFormState>(field: K, value: UsuarioFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateRole(nextRole: string) {
    setForm((current) => ({
      ...current,
      role: nextRole,
      permissoes: uniquePermissions(catalogo?.role_permissoes[nextRole] ?? []),
    }));
  }

  function togglePermissao(codigo: string) {
    setForm((current) => {
      const enabled = current.permissoes.includes(codigo);

      return {
        ...current,
        permissoes: enabled
          ? current.permissoes.filter((item) => item !== codigo)
          : uniquePermissions([...current.permissoes, codigo]),
      };
    });
  }

  function permissionsPayload() {
    return uniquePermissions(form.permissoes);
  }

  async function persistUsuario() {
    const endpoint = modalMode === 'edit' && selectedUsuario ? `/api/admin/usuarios/${selectedUsuario.id}` : '/api/admin/usuarios';
    const method = modalMode === 'edit' ? 'PUT' : 'POST';
    const payload = {
      nome: form.nome,
      email: form.email,
      ...(form.password.trim() ? { password: form.password } : {}),
      role: form.role,
      ativo: form.ativo,
      permissoes: permissionsPayload(),
    };

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const body = await parsePayload(response);

    if (handleUnauthorizedClientResponse(response.status, body?.message)) {
      throw new Error('SessÃ£o expirada.');
    }

    if (!response.ok) {
      const firstError = body?.errors ? Object.values(body.errors).flat().find(Boolean) : null;
      throw new Error(firstError ?? body?.message ?? 'NÃ£o foi possÃ­vel salvar o usuÃ¡rio.');
    }
  }

  async function handleSubmit() {
    if (modalMode === 'view') {
      resetModal();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await persistUsuario();
      await loadUsuarios();
      setMessage(modalMode === 'edit' ? 'UsuÃ¡rio atualizado com sucesso.' : 'UsuÃ¡rio cadastrado com sucesso.');
      resetModal();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'NÃ£o foi possÃ­vel salvar o usuÃ¡rio.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(usuario: UsuarioItem) {
    setConfirmDialog({
      title: 'Inativar usuÃ¡rio',
      description: `Deseja inativar o usuÃ¡rio ${usuario.nome}? Essa operaÃ§Ã£o vale somente para a empresa ativa.`,
      confirmLabel: 'Inativar usuÃ¡rio',
      action: async () => {
        const response = await fetch(`/api/admin/usuarios/${usuario.id}`, {
          method: 'DELETE',
          headers: { Accept: 'application/json' },
        });

        const payload = await parsePayload(response);

        if (handleUnauthorizedClientResponse(response.status, payload?.message)) {
          return;
        }

        if (!response.ok) {
          throw new Error(payload?.message ?? 'NÃ£o foi possÃ­vel inativar o usuÃ¡rio.');
        }

        await loadUsuarios();
        setMessage('UsuÃ¡rio inativado com sucesso.');
      },
    });
  }

  async function handleConfirmAction() {
    if (!confirmDialog) {
      return;
    }

    setConfirmBusy(true);
    setError(null);

    try {
      await confirmDialog.action();
      setConfirmDialog(null);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'NÃ£o foi possÃ­vel concluir a operaÃ§Ã£o.');
    } finally {
      setConfirmBusy(false);
    }
  }

  const readOnly = modalMode === 'view';

  return (
    <>
      <SystemFeedbackStack
        error={error}
        message={message}
        errorTitle="AtenÃ§Ã£o"
        messageTitle="OperaÃ§Ã£o concluÃ­da"
        onCloseError={() => setError(null)}
        onCloseMessage={() => setMessage(null)}
      />

      <SystemConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title ?? ''}
        description={confirmDialog?.description ?? ''}
        confirmLabel={confirmDialog?.confirmLabel ?? 'Confirmar'}
        busy={confirmBusy}
        tone="danger"
        onCancel={() => !confirmBusy && setConfirmDialog(null)}
        onConfirm={() => void handleConfirmAction()}
      />

      <section className="panel-surface overflow-hidden rounded-[28px]">
        <div className="flex flex-col gap-4 border-b border-[var(--line)] px-5 py-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">UsuÃ¡rios e acessos</p>
            <h2 className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--ink)]">GestÃ£o de usuÃ¡rios da empresa ativa</h2>
            <p className="max-w-3xl text-sm leading-6 text-[var(--muted)]">
              O usuÃ¡rio criado aqui fica vinculado somente Ã  empresa selecionada no painel. O administrador da empresa pode
              criar perfis operacionais e marcar as permissÃµes por caixas de seleÃ§Ã£o.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={() => void loadUsuarios()} className="admin-btn-secondary">
              Atualizar
            </button>
            <button type="button" onClick={openCreateModal} disabled={!catalogo} className="admin-btn-primary">
              Novo usuÃ¡rio
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--line)] bg-[#f8fafc] text-left text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                <th className="px-5 py-4">UsuÃ¡rio</th>
                <th className="px-5 py-4">Perfil</th>
                <th className="px-5 py-4">PermissÃµes</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Ãšltimo acesso</th>
                <th className="px-5 py-4 text-right">AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--muted)]">
                    Carregando usuÃ¡rios...
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-[var(--muted)]">
                    Nenhum usuÃ¡rio cadastrado para a empresa ativa.
                  </td>
                </tr>
              ) : (
                usuarios.map((usuario) => {
                  const permissoes = uniquePermissions(usuario.permissoes ?? []);

                  return (
                    <tr key={usuario.id} className="border-b border-[rgba(15,23,42,0.08)] text-sm text-[var(--ink)]">
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold">{usuario.nome}</p>
                          <p className="text-xs text-[var(--muted)]">{usuario.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-[rgba(246,164,0,0.12)] px-3 py-1 text-xs font-semibold text-[var(--accent-deep)]">
                          {roleLabel(usuario.role_atual ?? usuario.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold">{permissoes.length} permissÃµes</p>
                          <p className="max-w-[320px] truncate text-xs text-[var(--muted)]">
                            {permissoes.slice(0, 3).join(' â€¢ ') || 'Sem permissÃµes diretas'}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            usuario.ativo
                              ? 'bg-[rgba(34,197,94,0.12)] text-[var(--mint-deep)]'
                              : 'bg-[rgba(225,29,72,0.12)] text-[var(--rose)]'
                          }`}
                        >
                          {usuario.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-[var(--muted)]">{formatDate(usuario.ultimo_login_em)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openViewModal(usuario)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
                            aria-label={`Visualizar ${usuario.nome}`}
                          >
                            <EyeIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(usuario)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
                            aria-label={`Editar ${usuario.nome}`}
                          >
                            <PencilIcon />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(usuario)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(225,29,72,0.16)] bg-white text-[var(--rose)] transition hover:bg-[rgba(225,29,72,0.06)]"
                            aria-label={`Inativar ${usuario.nome}`}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalMode ? (
        <div className="admin-dialog-overlay">
          <div className="panel-surface admin-dialog-shell overflow-hidden rounded-[24px] p-4 md:p-5 shadow-[0_22px_64px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-3">
              <div className="min-w-0">
                <p className="admin-modal-kicker">UsuÃ¡rios</p>
                <h3 className="admin-modal-title">
                  {modalMode === 'create' ? 'Novo usuÃ¡rio' : modalMode === 'edit' ? 'Editar usuÃ¡rio' : 'Visualizar usuÃ¡rio'}
                </h3>
                <p className="admin-modal-copy">
                  Este cadastro vale apenas para a empresa ativa. O administrador da empresa pode criar usuÃ¡rios operacionais e
                  definir as permissÃµes por caixas de seleÃ§Ã£o.
                </p>
              </div>

              <button
                type="button"
                onClick={resetModal}
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_360px]">
              <section className="space-y-4 rounded-[24px] border border-[var(--line)] bg-white p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="admin-field">
                    <span className="admin-label">Nome</span>
                    <input
                      className="admin-input"
                      value={form.nome}
                      onChange={(event) => updateField('nome', event.target.value)}
                      disabled={readOnly}
                    />
                  </label>
                  <label className="admin-field">
                    <span className="admin-label">E-mail</span>
                    <input
                      className="admin-input"
                      type="email"
                      value={form.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      disabled={readOnly}
                    />
                  </label>
                  <label className="admin-field">
                    <span className="admin-label">{modalMode === 'edit' ? 'Nova senha' : 'Senha'}</span>
                    <input
                      className="admin-input"
                      type="password"
                      value={form.password}
                      onChange={(event) => updateField('password', event.target.value)}
                      disabled={readOnly}
                      placeholder={modalMode === 'edit' ? 'Preencha apenas para alterar' : ''}
                    />
                  </label>
                  <label className="admin-field">
                    <span className="admin-label">Perfil</span>
                    <select
                      className="admin-select"
                      value={form.role}
                      onChange={(event) => updateRole(event.target.value)}
                      disabled={readOnly}
                    >
                      {(catalogo?.roles ?? []).map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-[18px] border border-[var(--line)] bg-[#fafafa] px-3 py-3 text-sm text-[var(--ink)]">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--blue)]"
                    checked={form.ativo}
                    onChange={(event) => updateField('ativo', event.target.checked)}
                    disabled={readOnly}
                  />
                  UsuÃ¡rio ativo para acessar a empresa selecionada
                </label>

                <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
                  <div className="mb-3 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">PermissÃµes da empresa</p>
                    <p className="text-sm leading-6 text-[var(--muted)]">
                      Marque somente os acessos que este usuÃ¡rio pode usar na empresa ativa. Ao trocar o perfil, o sistema carrega
                      o conjunto padrÃ£o e vocÃª pode ajustar manualmente.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {(catalogo?.grupos ?? []).map((grupo) => (
                      <section key={grupo.grupo} className="rounded-[18px] border border-[var(--line)] bg-[#fafafa] p-3">
                        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{grupo.grupo}</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {grupo.itens.map((item) => {
                            const checked = permissionsPayload().includes(item.codigo);

                            return (
                              <label
                                key={item.codigo}
                                className={`flex items-start gap-3 rounded-[16px] border px-3 py-3 text-sm transition ${
                                  checked
                                    ? 'border-[rgba(246,164,0,0.22)] bg-[rgba(246,164,0,0.08)]'
                                    : 'border-[var(--line)] bg-white'
                                } ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--blue)]"
                                  checked={checked}
                                  onChange={() => togglePermissao(item.codigo)}
                                  disabled={readOnly}
                                />
                                <span className="min-w-0">
                                  <span className="block font-semibold text-[var(--ink)]">{item.nome}</span>
                                  <span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">
                                    {item.descricao || item.codigo}
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              </section>

              <aside className="space-y-3 rounded-[24px] border border-[var(--line)] bg-white p-4">
                <div className="admin-summary-card">
                  <p className="admin-summary-label">Empresa</p>
                  <p className="admin-summary-value">Empresa ativa</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Este usuÃ¡rio serÃ¡ criado e controlado apenas no contexto atual.</p>
                </div>
                <div className="admin-summary-card">
                  <p className="admin-summary-label">Perfil selecionado</p>
                  <p className="admin-summary-value">{form.role ? roleLabel(form.role) : 'NÃ£o definido'}</p>
                </div>
                <div className="admin-summary-card">
                  <p className="admin-summary-label">PermissÃµes marcadas</p>
                  <p className="admin-summary-value">{permissoesSelecionadas.length}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">As permissÃµes diretas prevalecem sobre o padrÃ£o do perfil na empresa ativa.</p>
                </div>
                <div className="admin-summary-card">
                  <p className="admin-summary-label">Regra de negÃ³cio</p>
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    O administrador da empresa nÃ£o cria usuÃ¡rios para outras empresas. O escopo Ã© sempre o da empresa atualmente
                    selecionada no sistema.
                  </p>
                </div>
              </aside>
            </div>

            <div className="admin-modal-footer -mx-4 mt-4 px-4 md:-mx-5 md:px-5">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={resetModal} className="admin-btn-secondary">
                  {modalMode === 'view' ? 'Fechar' : 'Cancelar'}
                </button>

                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={saving}
                  className="admin-btn-primary"
                >
                  {modalMode === 'view' ? 'Fechar' : saving ? 'Salvando...' : modalMode === 'edit' ? 'Salvar alteraÃ§Ãµes' : 'Cadastrar usuÃ¡rio'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

