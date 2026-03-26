import Link from 'next/link';

import { getAuthSession } from '@/lib/auth-session';

export default async function AdminHeader() {
  const session = await getAuthSession();

  if (!session.token) {
    return null;
  }

  return (
    <header className="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-7xl flex-col gap-4 rounded-[24px] border border-[var(--line)] bg-white/70 px-4 py-4 backdrop-blur md:w-[calc(100%-4rem)] md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">NWB Asset ERP</p>
        <p className="mt-1 text-sm font-medium text-[var(--ink)]">
          {session.userName ?? 'Usuário autenticado'}
          {session.userEmail ? ` · ${session.userEmail}` : ''}
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 text-sm font-semibold text-[var(--teal-deep)]">
        <Link className="rounded-full border border-[var(--line)] px-4 py-2 hover:bg-white/80" href="/dashboard/patrimonio">
          Dashboard
        </Link>
        <Link className="rounded-full border border-[var(--line)] px-4 py-2 hover:bg-white/80" href="/users">
          Usuários
        </Link>
        <Link className="rounded-full border border-[var(--line)] px-4 py-2 hover:bg-white/80" href="/permissoes">
          Permissões
        </Link>
        <form action="/api/auth/logout" method="post">
          <button className="rounded-full border border-[var(--line)] px-4 py-2 hover:bg-white/80" type="submit">
            Sair
          </button>
        </form>
      </nav>
    </header>
  );
}


