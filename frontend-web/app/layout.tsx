import type { Metadata, Viewport } from 'next';
import { InputModality, Toaster, scriptTemaAntesDoPaint } from '@nwb/ui';

import RegistrarServiceWorker from '@/components/RegistrarServiceWorker';
import { AutoUpdate } from '@/components/AutoUpdate';

// ds.css (Tailwind + tokens + Inter self-hosted do NC Design System) ANTES do
// globals.css, para as regras proprias vencerem o preflight do Tailwind.
import './ds.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'NWB Asset | Dashboard Patrimonial',
  description: 'Painel patrimonial do ERP NWB Asset.',
  applicationName: 'NWB Asset',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'NWB Asset',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/Favicon.png', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/Favicon.png',
    // 180x180 opaco: o iPhone aplica o proprio arredondamento.
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

// viewport-fit=cover libera as áreas seguras (env(safe-area-inset-*)) usadas
// pela barra de navegação inferior em celulares com gesto/notch.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

const SCRIPT_INSTALACAO = `window.__nwbInstalacao = null;
window.addEventListener('beforeinstallprompt', function (evento) {
  evento.preventDefault();
  window.__nwbInstalacao = evento;
  window.dispatchEvent(new Event('nwb:instalacao'));
});
window.addEventListener('appinstalled', function () {
  window.__nwbInstalacao = null;
  window.dispatchEvent(new Event('nwb:instalacao'));
});`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-nc-product aplica a cor do sistema NWB Asset (#8b5e34) do DS.
    // O tema (claro/escuro) vem do cookie compartilhado do DS; o script abaixo
    // o aplica antes do paint (sem flash).
    <html lang="pt-BR" data-nc-product="nwb-asset" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTemaAntesDoPaint(['nwbasset.theme']) }} />
        {/* O aviso de "da para instalar" chega antes do React montar; sem
            guardar aqui, o convite de instalacao nunca apareceria. */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_INSTALACAO }} />
      </head>
      <body className="bg-[var(--bg)] font-[family-name:var(--font-body)] text-[var(--ink)] antialiased">
        {children}
        <RegistrarServiceWorker />
        <AutoUpdate />
        <Toaster />
        <InputModality />
      </body>
    </html>
  );
}

