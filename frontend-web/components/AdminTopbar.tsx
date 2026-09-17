'use client';

import Link from 'next/link';

import ActiveEmpresaHeader from '@/components/ActiveEmpresaHeader';
import EmpresaContextHeader from '@/components/EmpresaContextHeader';
import UserMenu from '@/components/UserMenu';

type EmpresaOption = {
  id: number;
  nome_fantasia: string;
  logo_url?: string | null;
  perfil?: string | null;
};

type AdminTopbarProps = {
  title: string;
  subtitle: string;
  minimal?: boolean;
  showSelector?: boolean;
  userInitial: string;
  userName?: string | null;
  userEmail?: string | null;
  onOpenMobileMenu?: () => void;
  empresaNome?: string | null;
  empresaCnpj?: string | null;
  empresaLogoUrl?: string | null;
  isSuperAdmin?: boolean;
  empresas?: EmpresaOption[];
  empresaAtualId?: number | null;
  dashboardScope?: 'empresa' | 'geral';
};

function HelpButton() {
  return (
    <Link
      href="/ajuda"
      prefetch={false}
      aria-label="Central de Ajuda"
      title="Central de Ajuda"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] sm:h-11 sm:w-11"
    >
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7v.5" />
        <circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" />
      </svg>
    </Link>
  );
}

function MobileMenuButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Abrir menu"
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(246,164,0,0.12)] text-[var(--accent)] md:hidden"
    >
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 8h14" />
        <path d="M5 12h10" />
        <path d="M5 16h14" />
      </svg>
    </button>
  );
}

export default function AdminTopbar({
  title,
  subtitle,
  minimal = false,
  userInitial,
  userName,
  userEmail,
  onOpenMobileMenu,
  empresaNome,
  empresaCnpj,
  empresaLogoUrl,
  isSuperAdmin = false,
  empresas = [],
  empresaAtualId = null,
  dashboardScope = 'empresa',
}: AdminTopbarProps) {
  if (minimal) {
    return (
      <header className="admin-topbar-surface sticky top-0 z-[60] flex min-h-[58px] items-center justify-between gap-3 px-3 sm:px-6 md:static">
        <MobileMenuButton onClick={onOpenMobileMenu} />

        <div className="hidden flex-1 justify-center md:flex">
          <EmpresaContextHeader
            isSuperAdmin={isSuperAdmin}
            empresas={empresas}
            empresaAtualId={empresaAtualId}
            dashboardScope={dashboardScope}
          />
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4">
          <ActiveEmpresaHeader
            empresaId={empresaAtualId}
            empresaNome={empresaNome}
            empresaCnpj={empresaCnpj}
            empresaLogoUrl={empresaLogoUrl}
          />
          <HelpButton />
          <UserMenu initial={userInitial} userName={userName} userEmail={userEmail} />
        </div>
      </header>
    );
  }

  return (
    <header className="admin-topbar-surface relative flex min-h-[64px] items-center gap-3 rounded-none px-3 py-2.5 md:rounded-[22px] md:px-5">
      <MobileMenuButton onClick={onOpenMobileMenu} />

      <div className="min-w-0 flex-1 md:max-w-[360px]">
        <h1 className="truncate font-[family-name:var(--font-heading)] text-[1.1rem] font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-[1.25rem] md:text-[1.45rem]">
          {title}
        </h1>
        <p className="mt-0.5 hidden truncate text-[12px] text-[var(--muted)] sm:block">{subtitle}</p>
      </div>

      <div className="pointer-events-none absolute left-1/2 hidden -translate-x-1/2 lg:block">
        <div className="pointer-events-auto">
          <EmpresaContextHeader
            isSuperAdmin={isSuperAdmin}
            empresas={empresas}
            empresaAtualId={empresaAtualId}
            dashboardScope={dashboardScope}
          />
        </div>
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        <div className="hidden sm:block">
          <ActiveEmpresaHeader
            empresaId={empresaAtualId}
            empresaNome={empresaNome}
            empresaCnpj={empresaCnpj}
            empresaLogoUrl={empresaLogoUrl}
          />
        </div>
        <div className="hidden max-w-[180px] text-right xl:block">
          <p className="truncate text-[12px] font-semibold leading-4 text-[var(--ink)]">{userName ?? 'Usuário autenticado'}</p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{userEmail ?? 'Conta ativa'}</p>
        </div>
        <HelpButton />
        <UserMenu initial={userInitial} userName={userName} userEmail={userEmail} />
      </div>
    </header>
  );
}
