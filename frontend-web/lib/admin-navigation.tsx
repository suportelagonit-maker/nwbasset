import type { ReactNode } from 'react';

export type AdminNavSection = {
  key: string;
  label: string;
  items: AdminNavItem[];
};

export type AdminNavItem = {
  key: string;
  label: string;
  href: string;
  icon: string;
  description?: string;
  endpoints?: string[];
};

export const adminNavigation: AdminNavSection[] = [
  {
    key: 'principal',
    label: 'Principal',
    items: [
      {
        key: 'dashboard',
        label: 'Painel de Controle',
        href: '/dashboard/patrimonio',
        icon: 'home',
        description: 'Resumo executivo do patrimônio com indicadores, distribuição e exportações.',
      },
      {
        key: 'empresas',
        label: 'Empresas',
        href: '/dashboard/modulos/empresas',
        icon: 'building',
        description: 'Gestão das empresas do ambiente multiempresa.',
        endpoints: ['/api/v1/empresas'],
      },
      {
        key: 'filiais',
        label: 'Filiais',
        href: '/dashboard/modulos/filiais',
        icon: 'branch',
        description: 'Cadastro de filiais vinculadas a cada empresa.',
        endpoints: ['/api/v1/filiais'],
      },
      {
        key: 'unidades-administrativas',
        label: 'Unidades Administrativas',
        href: '/dashboard/modulos/unidades-administrativas',
        icon: 'office',
        description: 'Estrutura administrativa vinculada · empresa e filial.',
        endpoints: ['/api/v1/unidades-administrativas'],
      },
      {
        key: 'bens',
        label: 'Bens Patrimoniais',
        href: '/dashboard/modulos/bens',
        icon: 'cube',
        description: 'Cadastro e consulta de bens patrimoniais.',
        endpoints: ['/api/v1/bens'],
      },
      {
        key: 'tipos-bens',
        label: 'Tipos de Bem Patrimonial',
        href: '/dashboard/modulos/tipos-bens',
        icon: 'grid',
        description: 'Catálogo dos tipos de bem patrimonial.',
        endpoints: ['/api/v1/tipos-bens-patrimoniais'],
      },
      {
        key: 'tipos-produtos',
        label: 'Tipos de Produto',
        href: '/dashboard/modulos/tipos-produtos',
        icon: 'layers',
        description: 'Catálogo de produtos/subtipos por tipo de bem.',
        endpoints: ['/api/v1/tipos-produtos'],
      },
      {
        key: 'plaquetas',
        label: 'Plaquetas / QR Code',
        href: '/dashboard/modulos/plaquetas',
        icon: 'tag',
        description: 'Identificação patrimonial, geração de plaquetas e QR Code.',
        endpoints: ['/api/v1/plaquetas'],
      },
      {
        key: 'inventarios',
        label: 'Inventários',
        href: '/dashboard/modulos/inventarios',
        icon: 'clipboard',
        description: 'Execução e acompanhamento de inventários patrimoniais.',
        endpoints: ['/api/v1/inventarios', '/api/v1/inventario-itens'],
      },
      {
        key: 'locais',
        label: 'Locais',
        href: '/dashboard/modulos/locais',
        icon: 'globe',
        description: 'Locais físicos de alocação dos bens.',
        endpoints: ['/api/v1/locais'],
      },
    ],
  },
  {
    key: 'configuracoes',
    label: 'Configurações',
    items: [
      {
        key: 'departamentos',
        label: 'Departamentos',
        href: '/dashboard/modulos/departamentos',
        icon: 'layers',
        description: 'Departamentos vinculados a unidades administrativas.',
        endpoints: ['/api/v1/departamentos'],
      },
      {
        key: 'responsaveis',
        label: 'Responsáveis',
        href: '/dashboard/modulos/responsaveis',
        icon: 'users',
        description: 'Cadastro de responsáveis e histórico de responsabilidade dos bens.',
        endpoints: ['/api/v1/responsaveis', '/api/v1/responsabilidade-bens'],
      },
      {
        key: 'transferencias-bens',
        label: 'Transferências',
        href: '/dashboard/modulos/transferencias-bens',
        icon: 'swap',
        description: 'Movimentação de bens entre locais, departamentos e unidades.',
        endpoints: ['/api/v1/transferencias-bens'],
      },
      {
        key: 'baixas-bens',
        label: 'Baixas Patrimoniais',
        href: '/dashboard/modulos/baixas-bens',
        icon: 'archive',
        description: 'Baixa formal e auditável de bens.',
        endpoints: ['/api/v1/baixas-bens'],
      },
      {
        key: 'historico-localizacao-bens',
        label: 'Histórico de Localização',
        href: '/dashboard/modulos/historico-localizacao-bens',
        icon: 'history',
        description: 'Rastreio de localização dos bens ao longo do tempo.',
        endpoints: ['/api/v1/historico-localizacao-bens'],
      },
      {
        key: 'depreciacoes',
        label: 'Depreciações',
        href: '/dashboard/modulos/depreciacoes',
        icon: 'trend',
        description: 'Motor de depreciação com regras por tipo de bem.',
        endpoints: ['/api/v1/regras-depreciacao', '/api/v1/metodos-depreciacao', '/api/v1/depreciacoes'],
      },
      {
        key: 'conciliacoes',
        label: 'Conciliações',
        href: '/dashboard/modulos/conciliacoes',
        icon: 'checklist',
        description: 'Conciliação patrimonial entre sistema e inventário.',
        endpoints: ['/api/v1/conciliacoes'],
      },
      {
        key: 'divergencias',
        label: 'Divergências',
        href: '/dashboard/modulos/divergencias',
        icon: 'alert',
        description: 'Divergências apuradas durante inventários e conciliações.',
        endpoints: ['/api/v1/divergencias'],
      },
      {
        key: 'relatorios',
        label: 'Relatórios',
        href: '/dashboard/modulos/relatorios',
        icon: 'report',
        description: 'Relatórios patrimoniais operacionais e gerenciais.',
        endpoints: [
          '/api/v1/relatorios/bens-por-local',
          '/api/v1/relatorios/bens-por-responsavel',
          '/api/v1/relatorios/depreciacao',
          '/api/v1/relatorios/inventario',
          '/api/v1/relatorios/divergencias',
        ],
      },
      {
        key: 'exportacoes',
        label: 'Exportações',
        href: '/dashboard/modulos/exportacoes',
        icon: 'database',
        description: 'Exportação de relatórios em PDF, Excel e CSV.',
        endpoints: [
          '/api/v1/exportacoes/bens-por-local/pdf',
          '/api/v1/exportacoes/bens-por-local/excel',
          '/api/v1/exportacoes/bens-por-local/csv',
        ],
      },
      {
        key: 'auditorias',
        label: 'Auditorias',
        href: '/dashboard/modulos/auditorias',
        icon: 'audit',
        description: 'Auditoria patrimonial e trilhas operacionais.',
        endpoints: ['/api/v1/auditorias'],
      },
      {
        key: 'usuarios',
        label: 'Usuários',
        href: '/users',
        icon: 'users',
        description: 'Gestão de usuários, perfis e status de acesso.',
        endpoints: ['/api/v1/usuarios'],
      },
      {
        key: 'permissoes',
        label: 'Permissões',
        href: '/permissoes',
        icon: 'eye',
        description: 'Matriz de permissões por perfil do sistema.',
        endpoints: ['/api/v1/roles-permissoes'],
      },
    ],
  },
];

export const adminModules = adminNavigation
  .flatMap((section) => section.items)
  .filter((item) => item.href.startsWith('/dashboard/modulos/'))
  .map((item) => ({
    slug: item.href.replace('/dashboard/modulos/', ''),
    label: item.label,
    description: item.description ?? '',
    endpoints: item.endpoints ?? [],
    icon: item.icon,
  }));

export function getAdminModule(slug: string) {
  return adminModules.find((module) => module.slug === slug) ?? null;
}

export function renderAdminIcon(icon: string): ReactNode {
  switch (icon) {
    case 'home':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 10.5 12 4l7 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-3v5H6a1 1 0 0 1-1-1v-8.5Z" />
        </svg>
      );
    case 'building':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 20V6l7-2v16" />
          <path d="M12 20h7V9l-7-2" />
          <path d="M8 9h1M8 12h1M8 15h1M15 11h1M15 14h1" />
        </svg>
      );
    case 'branch':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5v14" />
          <path d="M12 9h6" />
          <path d="M12 15H6" />
          <circle cx="12" cy="5" r="2" />
          <circle cx="18" cy="9" r="2" />
          <circle cx="6" cy="15" r="2" />
        </svg>
      );
    case 'office':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 20h18" />
          <path d="M5 20V8l7-4 7 4v12" />
          <path d="M9 12h1M9 15h1M14 12h1M14 15h1" />
        </svg>
      );
    case 'cube':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4.5 7.5 12 4l7.5 3.5L12 11 4.5 7.5Z" />
          <path d="M4.5 7.5V16L12 20l7.5-4V7.5" />
          <path d="M12 11v9" />
        </svg>
      );
    case 'tag':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 7h4v4H7zM13 13h4v4h-4zM13 7h4v3h-4zM7 14h3v3H7z" />
        </svg>
      );
    case 'clipboard':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 4h6l1 2h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2l1-2Z" />
          <path d="M8 11h8M8 15h5" />
        </svg>
      );
    case 'globe':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4a13 13 0 0 1 0 16M12 4a13 13 0 0 0 0 16" />
        </svg>
      );
    case 'layers':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m12 4 8 4-8 4-8-4 8-4Z" />
          <path d="m4 12 8 4 8-4" />
          <path d="m4 16 8 4 8-4" />
        </svg>
      );
    case 'users':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M15.5 18.5a3.5 3.5 0 0 0-7 0" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M6 18.5a3 3 0 0 0-2-2.35M18 18.5a3 3 0 0 1 2-2.35M7 10a2 2 0 1 1-2 2M17 8a2 2 0 1 1 0 4" />
        </svg>
      );
    case 'swap':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 7h11" />
          <path d="m14 4 4 3-4 3" />
          <path d="M17 17H6" />
          <path d="m10 14-4 3 4 3" />
        </svg>
      );
    case 'archive':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 7h16" />
          <path d="M5 7h14v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7Z" />
          <path d="M9 11h6" />
          <path d="M6 4h12v3H6z" />
        </svg>
      );
    case 'shield':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 4 6 6.5v4.8c0 3.4 2.2 6.5 6 8.7 3.8-2.2 6-5.3 6-8.7V6.5L12 4Z" />
          <path d="m9.5 12 1.7 1.7 3.3-3.7" />
        </svg>
      );
    case 'history':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
          <path d="M12 8v5l3 2" />
        </svg>
      );
    case 'calculator':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="6" y="3" width="12" height="18" rx="2" />
          <path d="M8.5 7.5h7M9 12h1M12 12h1M15 12h1M9 15.5h1M12 15.5h1M15 15.5h1" />
        </svg>
      );
    case 'sliders':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6h8M14 6h6M10 6v6M4 18h4M12 18h8M14 18v-6" />
        </svg>
      );
    case 'trend':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 18h16" />
          <path d="m6 15 4-4 3 3 5-6" />
          <path d="M18 8h-3V5" />
        </svg>
      );
    case 'checklist':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 6h10M8 12h10M8 18h10" />
          <path d="m4.5 6 1.4 1.4L8 5.3M4.5 12l1.4 1.4L8 11.3M4.5 18l1.4 1.4L8 17.3" />
        </svg>
      );
    case 'alert':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 4 3 20h18L12 4Z" />
          <path d="M12 9v4" />
          <circle cx="12" cy="16.5" r=".6" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'report':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h6M9 9h3" />
        </svg>
      );
    case 'database':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <ellipse cx="12" cy="6.5" rx="5.5" ry="2.5" />
          <path d="M6.5 6.5v5c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-5" />
          <path d="M6.5 11.5v6c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5v-6" />
        </svg>
      );
    case 'audit':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M10 4h9v16h-9z" />
          <path d="M5 8h5M5 12h5M5 16h5" />
          <path d="M13 8h3M13 12h3M13 16h3" />
        </svg>
      );
    case 'eye':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'grid':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="6" height="6" rx="1.2" />
          <rect x="14" y="4" width="6" height="6" rx="1.2" />
          <rect x="4" y="14" width="6" height="6" rx="1.2" />
          <rect x="14" y="14" width="6" height="6" rx="1.2" />
        </svg>
      );
    case 'user':
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      );
    default:
      return (
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

