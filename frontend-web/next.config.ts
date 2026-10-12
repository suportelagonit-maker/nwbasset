import type { NextConfig } from 'next';

/*
 * Content-Security-Policy.
 *
 * Fecha a janela de XSS que faltava: mesmo que algo injete script na pagina,
 * o navegador so executa o que esta listado aqui. O resto dos cabecalhos de
 * seguranca (HSTS, X-Frame-Options...) fica no Apache, na borda TLS.
 *
 * Decisoes que o Next e o uso real impoem:
 *  - script-src 'unsafe-inline': o App Router injeta scripts inline de
 *    hidratacao sem nonce; sem isso a pagina nem carrega. Nao ha 'unsafe-eval'
 *    (o leitor de codigo zxing e JS puro, nao usa eval).
 *  - style-src 'unsafe-inline': Tailwind e o Next usam estilo inline.
 *  - img-src data: blob:: imagens de bem, QR e o canvas do leitor.
 *  - connect-src inclui o NWB ID: o login troca o code pelo token falando
 *    direto com o Keycloak a partir do navegador.
 *  - worker-src: o service worker do PWA.
 *  A camera (getUserMedia) e governada por Permissions-Policy, nao por CSP.
 */
const NWBID_ORIGIN = (() => {
  try {
    return new URL(process.env.NWBID_ISSUER ?? 'https://nwbid.igrejanovoscomecos.com.br').origin;
  } catch {
    return 'https://nwbid.igrejanovoscomecos.com.br';
  }
})();

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${NWBID_ORIGIN}`,
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-ancestors 'self'",
  `form-action 'self' ${NWBID_ORIGIN}`,
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'Content-Security-Policy', value: csp }],
      },
    ];
  },
};

export default nextConfig;
