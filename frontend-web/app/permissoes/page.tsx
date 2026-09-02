import { redirect } from 'next/navigation';

import AdminShell from '@/components/AdminShell';
import { AdminApiError, getRolePermissoes } from '@/lib/admin-api';
import { getAuthSession } from '@/lib/auth-session';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_EMPRESA: 'Admin da empresa',
  GESTOR_PATRIMONIAL: 'Gestor patrimonial',
  AUDITOR: 'Auditor',
  OPERADOR_INVENTARIO: 'Operador de inventário',
};

const ROLE_PRIORITY: Record<string, number> = {
  SUPER_ADMIN: 0,
  ADMIN_EMPRESA: 1,
  GESTOR_PATRIMONIAL: 2,
  AUDITOR: 3,
  OPERADOR_INVENTARIO: 4,
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] ?? role.replace(/_/g, ' ');
}

function normalizePermissionLabel(permission: string) {
  return permission
    .split('.')
    .map((segment) =>
      segment
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/^./, (char) => char.toUpperCase()),
    )
    .join(' / ');
}

export default async function PermissoesPage() {
  const session = await getAuthSession();

  if (!session.token || !session.empresaId) {
    redirect('/login');
  }

  try {
    const permissoes = await getRolePermissoes(session);
    const grouped = Object.entries(
      permissoes.reduce<Record<string, string[]>>((carry, item) => {
        carry[item.role] ??= [];
        carry[item.role].push(item.permissao);
        return carry;
      }, {}),
    )
      .map(([role, items]) => ({
        role,
        items: Array.from(new Set(items)).sort((a, b) => a.localeCompare(b, 'pt-BR')),
      }))
      .sort((a, b) => {
        const aPriority = ROLE_PRIORITY[a.role] ?? 999;
        const bPriority = ROLE_PRIORITY[b.role] ?? 999;
        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }
        return a.role.localeCompare(b.role, 'pt-BR');
      });

    const totalPermissoes = grouped.reduce((sum, group) => sum + group.items.length, 0);

    return (
      <AdminShell
        title="Permissões por perfil"
        subtitle="Matriz operacional das permissões padrão para cada perfil. As caixas abaixo representam os acessos habilitados em cada papel."
      >
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="panel-surface rounded-[18px] border border-[var(--line)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Perfis</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{grouped.length}</p>
          </article>
          <article className="panel-surface rounded-[18px] border border-[var(--line)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Permissões ativas</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">{totalPermissoes}</p>
          </article>
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {grouped.map(({ role, items }) => (
            <article key={role} className="panel-surface rounded-[18px] border border-[var(--line)] p-4">
              <header className="flex items-center justify-between gap-2">
                <h2 className="text-[15px] font-semibold text-[var(--ink)]">{roleLabel(role)}</h2>
                <span className="inline-flex rounded-full bg-[rgba(245,158,11,0.12)] px-2 py-1 text-[11px] font-semibold text-[#b45309]">
                  {items.length}
                </span>
              </header>

              <div className="mt-3 max-h-[360px] space-y-1.5 overflow-y-auto pr-1">
                {items.map((permission) => (
                  <label
                    key={`${role}-${permission}`}
                    className="flex items-start gap-2 rounded-xl border border-[var(--line)] bg-[#f8fafc] px-2.5 py-2"
                  >
                    <input
                      type="checkbox"
                      checked
                      readOnly
                      disabled
                      className="mt-0.5 h-4 w-4 rounded border border-[var(--line)] accent-[var(--accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-[12px] font-medium text-[var(--ink)]">{normalizePermissionLabel(permission)}</span>
                      <span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--muted)]">{permission}</span>
                    </span>
                  </label>
                ))}
              </div>
            </article>
          ))}
        </section>
      </AdminShell>
    );
  } catch (error) {
    if (error instanceof AdminApiError && error.status === 401) {
      redirect('/api/auth/logout');
    }

    throw error;
  }
}
