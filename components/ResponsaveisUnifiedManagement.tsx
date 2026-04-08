'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { startTransition, useMemo, useState } from 'react';

const GenericModuleManagement = dynamic(() => import('@/components/GenericModuleManagement'), {
  loading: () => (
    <div className="panel-surface flex items-center gap-2 rounded-[16px] border border-[var(--line)] px-4 py-3 text-[13px] text-[var(--muted)]">
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
      Carregando dados de responsáveis...
    </div>
  ),
});

type ResponsaveisUnifiedManagementProps = {
  empresaId: number | null;
  empresaNome?: string | null;
  empresaLogoUrl?: string | null;
  activeSlug: 'responsaveis' | 'responsabilidade-bens';
};

type TabKey = 'responsaveis' | 'responsabilidade-bens';

const tabs: Array<{
  key: TabKey;
  label: string;
  href: string;
  description: string;
}> = [
  {
    key: 'responsaveis',
    label: 'Responsáveis',
    href: '/dashboard/modulos/responsaveis',
    description: 'Cadastro de pessoas responsáveis por filial, com dados de contato e status operacional.',
  },
  {
    key: 'responsabilidade-bens',
    label: 'Responsabilidade de bens',
    href: '/dashboard/modulos/responsabilidade-bens',
    description: 'Histórico de atribuição e período de responsabilidade de cada bem patrimonial.',
  },
];

function UsersIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M15.5 18.5a3.5 3.5 0 0 0-7 0" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M6 18.5a3 3 0 0 0-2-2.35M18 18.5a3 3 0 0 1 2-2.35M7 10a2 2 0 1 1-2 2M17 8a2 2 0 1 1 0 4" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 4 6 6.5v4.8c0 3.4 2.2 6.5 6 8.7 3.8-2.2 6-5.3 6-8.7V6.5L12 4Z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.7" />
    </svg>
  );
}

export default function ResponsaveisUnifiedManagement({
  empresaId,
  empresaNome,
  empresaLogoUrl,
  activeSlug,
}: ResponsaveisUnifiedManagementProps) {
  const router = useRouter();
  const [isNavigatingTab, setIsNavigatingTab] = useState(false);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.key === activeSlug) ?? tabs[0],
    [activeSlug],
  );

  function handleTabChange(tab: (typeof tabs)[number]) {
    if (tab.key === activeSlug) {
      return;
    }

    setIsNavigatingTab(true);

    startTransition(() => {
      router.push(tab.href);
    });
  }

  return (
    <div className="space-y-4">
      <section className="panel-surface rounded-[24px] border border-[var(--line)] p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Subpáginas do módulo</p>
            <h2 className="mt-1 text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">Responsáveis</h2>
          </div>

          {empresaNome ? (
            <div className="rounded-xl border border-[var(--line)] bg-[#fafafa] px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Empresa ativa</p>
              <p className="mt-0.5 text-[13px] font-semibold text-[var(--ink)]">{empresaNome}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tabs.map((tab) => {
            const active = tab.key === activeSlug;
            const icon = tab.key === 'responsaveis' ? <UsersIcon /> : <ShieldIcon />;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={[
                  'rounded-[16px] border px-4 py-3 text-left transition',
                  active
                    ? 'border-[rgba(246,164,0,0.42)] bg-[rgba(246,164,0,0.1)]'
                    : 'border-[var(--line)] bg-white hover:border-[rgba(246,164,0,0.3)] hover:bg-[rgba(246,164,0,0.04)]',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={[
                        'inline-flex h-8 w-8 items-center justify-center rounded-lg',
                        active ? 'bg-[rgba(246,164,0,0.2)] text-[var(--accent-deep)]' : 'bg-[#f3f4f6] text-[#334155]',
                      ].join(' ')}
                    >
                      {icon}
                    </span>
                    <p className="text-[14px] font-semibold text-[var(--ink)]">{tab.label}</p>
                  </div>

                  {active ? (
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      Ativa
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-[12px] leading-5 text-[var(--muted)]">{tab.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {isNavigatingTab ? (
        <div className="panel-surface flex items-center gap-2 rounded-[16px] border border-[var(--line)] px-4 py-3 text-[13px] text-[var(--muted)]">
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--accent)]" />
          Carregando módulo selecionado...
        </div>
      ) : null}

      <GenericModuleManagement
        empresaId={empresaId}
        slug={activeTab.key}
        empresaNome={empresaNome}
        empresaLogoUrl={empresaLogoUrl}
        headerVariant="compact"
      />
    </div>
  );
}
