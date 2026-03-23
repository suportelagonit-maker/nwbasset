'use client';

import { useEffect, useState } from 'react';

import AdminSidebar from '@/components/AdminSidebar';
import AdminTopbar from '@/components/AdminTopbar';

type EmpresaOption = {
  id: number;
  nome_fantasia: string;
  logo_url?: string | null;
  perfil?: string | null;
};

type AdminFrameProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  minimalTopbar?: boolean;
  userInitial: string;
  userName?: string | null;
  userEmail?: string | null;
  empresaNome?: string | null;
  empresaCnpj?: string | null;
  empresaLogoUrl?: string | null;
  isSuperAdmin?: boolean;
  empresas?: EmpresaOption[];
  empresaAtualId?: number | null;
  dashboardScope?: 'empresa' | 'geral';
  showEmpresasMenu?: boolean;
};

const STORAGE_KEY = 'nwbasset.sidebar.collapsed';

export default function AdminFrame({
  title,
  subtitle,
  children,
  minimalTopbar = false,
  userInitial,
  userName,
  userEmail,
  empresaNome,
  empresaCnpj,
  empresaLogoUrl,
  isSuperAdmin = false,
  empresas = [],
  empresaAtualId = null,
  dashboardScope = 'empresa',
  showEmpresasMenu = false,
}: AdminFrameProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === '1') {
        setCollapsed(true);
      }
    } catch {}
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[var(--workspace-bg)]">
      <div
        className={[
          'grid min-h-screen w-full transition-[grid-template-columns] duration-200 ease-out',
          collapsed ? 'md:grid-cols-[92px_minmax(0,1fr)]' : 'md:grid-cols-[320px_minmax(0,1fr)]',
        ].join(' ')}
      >
        <div className="hidden h-full bg-white md:block">
          <AdminSidebar collapsed={collapsed} onToggle={toggleSidebar} showEmpresasMenu={showEmpresasMenu} />
        </div>

        <div className="min-w-0">
          <AdminTopbar
            title={title}
            subtitle={subtitle}
            minimal={minimalTopbar}
            userInitial={userInitial}
            userName={userName}
            userEmail={userEmail}
            onToggleSidebar={toggleSidebar}
            empresaNome={empresaNome}
            empresaCnpj={empresaCnpj}
            empresaLogoUrl={empresaLogoUrl}
            isSuperAdmin={isSuperAdmin}
            empresas={empresas}
            empresaAtualId={empresaAtualId}
            dashboardScope={dashboardScope}
          />
          <main className="min-w-0 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
