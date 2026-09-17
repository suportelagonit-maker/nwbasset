import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NWB Asset',
    short_name: 'NWB Asset',
    description: 'Gestão patrimonial multiempresa: bens, plaquetas, inventários e depreciação.',
    start_url: '/dashboard/patrimonio',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f7f9',
    theme_color: '#ffffff',
    lang: 'pt-BR',
    icons: [
      // TODO: gerar ícones quadrados 192x192 e 512x512 para instalação completa do PWA.
      { src: '/Favicon.png', sizes: '250x120', type: 'image/png' },
    ],
  };
}
