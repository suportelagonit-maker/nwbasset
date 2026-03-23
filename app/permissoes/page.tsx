import { redirect } from 'next/navigation';

import AdminShell from '@/components/AdminShell';
import { AdminApiError, getRolePermissoes } from '@/lib/admin-api';
import { getAuthSession } from '@/lib/auth-session';

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
    );

    return (
      <AdminShell
        title="Permissões por perfil"
        subtitle="Matriz operacional das permissões padrão do NWB Asset para autenticação, dados patrimoniais e painel administrativo."
      >
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.map(([role, items]) => (
            <article key={role} className="panel-surface rounded-[24px] p-5">
              <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold">{role}</h2>
              <ul className="mt-4 space-y-2 text-sm text-[var(--muted)]">
                {items.map((item) => (
                  <li key={item} className="rounded-2xl border border-[var(--line)] bg-[#f8fafc] px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
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
