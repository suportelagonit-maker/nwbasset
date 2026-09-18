import { NextResponse } from 'next/server';

import { API_BASE_URL } from '@/lib/api-base';
import { sessionCookieOptions } from '@/lib/auth-session';
import { respostaDeSessao, type LoginBackendBody } from '@/lib/login-session';

/** Login por e-mail e senha (pode estar desligado no backend: AUTH_LOGIN_SENHA=false). */
export async function POST(request: Request) {
  const cookieOptions = sessionCookieOptions(request);
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
      { message: `API Laravel indisponivel em ${API_BASE_URL}. Verifique se o backend esta no ar e tente novamente.` },
      { status: 503 },
    );
  }

  const body = (await response.json().catch(() => null)) as LoginBackendBody | null;

  if (!response.ok || !body?.access_token) {
    return NextResponse.json(
      { message: body?.message ?? 'Falha ao autenticar no backend.' },
      { status: response.status || 500 },
    );
  }

  return respostaDeSessao({ ...body, access_token: body.access_token }, cookieOptions);
}
