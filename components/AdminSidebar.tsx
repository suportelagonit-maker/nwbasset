'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { adminNavigation, renderAdminIcon } from '@/lib/admin-navigation';

type AdminSidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
  showEmpresasMenu?: boolean;
};

function isActive(pathname: string, href: string) {
  if (href === '/dashboard/patrimonio') {
    return pathname === '/dashboard/patrimonio';
  }

  return pathname.startsWith(href);
}

export default function AdminSidebar({
  collapsed = false,
  onToggle,
  showEmpresasMenu = false,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [corporativoOpen, setCorporativoOpen] = useState(false);
  const [ativosOpen, setAtivosOpen] = useState(false);
  const [inventarioOpen, setInventarioOpen] = useState(false);
  const [depreciacaoOpen, setDepreciacaoOpen] = useState(false);
  const [relatoriosOpen, setRelatoriosOpen] = useState(false);
  const [administracaoOpen, setAdministracaoOpen] = useState(false);
  const [movimentacoesOpen, setMovimentacoesOpen] = useState(false);
  const corporativoRef = useRef<HTMLDivElement | null>(null);
  const ativosRef = useRef<HTMLDivElement | null>(null);
  const inventarioRef = useRef<HTMLDivElement | null>(null);
  const depreciacaoRef = useRef<HTMLDivElement | null>(null);
  const relatoriosRef = useRef<HTMLDivElement | null>(null);
  const administracaoRef = useRef<HTMLDivElement | null>(null);
  const movimentacoesRef = useRef<HTMLDivElement | null>(null);

  const corporateOrder = useMemo(
    () => ['empresas', 'filiais', 'unidades-administrativas', 'departamentos', 'locais'],
    [],
  );
  const corporateKeys = useMemo(() => new Set(corporateOrder), [corporateOrder]);
  const assetsOrder = useMemo(() => ['bens', 'plaquetas'], []);
  const assetsKeys = useMemo(() => new Set(assetsOrder), [assetsOrder]);
  const inventoryOrder = useMemo(() => ['inventarios', 'conciliacoes', 'divergencias'], []);
  const inventoryKeys = useMemo(() => new Set(inventoryOrder), [inventoryOrder]);
  const depreciationOrder = useMemo(() => ['depreciacoes'], []);
  const depreciationKeys = useMemo(() => new Set(depreciationOrder), [depreciationOrder]);
  const movementsOrder = useMemo(
    () => ['responsaveis', 'transferencias-bens', 'baixas-bens', 'historico-localizacao-bens'],
    [],
  );
  const movementsKeys = useMemo(() => new Set(movementsOrder), [movementsOrder]);
  const reportsOrder = useMemo(() => ['relatorios', 'exportacoes'], []);
  const reportsKeys = useMemo(() => new Set(reportsOrder), [reportsOrder]);
  const administrationOrder = useMemo(() => ['usuarios', 'permissoes', 'auditorias'], []);
  const administrationKeys = useMemo(() => new Set(administrationOrder), [administrationOrder]);

  const navigationItems = useMemo(
    () =>
      adminNavigation
        .flatMap((section) => section.items)
        .filter((item) => item.key !== 'empresas' || showEmpresasMenu),
    [showEmpresasMenu],
  );

  const corporateItems = useMemo(() => {
    const resolved = corporateOrder
      .map((key) => navigationItems.find((item) => item.key === key))
      .filter((item): item is (typeof navigationItems)[number] => Boolean(item));

    return resolved;
  }, [corporateOrder, navigationItems]);
  const assetsItems = useMemo(() => {
    const resolved = assetsOrder
      .map((key) => navigationItems.find((item) => item.key === key))
      .filter((item): item is (typeof navigationItems)[number] => Boolean(item));

    return resolved;
  }, [assetsOrder, navigationItems]);
  const inventoryItems = useMemo(() => {
    const resolved = inventoryOrder
      .map((key) => navigationItems.find((item) => item.key === key))
      .filter((item): item is (typeof navigationItems)[number] => Boolean(item));

    return resolved;
  }, [inventoryOrder, navigationItems]);
  const depreciationItems = useMemo(() => {
    const resolved = depreciationOrder
      .map((key) => navigationItems.find((item) => item.key === key))
      .filter((item): item is (typeof navigationItems)[number] => Boolean(item));

    return resolved;
  }, [depreciationOrder, navigationItems]);
  const movementItems = useMemo(() => {
    const resolved = movementsOrder
      .map((key) => navigationItems.find((item) => item.key === key))
      .filter((item): item is (typeof navigationItems)[number] => Boolean(item));

    return resolved;
  }, [movementsOrder, navigationItems]);
  const reportsItems = useMemo(() => {
    const resolved = reportsOrder
      .map((key) => navigationItems.find((item) => item.key === key))
      .filter((item): item is (typeof navigationItems)[number] => Boolean(item));

    return resolved;
  }, [reportsOrder, navigationItems]);
  const administrationItems = useMemo(() => {
    const resolved = administrationOrder
      .map((key) => navigationItems.find((item) => item.key === key))
      .filter((item): item is (typeof navigationItems)[number] => Boolean(item));

    return resolved;
  }, [administrationOrder, navigationItems]);
  const rootItems = useMemo(
    () =>
      navigationItems.filter(
        (item) =>
          !corporateKeys.has(item.key) &&
          !assetsKeys.has(item.key) &&
          !inventoryKeys.has(item.key) &&
          !depreciationKeys.has(item.key) &&
          !movementsKeys.has(item.key) &&
          !reportsKeys.has(item.key) &&
          !administrationKeys.has(item.key),
      ),
    [administrationKeys, assetsKeys, corporateKeys, depreciationKeys, inventoryKeys, movementsKeys, navigationItems, reportsKeys],
  );
  const dashboardItem = useMemo(
    () => rootItems.find((item) => item.key === 'dashboard') ?? null,
    [rootItems],
  );
  const otherRootItems = useMemo(
    () => rootItems.filter((item) => item.key !== 'dashboard'),
    [rootItems],
  );
  const corporateIsActive = useMemo(
    () => corporateItems.some((item) => isActive(pathname, item.href)),
    [corporateItems, pathname],
  );
  const assetsIsActive = useMemo(
    () => assetsItems.some((item) => isActive(pathname, item.href)),
    [assetsItems, pathname],
  );
  const inventoryIsActive = useMemo(
    () => inventoryItems.some((item) => isActive(pathname, item.href)),
    [inventoryItems, pathname],
  );
  const depreciationIsActive = useMemo(
    () => depreciationItems.some((item) => isActive(pathname, item.href)),
    [depreciationItems, pathname],
  );
  const movementIsActive = useMemo(
    () => movementItems.some((item) => isActive(pathname, item.href)),
    [movementItems, pathname],
  );
  const reportsIsActive = useMemo(
    () => reportsItems.some((item) => isActive(pathname, item.href)),
    [reportsItems, pathname],
  );
  const administrationIsActive = useMemo(
    () => administrationItems.some((item) => isActive(pathname, item.href)),
    [administrationItems, pathname],
  );
  const anyFlyoutOpen =
    corporativoOpen ||
    ativosOpen ||
    inventarioOpen ||
    depreciacaoOpen ||
    movimentacoesOpen ||
    relatoriosOpen ||
    administracaoOpen;
  const corporateHighlighted =
    corporativoOpen ||
    (!ativosOpen &&
      !inventarioOpen &&
      !depreciacaoOpen &&
      !movimentacoesOpen &&
      !relatoriosOpen &&
      !administracaoOpen &&
      corporateIsActive);
  const assetsHighlighted =
    ativosOpen ||
    (!corporativoOpen &&
      !inventarioOpen &&
      !depreciacaoOpen &&
      !movimentacoesOpen &&
      !relatoriosOpen &&
      !administracaoOpen &&
      assetsIsActive);
  const inventoryHighlighted =
    inventarioOpen ||
    (!corporativoOpen &&
      !ativosOpen &&
      !depreciacaoOpen &&
      !movimentacoesOpen &&
      !relatoriosOpen &&
      !administracaoOpen &&
      inventoryIsActive);
  const depreciationHighlighted =
    depreciacaoOpen ||
    (!corporativoOpen &&
      !ativosOpen &&
      !inventarioOpen &&
      !movimentacoesOpen &&
      !relatoriosOpen &&
      !administracaoOpen &&
      depreciationIsActive);
  const movementsHighlighted =
    movimentacoesOpen ||
    (!corporativoOpen &&
      !ativosOpen &&
      !inventarioOpen &&
      !depreciacaoOpen &&
      !relatoriosOpen &&
      !administracaoOpen &&
      movementIsActive);
  const reportsHighlighted =
    relatoriosOpen ||
    (!corporativoOpen &&
      !ativosOpen &&
      !inventarioOpen &&
      !depreciacaoOpen &&
      !movimentacoesOpen &&
      !administracaoOpen &&
      reportsIsActive);
  const administrationHighlighted =
    administracaoOpen ||
    (!corporativoOpen &&
      !ativosOpen &&
      !inventarioOpen &&
      !depreciacaoOpen &&
      !movimentacoesOpen &&
      !relatoriosOpen &&
      administrationIsActive);

  useEffect(() => {
    if (corporateIsActive) {
      setCorporativoOpen(true);
    }
  }, [corporateIsActive]);
  useEffect(() => {
    if (assetsIsActive) {
      setAtivosOpen(true);
    }
  }, [assetsIsActive]);
  useEffect(() => {
    if (inventoryIsActive) {
      setInventarioOpen(true);
    }
  }, [inventoryIsActive]);
  useEffect(() => {
    if (depreciationIsActive) {
      setDepreciacaoOpen(true);
    }
  }, [depreciationIsActive]);
  useEffect(() => {
    if (movementIsActive) {
      setMovimentacoesOpen(true);
    }
  }, [movementIsActive]);
  useEffect(() => {
    if (reportsIsActive) {
      setRelatoriosOpen(true);
    }
  }, [reportsIsActive]);
  useEffect(() => {
    if (administrationIsActive) {
      setAdministracaoOpen(true);
    }
  }, [administrationIsActive]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        !corporativoOpen &&
        !ativosOpen &&
        !inventarioOpen &&
        !depreciacaoOpen &&
        !movimentacoesOpen &&
        !relatoriosOpen &&
        !administracaoOpen
      ) {
        return;
      }

      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (corporativoRef.current?.contains(target)) {
        return;
      }
      if (ativosRef.current?.contains(target)) {
        return;
      }
      if (inventarioRef.current?.contains(target)) {
        return;
      }
      if (depreciacaoRef.current?.contains(target)) {
        return;
      }
      if (movimentacoesRef.current?.contains(target)) {
        return;
      }
      if (relatoriosRef.current?.contains(target)) {
        return;
      }
      if (administracaoRef.current?.contains(target)) {
        return;
      }

      setCorporativoOpen(false);
      setAtivosOpen(false);
      setInventarioOpen(false);
      setDepreciacaoOpen(false);
      setMovimentacoesOpen(false);
      setRelatoriosOpen(false);
      setAdministracaoOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [administracaoOpen, ativosOpen, corporativoOpen, depreciacaoOpen, inventarioOpen, movimentacoesOpen, relatoriosOpen]);

  useEffect(() => {
    setCorporativoOpen(false);
    setAtivosOpen(false);
    setInventarioOpen(false);
    setDepreciacaoOpen(false);
    setMovimentacoesOpen(false);
    setRelatoriosOpen(false);
    setAdministracaoOpen(false);
  }, [pathname]);

  useEffect(() => {
    const hrefs = navigationItems.map((item) => item.href);

    const prefetchAll = () => {
      hrefs.forEach((href) => {
        try {
          router.prefetch(href);
        } catch {}
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => prefetchAll(), { timeout: 1500 });

      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(prefetchAll, 300);

    return () => clearTimeout(timeoutId);
  }, [navigationItems, router]);

  function renderItem(
    item: (typeof navigationItems)[number],
    nested = false,
    forceInactive = false,
  ) {
    const active = !forceInactive && isActive(pathname, item.href);

    return (
      <Link
        key={item.key}
        href={item.href}
        prefetch
        onMouseEnter={() => {
          try {
            router.prefetch(item.href);
          } catch {}
        }}
        className={[
          'flex items-center rounded-2xl font-medium transition',
          collapsed
            ? 'justify-center px-0 py-3'
            : nested
              ? 'gap-3 px-3 py-[10px] text-[0.875rem]'
              : 'gap-3 px-4 py-[11px] text-[0.9rem]',
          active
            ? 'bg-[var(--accent)] text-white shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
            : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
        ].join(' ')}
      >
        <span
          className={[
            'shrink-0 [&>svg]:h-[26px] [&>svg]:w-[26px]',
            active ? 'text-white' : 'text-[#202632]',
          ].join(' ')}
        >
          {renderAdminIcon(item.icon)}
        </span>
        {!collapsed ? <span className="truncate">{item.label}</span> : null}
      </Link>
    );
  }

  function closeAllGroupFlyouts() {
    setCorporativoOpen(false);
    setAtivosOpen(false);
    setInventarioOpen(false);
    setDepreciacaoOpen(false);
    setMovimentacoesOpen(false);
    setRelatoriosOpen(false);
    setAdministracaoOpen(false);
  }

  function openGroupFromCollapsed(
    group:
      | 'corporativo'
      | 'ativos'
      | 'inventario'
      | 'depreciacao'
      | 'movimentacoes'
      | 'relatorios'
      | 'administracao',
  ) {
    closeAllGroupFlyouts();

    if (group === 'corporativo') setCorporativoOpen(true);
    if (group === 'ativos') setAtivosOpen(true);
    if (group === 'inventario') setInventarioOpen(true);
    if (group === 'depreciacao') setDepreciacaoOpen(true);
    if (group === 'movimentacoes') setMovimentacoesOpen(true);
    if (group === 'relatorios') setRelatoriosOpen(true);
    if (group === 'administracao') setAdministracaoOpen(true);

    if (collapsed) {
      onToggle?.();
    }
  }

  const collapsedPrimaryMenus = useMemo(() => {
    const items: Array<{
      key: string;
      icon: string;
      label: string;
      active: boolean;
      onClick: () => void;
    }> = [];

    if (dashboardItem) {
      items.push({
        key: 'dashboard',
        icon: dashboardItem.icon,
        label: dashboardItem.label,
        active: isActive(pathname, dashboardItem.href) && !anyFlyoutOpen,
        onClick: () => {
          closeAllGroupFlyouts();
          if (collapsed) {
            onToggle?.();
          }
          router.push(dashboardItem.href);
        },
      });
    }

    if (corporateItems.length > 0) {
      items.push({
        key: 'corporativo',
        icon: 'building',
        label: 'Corporativo',
        active: corporateHighlighted,
        onClick: () => openGroupFromCollapsed('corporativo'),
      });
    }

    if (assetsItems.length > 0) {
      items.push({
        key: 'ativos',
        icon: 'cube',
        label: 'Ativos',
        active: assetsHighlighted,
        onClick: () => openGroupFromCollapsed('ativos'),
      });
    }

    if (inventoryItems.length > 0) {
      items.push({
        key: 'inventario',
        icon: 'clipboard',
        label: 'Inventário',
        active: inventoryHighlighted,
        onClick: () => openGroupFromCollapsed('inventario'),
      });
    }

    if (depreciationItems.length > 0) {
      items.push({
        key: 'depreciacao',
        icon: 'trend',
        label: 'Depreciação',
        active: depreciationHighlighted,
        onClick: () => openGroupFromCollapsed('depreciacao'),
      });
    }

    if (movementItems.length > 0) {
      items.push({
        key: 'movimentacoes',
        icon: 'swap',
        label: 'Movimentações',
        active: movementsHighlighted,
        onClick: () => openGroupFromCollapsed('movimentacoes'),
      });
    }

    if (reportsItems.length > 0) {
      items.push({
        key: 'relatorios',
        icon: 'report',
        label: 'Relatórios',
        active: reportsHighlighted,
        onClick: () => openGroupFromCollapsed('relatorios'),
      });
    }

    if (administrationItems.length > 0) {
      items.push({
        key: 'administracao',
        icon: 'users',
        label: 'Administração',
        active: administrationHighlighted,
        onClick: () => openGroupFromCollapsed('administracao'),
      });
    }

    return items;
  }, [
    administrationHighlighted,
    administrationItems.length,
    anyFlyoutOpen,
    assetsHighlighted,
    assetsItems.length,
    collapsed,
    corporateHighlighted,
    corporateItems.length,
    dashboardItem,
    depreciationHighlighted,
    depreciationItems.length,
    inventoryHighlighted,
    inventoryItems.length,
    movementItems.length,
    movementsHighlighted,
    pathname,
    reportsHighlighted,
    reportsItems.length,
    router,
  ]);

  return (
    <aside className="admin-sidebar-surface flex min-h-screen flex-col overflow-visible border-r border-[rgba(17,24,39,0.08)] bg-white">
      <div className={['flex items-center border-b border-[rgba(17,24,39,0.08)] py-5', collapsed ? 'justify-center px-3' : 'gap-3 px-6'].join(' ')}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(246,164,0,0.12)] text-[var(--accent)] transition hover:bg-[rgba(246,164,0,0.18)]"
        >
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 7h12" />
            <path d="M6 12h8" />
            <path d="M6 17h12" />
          </svg>
        </button>

        {!collapsed ? (
          <div className="min-w-0">
            <Image
              src="/logoasset.png"
              alt="NWB Asset"
              width={170}
              height={44}
              priority
              className="h-auto w-[150px] object-contain"
            />
          </div>
        ) : null}
      </div>

      <div className={['py-5', collapsed ? 'px-2 pb-3' : 'px-4 pb-3'].join(' ')}>
        {collapsed ? (
          <div className="space-y-1">
            {collapsedPrimaryMenus.map((item) => (
              <div key={item.key} className="group relative">
                <button
                  type="button"
                  onClick={item.onClick}
                  aria-label={item.label}
                  title={item.label}
                  className={[
                    'flex w-full justify-center rounded-2xl px-0 py-3 font-medium transition',
                    item.active
                      ? 'bg-[var(--accent)] text-white shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                      : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'shrink-0 [&>svg]:h-[26px] [&>svg]:w-[26px]',
                      item.active ? 'text-white' : 'text-[#202632]',
                    ].join(' ')}
                  >
                    {renderAdminIcon(item.icon)}
                  </span>
                </button>

                <span
                  className={[
                    'pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-xl border border-[rgba(17,24,39,0.14)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#202632] shadow-[0_10px_24px_rgba(15,23,42,0.16)]',
                    'group-hover:inline-flex group-focus-within:inline-flex',
                  ].join(' ')}
                >
                  {item.label}
                </span>
                <span
                  className={[
                    'pointer-events-none absolute left-[calc(100%+6px)] top-1/2 z-50 hidden h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-[rgba(17,24,39,0.14)] bg-white',
                    'group-hover:block group-focus-within:block',
                  ].join(' ')}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {dashboardItem ? renderItem(dashboardItem, false, anyFlyoutOpen) : null}

            {corporateItems.length > 0 ? (
              <div ref={corporativoRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCorporativoOpen((current) => !current);
                    setAtivosOpen(false);
                    setInventarioOpen(false);
                    setDepreciacaoOpen(false);
                    setMovimentacoesOpen(false);
                    setRelatoriosOpen(false);
                    setAdministracaoOpen(false);
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left font-medium transition',
                    corporateHighlighted
                      ? 'bg-[var(--accent)] text-[#111827] shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                      : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        'shrink-0 [&>svg]:h-[24px] [&>svg]:w-[24px]',
                        corporateHighlighted ? 'text-[#111827]' : 'text-[#202632]',
                      ].join(' ')}
                    >
                      {renderAdminIcon('building')}
                    </span>
                    <span className="text-[0.88rem] font-semibold">Corporativo</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={['h-4 w-4 transition-transform', corporativoOpen ? 'translate-x-0.5' : ''].join(' ')}
                  >
                    <path d="m7 5 6 5-6 5" />
                  </svg>
                </button>

                {corporativoOpen ? (
                  <div className="absolute left-[calc(100%+10px)] top-0 z-40 w-[280px] rounded-2xl border border-[rgba(17,24,39,0.12)] bg-white p-2 shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-[rgba(17,24,39,0.12)] bg-white" />
                    <div className="space-y-1">
                      {corporateItems.map((item) => renderItem(item, true))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {assetsItems.length > 0 ? (
              <div ref={ativosRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAtivosOpen((current) => !current);
                    setCorporativoOpen(false);
                    setInventarioOpen(false);
                    setDepreciacaoOpen(false);
                    setMovimentacoesOpen(false);
                    setRelatoriosOpen(false);
                    setAdministracaoOpen(false);
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left font-medium transition',
                    assetsHighlighted
                      ? 'bg-[var(--accent)] text-[#111827] shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                      : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        'shrink-0 [&>svg]:h-[24px] [&>svg]:w-[24px]',
                        assetsHighlighted ? 'text-[#111827]' : 'text-[#202632]',
                      ].join(' ')}
                    >
                      {renderAdminIcon('cube')}
                    </span>
                    <span className="text-[0.88rem] font-semibold">Ativos</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={['h-4 w-4 transition-transform', ativosOpen ? 'translate-x-0.5' : ''].join(' ')}
                  >
                    <path d="m7 5 6 5-6 5" />
                  </svg>
                </button>

                {ativosOpen ? (
                  <div className="absolute left-[calc(100%+10px)] top-0 z-40 w-[280px] rounded-2xl border border-[rgba(17,24,39,0.12)] bg-white p-2 shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-[rgba(17,24,39,0.12)] bg-white" />
                    <div className="space-y-1">
                      {assetsItems.map((item) => renderItem(item, true))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {inventoryItems.length > 0 ? (
              <div ref={inventarioRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setInventarioOpen((current) => !current);
                    setAtivosOpen(false);
                    setCorporativoOpen(false);
                    setDepreciacaoOpen(false);
                    setMovimentacoesOpen(false);
                    setRelatoriosOpen(false);
                    setAdministracaoOpen(false);
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left font-medium transition',
                    inventoryHighlighted
                      ? 'bg-[var(--accent)] text-[#111827] shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                      : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        'shrink-0 [&>svg]:h-[24px] [&>svg]:w-[24px]',
                        inventoryHighlighted ? 'text-[#111827]' : 'text-[#202632]',
                      ].join(' ')}
                    >
                      {renderAdminIcon('clipboard')}
                    </span>
                    <span className="text-[0.88rem] font-semibold">Inventário</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={['h-4 w-4 transition-transform', inventarioOpen ? 'translate-x-0.5' : ''].join(' ')}
                  >
                    <path d="m7 5 6 5-6 5" />
                  </svg>
                </button>

                {inventarioOpen ? (
                  <div className="absolute left-[calc(100%+10px)] top-0 z-40 w-[280px] rounded-2xl border border-[rgba(17,24,39,0.12)] bg-white p-2 shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-[rgba(17,24,39,0.12)] bg-white" />
                    <div className="space-y-1">
                      {inventoryItems.map((item) => renderItem(item, true))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {depreciationItems.length > 0 ? (
              <div ref={depreciacaoRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDepreciacaoOpen((current) => !current);
                    setInventarioOpen(false);
                    setAtivosOpen(false);
                    setCorporativoOpen(false);
                    setMovimentacoesOpen(false);
                    setRelatoriosOpen(false);
                    setAdministracaoOpen(false);
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left font-medium transition',
                    depreciationHighlighted
                      ? 'bg-[var(--accent)] text-[#111827] shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                      : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        'shrink-0 [&>svg]:h-[24px] [&>svg]:w-[24px]',
                        depreciationHighlighted ? 'text-[#111827]' : 'text-[#202632]',
                      ].join(' ')}
                    >
                      {renderAdminIcon('trend')}
                    </span>
                    <span className="text-[0.88rem] font-semibold">Depreciação</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={['h-4 w-4 transition-transform', depreciacaoOpen ? 'translate-x-0.5' : ''].join(' ')}
                  >
                    <path d="m7 5 6 5-6 5" />
                  </svg>
                </button>

                {depreciacaoOpen ? (
                  <div className="absolute left-[calc(100%+10px)] top-0 z-40 w-[280px] rounded-2xl border border-[rgba(17,24,39,0.12)] bg-white p-2 shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-[rgba(17,24,39,0.12)] bg-white" />
                    <div className="space-y-1">
                      {depreciationItems.map((item) => renderItem(item, true))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {movementItems.length > 0 ? (
              <div ref={movimentacoesRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMovimentacoesOpen((current) => !current);
                    setDepreciacaoOpen(false);
                    setInventarioOpen(false);
                    setAtivosOpen(false);
                    setCorporativoOpen(false);
                    setRelatoriosOpen(false);
                    setAdministracaoOpen(false);
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left font-medium transition',
                    movementsHighlighted
                      ? 'bg-[var(--accent)] text-[#111827] shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                      : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        'shrink-0 [&>svg]:h-[24px] [&>svg]:w-[24px]',
                        movementsHighlighted ? 'text-[#111827]' : 'text-[#202632]',
                      ].join(' ')}
                    >
                      {renderAdminIcon('swap')}
                    </span>
                    <span className="text-[0.88rem] font-semibold">Movimentações</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={['h-4 w-4 transition-transform', movimentacoesOpen ? 'translate-x-0.5' : ''].join(' ')}
                  >
                    <path d="m7 5 6 5-6 5" />
                  </svg>
                </button>

                {movimentacoesOpen ? (
                  <div className="absolute left-[calc(100%+10px)] top-0 z-40 w-[280px] rounded-2xl border border-[rgba(17,24,39,0.12)] bg-white p-2 shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-[rgba(17,24,39,0.12)] bg-white" />
                    <div className="space-y-1">
                      {movementItems.map((item) => renderItem(item, true))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {reportsItems.length > 0 ? (
              <div ref={relatoriosRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRelatoriosOpen((current) => !current);
                    setDepreciacaoOpen(false);
                    setInventarioOpen(false);
                    setAtivosOpen(false);
                    setCorporativoOpen(false);
                    setMovimentacoesOpen(false);
                    setAdministracaoOpen(false);
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left font-medium transition',
                    reportsHighlighted
                      ? 'bg-[var(--accent)] text-[#111827] shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                      : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        'shrink-0 [&>svg]:h-[24px] [&>svg]:w-[24px]',
                        reportsHighlighted ? 'text-[#111827]' : 'text-[#202632]',
                      ].join(' ')}
                    >
                      {renderAdminIcon('report')}
                    </span>
                    <span className="text-[0.88rem] font-semibold">Relatórios</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={['h-4 w-4 transition-transform', relatoriosOpen ? 'translate-x-0.5' : ''].join(' ')}
                  >
                    <path d="m7 5 6 5-6 5" />
                  </svg>
                </button>

                {relatoriosOpen ? (
                  <div className="absolute left-[calc(100%+10px)] top-0 z-40 w-[280px] rounded-2xl border border-[rgba(17,24,39,0.12)] bg-white p-2 shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-[rgba(17,24,39,0.12)] bg-white" />
                    <div className="space-y-1">
                      {reportsItems.map((item) => renderItem(item, true))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {administrationItems.length > 0 ? (
              <div ref={administracaoRef} className="relative mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdministracaoOpen((current) => !current);
                    setRelatoriosOpen(false);
                    setDepreciacaoOpen(false);
                    setInventarioOpen(false);
                    setAtivosOpen(false);
                    setCorporativoOpen(false);
                    setMovimentacoesOpen(false);
                  }}
                  className={[
                    'flex w-full items-center justify-between gap-3 rounded-2xl px-3.5 py-2.5 text-left font-medium transition',
                    administrationHighlighted
                      ? 'bg-[var(--accent)] text-[#111827] shadow-[0_10px_24px_rgba(246,164,0,0.22)]'
                      : 'text-[#212734] hover:bg-[rgba(17,24,39,0.04)]',
                  ].join(' ')}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={[
                        'shrink-0 [&>svg]:h-[24px] [&>svg]:w-[24px]',
                        administrationHighlighted ? 'text-[#111827]' : 'text-[#202632]',
                      ].join(' ')}
                    >
                      {renderAdminIcon('users')}
                    </span>
                    <span className="text-[0.88rem] font-semibold">Administração</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className={['h-4 w-4 transition-transform', administracaoOpen ? 'translate-x-0.5' : ''].join(' ')}
                  >
                    <path d="m7 5 6 5-6 5" />
                  </svg>
                </button>

                {administracaoOpen ? (
                  <div className="absolute left-[calc(100%+10px)] top-0 z-40 w-[280px] rounded-2xl border border-[rgba(17,24,39,0.12)] bg-white p-2 shadow-[0_18px_36px_rgba(15,23,42,0.14)]">
                    <div className="absolute -left-1.5 top-5 h-3 w-3 rotate-45 border-b border-l border-[rgba(17,24,39,0.12)] bg-white" />
                    <div className="space-y-1">
                      {administrationItems.map((item) => renderItem(item, true))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {otherRootItems.map((item) => renderItem(item, false, anyFlyoutOpen))}
          </div>
        )}
      </div>
    </aside>
  );
}


