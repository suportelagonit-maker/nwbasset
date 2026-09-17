import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUTH_TOKEN_COOKIE, DASHBOARD_SCOPE_COOKIE, EMPRESA_ID_COOKIE, TERMO_PENDENTE_COOKIE } from './lib/auth-session';

const protectedPrefixes = ['/dashboard', '/users', '/permissoes', '/perfil', '/selecionar-empresa', '/ajuda', '/termo'];

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const empresaId = request.cookies.get(EMPRESA_ID_COOKIE)?.value;
  const dashboardScope = request.cookies.get(DASHBOARD_SCOPE_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Termo de Responsabilidade de Uso e LGPD pendente: só a página do termo é
  // acessível (o backend também recusa a API com 428 até o aceite).
  const termoPendente = request.cookies.get(TERMO_PENDENTE_COOKIE)?.value === '1';
  if (token && termoPendente && pathname !== '/termo' && (isProtected || pathname === '/login')) {
    return NextResponse.redirect(new URL('/termo', request.url));
  }

  if (token && pathname === '/login') {
    if (empresaId || dashboardScope === 'geral') {
      return NextResponse.redirect(new URL('/dashboard/patrimonio', request.url));
    }

    return NextResponse.redirect(new URL('/selecionar-empresa', request.url));
  }

  if (token && !empresaId && dashboardScope === 'geral' && pathname === '/dashboard/patrimonio') {
    return NextResponse.next();
  }

  if (token && !empresaId && pathname !== '/selecionar-empresa' && isProtected) {
    return NextResponse.redirect(new URL('/selecionar-empresa', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/users/:path*', '/permissoes/:path*', '/perfil/:path*', '/selecionar-empresa', '/ajuda', '/termo', '/login'],
};
