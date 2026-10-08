import type { MetadataRoute } from 'next';

/**
 * Manifesto do aplicativo (PWA).
 *
 * Os icones 192/512 "any" e os "maskable" sao exigencia de instalacao no
 * Android; o apple-touch-icon cobre o iPhone. Junto com o service worker
 * (public/sw.js) e o HTTPS, completam os criterios de instalabilidade.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/dashboard/patrimonio',
    name: 'NWB Asset — Controle Patrimonial',
    short_name: 'NWB Asset',
    description: 'Gestão patrimonial multiempresa: bens, plaquetas, inventários, transferências e depreciação.',
    start_url: '/dashboard/patrimonio',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f7f9',
    theme_color: '#ffffff',
    lang: 'pt-BR',
    dir: 'ltr',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Ler etiqueta', short_name: 'Ler etiqueta', description: 'Abrir a câmera e ler a plaqueta de um bem', url: '/patrimonio/consulta?ler=1' },
      { name: 'Bens patrimoniais', short_name: 'Bens', url: '/dashboard/modulos/bens' },
      { name: 'Inventários', short_name: 'Inventários', url: '/dashboard/modulos/inventarios' },
      { name: 'Relatório BI', short_name: 'Relatórios', url: '/dashboard/modulos/relatorios' },
    ],
  };
}
