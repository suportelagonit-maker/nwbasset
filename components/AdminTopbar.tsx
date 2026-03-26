'use client';

import ActiveEmpresaHeader from '@/components/ActiveEmpresaHeader';
import EmpresaContextHeader from '@/components/EmpresaContextHeader';
import FontesConsultaButton from '@/components/FontesConsultaButton';
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
  onToggleSidebar?: () => void;
  empresaNome?: string | null;
  empresaCnpj?: string | null;
  empresaLogoUrl?: string | null;
  isSuperAdmin?: boolean;
  empresas?: EmpresaOption[];
  empresaAtualId?: number | null;
  dashboardScope?: 'empresa' | 'geral';
};

export default function AdminTopbar({
  title,
  subtitle,
  minimal = false,
  userInitial,
  userName,
  userEmail,
  onToggleSidebar,
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
      <header className="admin-topbar-surface flex h-[58px] items-center justify-between px-6">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Abrir navegacao"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--accent)] md:hidden"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 8h14" />
            <path d="M5 12h10" />
            <path d="M5 16h14" />
          </svg>
        </button>

        <div className="hidden flex-1 justify-center md:flex">
          <EmpresaContextHeader
            isSuperAdmin={isSuperAdmin}
            empresas={empresas}
            empresaAtualId={empresaAtualId}
            dashboardScope={dashboardScope}
          />
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden lg:block">
            <FontesConsultaButton />
          </div>
          <ActiveEmpresaHeader
            empresaId={empresaAtualId}
            empresaNome={empresaNome}
            empresaCnpj={empresaCnpj}
            empresaLogoUrl={empresaLogoUrl}
          />
          <UserMenu initial={userInitial} userName={userName} userEmail={userEmail} />
        </div>
      </header>
    );
  }

  return (
    <header className="admin-topbar-surface relative flex min-h-[64px] items-center gap-3 rounded-[22px] px-4 py-2.5 md:px-5">
      <div className="min-w-0 max-w-[360px] flex-1">
        <h1 className="truncate font-[family-name:var(--font-heading)] text-[1.25rem] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[1.45rem]">
          {title}
        </h1>
        <p className="mt-0.5 truncate text-[12px] text-[var(--muted)]">{subtitle}</p>
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

      <div className="ml-auto flex min-w-0 items-center gap-3">
        <div className="hidden lg:block">
          <FontesConsultaButton />
        </div>
        <ActiveEmpresaHeader
          empresaId={empresaAtualId}
          empresaNome={empresaNome}
          empresaCnpj={empresaCnpj}
          empresaLogoUrl={empresaLogoUrl}
        />
        <div className="hidden max-w-[180px] text-right xl:block">
          <p className="truncate text-[12px] font-semibold leading-4 text-[var(--ink)]">{userName ?? 'Usuário autenticado'}</p>
          <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{userEmail ?? 'Conta ativa'}</p>
        </div>
        <UserMenu initial={userInitial} userName={userName} userEmail={userEmail} />
      </div>
    </header>
  );
}


