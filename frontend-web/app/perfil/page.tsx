import { redirect } from 'next/navigation';

import ActiveEmpresaLogoPanel from '@/components/ActiveEmpresaLogoPanel';
import AdminShell from '@/components/AdminShell';
import { getAuthSession } from '@/lib/auth-session';

export default async function PerfilPage() {
  const session = await getAuthSession();

  if (!session.token) {
    redirect('/login');
  }

  return (
    <AdminShell title="Perfil do usuário" subtitle="Dados da conta autenticada e identidade visual da empresa ativa.">
      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <article className="panel-surface rounded-[28px] p-6">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#111827] text-2xl font-semibold text-white">
              {(session.userName ?? session.userEmail ?? 'W').trim().charAt(0).toUpperCase()}
            </div>
            <h2 className="mt-4 text-xl font-semibold text-[var(--ink)]">{session.userName ?? 'Usuário autenticado'}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{session.userEmail ?? 'Conta ativa'}</p>
          </div>
        </article>

        <div className="grid gap-5">
          <article className="panel-surface rounded-[28px] p-6">
            <h3 className="text-lg font-semibold text-[var(--ink)]">Informações da sessão</h3>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Nome</p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">{session.userName ?? 'Não informado'}</p>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">E-mail</p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">{session.userEmail ?? 'Não informado'}</p>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Empresa ativa</p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">
                  {session.empresaNome ?? (session.dashboardScope === 'geral' ? 'Painel geral' : 'Não selecionada')}
                </p>
              </div>

              <div className="rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Sessão</p>
                <p className="mt-2 text-sm font-medium text-[var(--ink)]">Ativa no navegador</p>
              </div>
            </div>
          </article>

          <ActiveEmpresaLogoPanel
            empresaId={session.empresaId}
            empresaNome={session.empresaNome}
            empresaCnpj={session.empresaCnpj}
            empresaLogoUrl={session.empresaLogoUrl}
            empresas={session.empresas}
            isSuperAdmin={session.isSuperAdmin}
          />
        </div>
      </section>
    </AdminShell>
  );
}

