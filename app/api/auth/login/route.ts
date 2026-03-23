import { NextResponse } from 'next/server';

import {
  ACTIVE_EMPRESA_CNPJ_COOKIE,
  ACTIVE_EMPRESA_LOGO_COOKIE,
  ACTIVE_EMPRESA_NAME_COOKIE,
  AUTH_TOKEN_COOKIE,
  DASHBOARD_SCOPE_COOKIE,
  EMPRESA_ID_COOKIE,
  EMPRESAS_OPTIONS_COOKIE,
  USER_IS_SUPER_ADMIN_COOKIE,
  USER_EMAIL_COOKIE,
  USER_NAME_COOKIE,
} from '@/lib/auth-session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

export async function POST(request: Request) {
  const payload = await request.json();
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: 'API Laravel indisponivel em http://127.0.0.1:5000. Inicie o backend e tente novamente.' },
      { status: 503 },
    );
  }

  const body = (await response.json().catch(() => null)) as
    | {
        access_token?: string;
        usuario?: { nome?: string; email?: string };
        empresa_atual?: { id?: number };
        message?: string;
      }
    | null;

  if (!response.ok || !body?.access_token) {
    return NextResponse.json(
      { message: body?.message ?? 'Falha ao autenticar no backend.' },
      { status: response.status || 500 },
    );
  }

  const nextResponse = NextResponse.json({ ok: true });

  nextResponse.cookies.set(AUTH_TOKEN_COOKIE, body.access_token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  nextResponse.cookies.delete(EMPRESA_ID_COOKIE);
  nextResponse.cookies.delete(DASHBOARD_SCOPE_COOKIE);
  nextResponse.cookies.delete(ACTIVE_EMPRESA_NAME_COOKIE);
  nextResponse.cookies.delete(ACTIVE_EMPRESA_CNPJ_COOKIE);
  nextResponse.cookies.delete(ACTIVE_EMPRESA_LOGO_COOKIE);
  nextResponse.cookies.delete(EMPRESAS_OPTIONS_COOKIE);
  nextResponse.cookies.delete(USER_IS_SUPER_ADMIN_COOKIE);

  if (body.usuario?.nome) {
    nextResponse.cookies.set(USER_NAME_COOKIE, body.usuario.nome, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  if (body.usuario?.email) {
    nextResponse.cookies.set(USER_EMAIL_COOKIE, body.usuario.email, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  }

  return nextResponse;
}
