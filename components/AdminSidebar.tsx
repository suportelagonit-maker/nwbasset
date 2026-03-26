'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo } from 'react';
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

  const navigation = useMemo(
    () =>
      adminNavigation
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.key !== 'empresas' || showEmpresasMenu),
        }))
        .filter((section) => section.items.length > 0),
    [showEmpresasMenu],
  );

  useEffect(() => {
    const hrefs = navigation.flatMap((section) => section.items.map((item) => item.href));

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
  }, [navigation, router]);

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
        <div className="space-y-6">
          {navigation.map((section, sectionIndex) => (
            <section key={section.key}>
              {sectionIndex > 0 ? <div className="mb-5 h-px bg-[rgba(17,24,39,0.08)]" /> : null}

              {section.key !== 'principal' && !collapsed ? (
                <div className="mb-3 flex items-center justify-between px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {section.label}
                  </p>
                  <svg aria-hidden="true" className="h-[15px] w-[15px] text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="m8 10 4 4 4-4" />
                  </svg>
                </div>
              ) : null}

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);

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
                        collapsed ? 'justify-center px-0 py-3' : 'gap-3 px-4 py-[11px] text-[0.9rem]',
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
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </aside>
  );
}


