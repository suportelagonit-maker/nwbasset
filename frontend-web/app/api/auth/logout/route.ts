import { NextResponse } from 'next/server';

import {
  ACTIVE_EMPRESA_CNPJ_COOKIE,
  ACTIVE_EMPRESA_NAME_COOKIE,
  AUTH_TOKEN_COOKIE,
  EMPRESA_ID_COOKIE,
  EMPRESAS_OPTIONS_COOKIE,
  USER_EMAIL_COOKIE,
  TERMO_PENDENTE_COOKIE,
  USER_IS_SUPER_ADMIN_COOKIE,
  USER_NAME_COOKIE,
} from '@/lib/auth-session';

import { API_BASE_URL } from '@/lib/api-base';
export async function POST(request: Request) {
  const token = request.headers.get('cookie')
    ?.split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${AUTH_TOKEN_COOKIE}=`))
    ?.split('=')[1];

  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    }).catch(() => null);
  }

  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete(AUTH_TOKEN_COOKIE);
  response.cookies.delete(EMPRESA_ID_COOKIE);
  response.cookies.delete(USER_NAME_COOKIE);
  response.cookies.delete(USER_EMAIL_COOKIE);
  response.cookies.delete(ACTIVE_EMPRESA_NAME_COOKIE);
  response.cookies.delete(ACTIVE_EMPRESA_CNPJ_COOKIE);
  response.cookies.delete(EMPRESAS_OPTIONS_COOKIE);
  response.cookies.delete(USER_IS_SUPER_ADMIN_COOKIE);
  response.cookies.delete(TERMO_PENDENTE_COOKIE);

  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete(AUTH_TOKEN_COOKIE);
  response.cookies.delete(EMPRESA_ID_COOKIE);
  response.cookies.delete(USER_NAME_COOKIE);
  response.cookies.delete(USER_EMAIL_COOKIE);
  response.cookies.delete(ACTIVE_EMPRESA_NAME_COOKIE);
  response.cookies.delete(ACTIVE_EMPRESA_CNPJ_COOKIE);
  response.cookies.delete(EMPRESAS_OPTIONS_COOKIE);
  response.cookies.delete(USER_IS_SUPER_ADMIN_COOKIE);
  response.cookies.delete(TERMO_PENDENTE_COOKIE);

  return response;
}

