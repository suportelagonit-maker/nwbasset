'use client';

/* A casca do NWB Asset = AppShell do NC Design System (@nwb/ui).
 *
 * Substitui AdminFrame/AdminSidebar/AdminTopbar/MobileBottomNav: a barra
 * superior (troca de sistema, busca, tema sol/lua, menu da pessoa), a lateral
 * recolhivel e a gaveta no celular passam a ser as do DS. O NWB Asset navega
 * por ROTA: cada item tem href real e `onNavigate` empurra a rota; o item ativo
 * sai do pathname. A barra lateral e a embutida do AppShell (produto com
 * `sections`). */

import { useMemo, type ComponentType, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppShell,
  CASA_NWB,
  type ShellNavSection,
  type ShellProduct,
} from '@nwb/ui';
import {
  ChartBarIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentIcon,
  HomeIcon,
  SettingsIcon,
  UserIcon,
  UsersIcon,
  VisibilityIcon,
  WarningIcon,
} from '@nwb/icons/react';

import { adminNavigation, type AdminNavItem } from '@/lib/admin-navigation';

export const CODIGO_NWB_ASSET = 'nwb-asset';

type Icone = ComponentType<{ className?: string }>;

/* Icones que o NC Icons ainda nao tem: mesmo traco (1,75) e grade 24. */
function iconeProprio(paths: ReactNode): Icone {
  function IconeNwbAsset({ className }: { className?: string }) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        {paths}
      </svg>
    );
  }
  return IconeNwbAsset;
}

const PredioIcon = iconeProprio(
  <>
    <path d="M4 21V5l8-3 8 3v16" />
    <path d="M9 21v-5h6v5M8 9h1M15 9h1M8 13h1M15 13h1" />
  </>,
);
const FilialIcon = iconeProprio(
  <>
    <path d="M6 21V7l6-4 6 4v14" />
    <path d="M3 21h18M10 21v-4h4v4" />
  </>,
);
const OfficeIcon = iconeProprio(
  <>
    <rect x="4" y="3" width="16" height="18" rx="1.5" />
    <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2" />
  </>,
);
const CubeIcon = iconeProprio(
  <>
    <path d="M12 2.5 21 7v10l-9 4.5L3 17V7Z" />
    <path d="M3 7l9 4.5L21 7M12 11.5V21.5" />
  </>,
);
const LayersIcon = iconeProprio(
  <>
    <path d="m12 3 9 5-9 5-9-5Z" />
    <path d="m3 13 9 5 9-5M3 16l9 5 9-5" />
  </>,
);
const TagIcon = iconeProprio(
  <>
    <path d="M3 12V4h8l10 10-8 8L3 12Z" />
    <circle cx="7.5" cy="7.5" r="1.3" />
  </>,
);
const ChecklistIcon = iconeProprio(
  <>
    <path d="M4 5h11M4 12h11M4 19h11" />
    <path d="m19 4 1.5 1.5L23 3M19 11l1.5 1.5L23 10M19 18l1.5 1.5L23 17" />
  </>,
);
const SwapIcon = iconeProprio(
  <>
    <path d="M4 8h13l-3-3M20 16H7l3 3" />
  </>,
);
const ArchiveIcon = iconeProprio(
  <>
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
  </>,
);
const DatabaseIcon = iconeProprio(
  <>
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
  </>,
);
const GlobeIcon = iconeProprio(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
  </>,
);
const GridIcon = iconeProprio(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
);
const TrendIcon = iconeProprio(
  <>
    <path d="M4 18 10 12l4 4 6-7" />
    <path d="M15 7h5v5" />
  </>,
);
const ReportIcon = iconeProprio(
  <>
    <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M14 3v4h4M9 13v4M12 11v6M15 15v2" />
  </>,
);

/* Nome do icone no menu (lib/admin-navigation) -> icone do DS ou proprio. */
const ICONES: Record<string, Icone> = {
  home: HomeIcon,
  building: PredioIcon,
  branch: FilialIcon,
  office: OfficeIcon,
  cube: CubeIcon,
  layers: LayersIcon,
  tag: TagIcon,
  clipboard: DocumentIcon,
  checklist: ChecklistIcon,
  swap: SwapIcon,
  archive: ArchiveIcon,
  database: DatabaseIcon,
  globe: GlobeIcon,
  grid: GridIcon,
  trend: TrendIcon,
  report: ReportIcon,
  history: ClockIcon,
  audit: SettingsIcon,
  users: UsersIcon,
  eye: VisibilityIcon,
  alert: WarningIcon,
};

function iconeDoItem(nome: string): Icone {
  return ICONES[nome] ?? GridIcon;
}

/** adminNavigation -> secoes do AppShell. */
function secoesDeNavegacao(): ShellNavSection[] {
  return adminNavigation.map((secao) => ({
    title: secao.label,
    items: secao.items.map((item: AdminNavItem) => ({
      id: item.key,
      label: item.label,
      href: item.href,
      icon: iconeDoItem(item.icon),
    })),
  }));
}

/** Item ativo: o de href mais longo que prefixa o pathname atual. */
function itemAtivo(pathname: string): string | undefined {
  let melhor: { id: string; tamanho: number } | undefined;
  for (const secao of adminNavigation) {
    for (const item of secao.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        if (!melhor || item.href.length > melhor.tamanho) {
          melhor = { id: item.key, tamanho: item.href.length };
        }
      }
    }
  }
  return melhor?.id;
}

export default function CascaNwbAsset({
  userName,
  userEmail,
  userImage,
  sistemas,
  empresaNome,
  podeTrocarEmpresa,
  podePermissoes,
  children,
}: {
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  sistemas?: string[];
  empresaNome?: string | null;
  podeTrocarEmpresa?: boolean;
  podePermissoes?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const secoes = useMemo(() => secoesDeNavegacao(), []);
  const ativo = useMemo(() => itemAtivo(pathname), [pathname]);

  // O catalogo do @nwb/ui 0.22 ainda nao tem o NWB Asset, entao montamos o
  // produto a mao (produtosNWB validaria contra o catalogo e lancaria erro).
  // Sem a claim `sistemas`, o seletor mostra so o NWB Asset. `sistemas` fica
  // reservado para quando o catalogo do DS incluir o produto.
  void sistemas;
  const produto: ShellProduct = {
    code: CODIGO_NWB_ASSET,
    name: 'NWB Asset',
    description: 'Controle patrimonial',
    href: '/dashboard/patrimonio',
    iconSrc: '/logoasset.png',
    sections: secoes,
  };
  const products = [produto];
  const shortcuts: ShellProduct[] = [];

  const usuario = userName
    ? { name: userName, email: userEmail ?? undefined, imageSrc: userImage ?? undefined }
    : undefined;

  return (
    <AppShell
      home={CASA_NWB}
      products={products}
      shortcuts={shortcuts}
      current={CODIGO_NWB_ASSET}
      activeItem={ativo}
      user={usuario}
      userMenu={
        <div className="grid gap-0.5 p-1 text-[13px]">
          {empresaNome ? (
            <div className="px-2 py-1.5 text-[11px] text-[var(--muted)]">
              Empresa: <b className="text-[var(--ink)]">{empresaNome}</b>
            </div>
          ) : null}
          <a href="/perfil" className="rounded-lg px-2 py-1.5 hover:bg-[var(--nc-surface-interactive)]">
            Meu perfil
          </a>
          {podePermissoes ? (
            <a href="/permissoes" className="rounded-lg px-2 py-1.5 hover:bg-[var(--nc-surface-interactive)]">
              Permissões
            </a>
          ) : null}
          {podeTrocarEmpresa ? (
            <a href="/selecionar-empresa" className="rounded-lg px-2 py-1.5 hover:bg-[var(--nc-surface-interactive)]">
              Trocar de empresa
            </a>
          ) : null}
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="w-full rounded-lg px-2 py-1.5 text-left text-[var(--rose)] hover:bg-[var(--nc-surface-interactive)]"
            >
              Sair
            </button>
          </form>
        </div>
      }
      searchPlaceholder="Buscar tela do NWB Asset…"
      onNavigate={(href) => router.push(href)}
    >
      {children}
    </AppShell>
  );
}
