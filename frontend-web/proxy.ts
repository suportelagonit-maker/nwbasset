import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { AUTH_TOKEN_COOKIE, DASHBOARD_SCOPE_COOKIE, EMPRESA_ID_COOKIE } from './lib/auth-session';

const protectedPrefixes = ['/dashboard', '/users', '/permissoes', '/perfil', '/selecionar-empresa', '/ajuda'];

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_TOKEN_COOKIE)?.value;
  const empresaId = request.cookies.get(EMPRESA_ID_COOKIE)?.value;
  const dashboardScope = request.cookies.get(DASHBOARD_SCOPE_COOKIE)?.value;
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!token && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
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
  matcher: ['/dashboard/:path*', '/users/:path*', '/permissoes/:path*', '/perfil/:path*', '/selecionar-empresa', '/ajuda', '/login'],
};
