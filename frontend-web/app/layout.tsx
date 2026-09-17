import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google';

import './globals.css';

const bodyFont = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700'],
});

const headingFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
  weight: ['500', '600', '700'],
});

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
    icon: '/Favicon.png',
    shortcut: '/Favicon.png',
    apple: '/Favicon.png',
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${bodyFont.variable} ${headingFont.variable} bg-[var(--bg)] font-[family-name:var(--font-body)] text-[var(--ink)] antialiased`}>
        {children}
      </body>
    </html>
  );
}

