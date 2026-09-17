'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import EmpresaContextHeader from '@/components/EmpresaContextHeader';
import {
  adminNavGroups,
  isAdminNavItemActive,
  renderAdminIcon,
  resolveAdminNavGroupItems,
  resolveAdminNavItems,
  type AdminNavGroup,
  type AdminNavGroupKey,
  type AdminNavItem,
} from '@/lib/admin-navigation';

type EmpresaOption = {
  id: number;
  nome_fantasia: string;
  logo_url?: string | null;
  perfil?: string | null;
};

type MobileBottomNavProps = {
  showEmpresasMenu?: boolean;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  userName?: string | null;
  userEmail?: string | null;
  userInitial: string;
  isSuperAdmin?: boolean;
  empresas?: EmpresaOption[];
  empresaAtualId?: number | null;
  dashboardScope?: 'empresa' | 'geral';
};

/** Grupos com atalho direto na barra; os demais ficam dentro de "Menu". */
const BAR_GROUPS: AdminNavGroupKey[] = ['ativos', 'inventario', 'movimentacoes'];

const DASHBOARD_HREF = '/dashboard/patrimonio';

export default function MobileBottomNav({
  showEmpresasMenu = false,
  menuOpen,
  onMenuOpenChange,
  userName,
  userEmail,
  userInitial,
  isSuperAdmin = false,
  empresas = [],
  empresaAtualId = null,
  dashboardScope = 'empresa',
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<AdminNavGroupKey | null>(null);

  const items = useMemo(() => resolveAdminNavItems(showEmpresasMenu), [showEmpresasMenu]);
  const groups = useMemo(
    () =>
      adminNavGroups
        .map((group) => ({ group, items: resolveAdminNavGroupItems(group, items) }))
        .filter((entry) => entry.items.length > 0),
    [items],
  );

  const activeGroupKey = useMemo(
    () => groups.find((entry) => entry.items.some((item) => isAdminNavItemActive(pathname, item.href)))?.group.key ?? null,
    [groups, pathname],
  );
  const dashboardActive = pathname === DASHBOARD_HREF;

  // Qualquer navegação fecha o que estiver aberto.
  useEffect(() => {
    setOpenGroup(null);
    onMenuOpenChange(false);
  }, [pathname, onMenuOpenChange]);

  const sheetOpen = menuOpen || openGroup !== null;

  // Bloqueia o scroll da página enquanto o sheet está aberto.
  useEffect(() => {
    if (!sheetOpen) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenGroup(null);
        onMenuOpenChange(false);
      }
    };
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handleEscape);
    };
  }, [sheetOpen, onMenuOpenChange]);

  function closeSheet() {
    setOpenGroup(null);
    onMenuOpenChange(false);
  }

  function toggleGroup(key: AdminNavGroupKey) {
    onMenuOpenChange(false);
    setOpenGroup((current) => (current === key ? null : key));
  }

  function toggleMenu() {
    setOpenGroup(null);
    onMenuOpenChange(!menuOpen);
  }

  const openGroupEntry = openGroup ? groups.find((entry) => entry.group.key === openGroup) ?? null : null;
  const canSwitchEmpresa = isSuperAdmin || empresas.length > 1;

  return (
    <>
      {sheetOpen ? (
        <div className="fixed inset-0 z-[68] bg-[rgba(15,23,42,0.4)] backdrop-blur-[2px] md:hidden" onClick={closeSheet} aria-hidden="true" />
      ) : null}

      {sheetOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={openGroupEntry ? openGroupEntry.group.label : 'Menu'}
          className="mobile-sheet fixed inset-x-0 z-[69] flex max-h-[calc(100dvh-96px)] flex-col rounded-t-[26px] border border-b-0 border-[rgba(17,24,39,0.08)] bg-white shadow-[0_-18px_48px_rgba(15,23,42,0.18)] md:hidden"
        >
          <div className="flex shrink-0 justify-center pt-2.5">
            <span className="h-1.5 w-12 rounded-full bg-[rgba(17,24,39,0.12)]" />
          </div>

          <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                {openGroupEntry ? 'Módulos' : 'Navegação'}
              </p>
              <h2 className="truncate font-[family-name:var(--font-heading)] text-[1.2rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">
                {openGroupEntry ? openGroupEntry.group.label : 'Menu'}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeSheet}
              aria-label="Fechar"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(17,24,39,0.05)] text-[var(--ink)]"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            {openGroupEntry ? (
              <GroupList items={openGroupEntry.items} pathname={pathname} />
            ) : (
              <div className="space-y-5">
                {canSwitchEmpresa ? (
                  <section className="rounded-[20px] border border-[var(--line)] bg-[#fafafa] p-3">
                    <EmpresaContextHeader
                      isSuperAdmin={isSuperAdmin}
                      empresas={empresas}
                      empresaAtualId={empresaAtualId}
                      dashboardScope={dashboardScope}
                    />
                  </section>
                ) : null}

                {groups.map(({ group, items: groupItems }) => (
                  <GroupGrid key={group.key} group={group} items={groupItems} pathname={pathname} />
                ))}

                <section>
                  <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Conta</p>
                  <div className="mt-2 overflow-hidden rounded-[20px] border border-[var(--line)] bg-white">
                    <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white">
                        {userInitial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--ink)]">{userName ?? 'Usuário autenticado'}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{userEmail ?? 'Conta ativa'}</p>
                      </div>
                    </div>
                    <Link
                      href="/perfil"
                      prefetch={false}
                      className={[
                        'flex items-center gap-3 px-4 py-3 text-sm font-medium',
                        pathname.startsWith('/perfil') ? 'text-[var(--accent-deep)]' : 'text-[var(--ink)]',
                      ].join(' ')}
                    >
                      <span className="[&>svg]:h-5 [&>svg]:w-5">{renderAdminIcon('user')}</span>
                      Perfil
                    </Link>
                    <Link
                      href="/ajuda"
                      prefetch={false}
                      className="flex items-center gap-3 border-t border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--ink)]"
                    >
                      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7v.5" />
                        <circle cx="12" cy="17" r=".6" fill="currentColor" stroke="none" />
                      </svg>
                      Central de Ajuda
                    </Link>
                    <form action="/api/auth/logout" method="post">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-3 border-t border-[var(--line)] px-4 py-3 text-left text-sm font-medium text-[var(--rose)]"
                      >
                        <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M9 6H6.5A1.5 1.5 0 0 0 5 7.5v9A1.5 1.5 0 0 0 6.5 18H9" />
                          <path d="M13 16l4-4-4-4" />
                          <path d="M17 12H9" />
                        </svg>
                        Sair
                      </button>
                    </form>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <nav aria-label="Navegação principal" className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[70] md:hidden">
        <div className="relative flex items-stretch justify-between border-t border-[rgba(17,24,39,0.08)] bg-[rgba(255,255,255,0.96)] px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
          {BAR_GROUPS.slice(0, 2).map((key) => (
            <GroupTab
              key={key}
              groupKey={key}
              groups={groups}
              active={!sheetOpen && activeGroupKey === key}
              pressed={openGroup === key}
              onClick={() => toggleGroup(key)}
            />
          ))}

          <div className="relative flex w-[72px] shrink-0 flex-col items-center justify-end pb-1.5">
            <Link
              href={DASHBOARD_HREF}
              prefetch={false}
              aria-label="Painel de Controle"
              aria-current={dashboardActive ? 'page' : undefined}
              onClick={closeSheet}
              className={[
                'absolute -top-5 flex h-[58px] w-[58px] items-center justify-center rounded-full border-[4px] border-[var(--workspace-bg)] text-white shadow-[0_12px_28px_rgba(246,164,0,0.38)] transition',
                dashboardActive && !sheetOpen ? 'bg-[var(--accent-deep)]' : 'bg-[var(--accent)]',
              ].join(' ')}
            >
              <span className="[&>svg]:h-[26px] [&>svg]:w-[26px]">{renderAdminIcon('home')}</span>
            </Link>
            <span
              className={[
                'text-[10px] font-semibold leading-3',
                dashboardActive && !sheetOpen ? 'text-[var(--accent-deep)]' : 'text-[#5b616d]',
              ].join(' ')}
            >
              Painel
            </span>
          </div>

          <GroupTab
            groupKey={BAR_GROUPS[2]}
            groups={groups}
            active={!sheetOpen && activeGroupKey === BAR_GROUPS[2]}
            pressed={openGroup === BAR_GROUPS[2]}
            onClick={() => toggleGroup(BAR_GROUPS[2])}
          />

          <TabButton
            label="Menu"
            icon="grid"
            active={
              !sheetOpen &&
              (pathname.startsWith('/perfil') || (activeGroupKey !== null && !BAR_GROUPS.includes(activeGroupKey)))
            }
            pressed={menuOpen}
            onClick={toggleMenu}
          />
        </div>
      </nav>
    </>
  );
}

function GroupTab({
  groupKey,
  groups,
  active,
  pressed,
  onClick,
}: {
  groupKey: AdminNavGroupKey;
  groups: Array<{ group: AdminNavGroup; items: AdminNavItem[] }>;
  active: boolean;
  pressed: boolean;
  onClick: () => void;
}) {
  const entry = groups.find((candidate) => candidate.group.key === groupKey);

  if (!entry) {
    return <span className="flex-1" aria-hidden="true" />;
  }

  return <TabButton label={entry.group.label} icon={entry.group.icon} active={active} pressed={pressed} onClick={onClick} />;
}

function TabButton({
  label,
  icon,
  active,
  pressed,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  pressed: boolean;
  onClick: () => void;
}) {
  const highlighted = active || pressed;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-current={active ? 'page' : undefined}
      className={[
        'flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 text-[10px] font-semibold leading-3 transition',
        highlighted ? 'text-[var(--accent-deep)]' : 'text-[#5b616d]',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-8 w-12 items-center justify-center rounded-full transition [&>svg]:h-[22px] [&>svg]:w-[22px]',
          highlighted ? 'bg-[var(--accent-soft)]' : '',
        ].join(' ')}
      >
        {renderAdminIcon(icon)}
      </span>
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}

function GroupList({ items, pathname }: { items: AdminNavItem[]; pathname: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => {
        const active = isAdminNavItemActive(pathname, item.href);

        return (
          <li key={item.key}>
            <Link
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex items-center gap-3 rounded-[18px] border px-3.5 py-3 transition',
                active
                  ? 'border-transparent bg-[var(--accent)] text-white shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                  : 'border-[var(--line)] bg-white text-[var(--ink)] active:bg-[rgba(17,24,39,0.04)]',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] [&>svg]:h-[22px] [&>svg]:w-[22px]',
                  active ? 'bg-white/20 text-white' : 'bg-[var(--accent-soft)] text-[var(--accent-deep)]',
                ].join(' ')}
              >
                {renderAdminIcon(item.icon)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-semibold">{item.label}</span>
                {item.description ? (
                  <span className={['mt-0.5 block text-[11px] leading-4', active ? 'text-white/85' : 'text-[var(--muted)]'].join(' ')}>
                    {item.description}
                  </span>
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function GroupGrid({ group, items, pathname }: { group: AdminNavGroup; items: AdminNavItem[]; pathname: string }) {
  return (
    <section>
      <p className="flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{renderAdminIcon(group.icon)}</span>
        {group.label}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {items.map((item) => {
          const active = isAdminNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-[84px] flex-col items-center justify-center gap-1.5 rounded-[18px] border px-1.5 py-2.5 text-center transition',
                active
                  ? 'border-transparent bg-[var(--accent)] text-white shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                  : 'border-[var(--line)] bg-white text-[var(--ink)] active:bg-[rgba(17,24,39,0.04)]',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-full [&>svg]:h-[20px] [&>svg]:w-[20px]',
                  active ? 'bg-white/20 text-white' : 'bg-[var(--accent-soft)] text-[var(--accent-deep)]',
                ].join(' ')}
              >
                {renderAdminIcon(item.icon)}
              </span>
              <span className="line-clamp-2 text-[11px] font-semibold leading-[1.15]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
