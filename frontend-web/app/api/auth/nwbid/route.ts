import { NextResponse } from 'next/server';

import { API_BASE_URL } from '@/lib/api-base';
import { sessionCookieOptions } from '@/lib/auth-session';
import { respostaDeSessao, type LoginBackendBody } from '@/lib/login-session';

/**
 * Entrada pelo NWB ID: o navegador já fez o authorization code + PKCE com o
 * Keycloak e traz o access token; aqui ele é trocado, no backend, por uma
 * sessão local igual à do login por senha.
 */
export async function POST(request: Request) {
  const cookieOptions = sessionCookieOptions(request);
  const payload = (await request.json().catch(() => null)) as { access_token?: string } | null;

  if (!payload?.access_token) {
    return NextResponse.json({ message: 'Token do NWB ID ausente.' }, { status: 422 });
  }

  const forwardedFor = request.headers.get('x-forwarded-for') ?? '';
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/nwbid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
      },
      body: JSON.stringify({ access_token: payload.access_token, device_name: 'nwbasset-nwbid' }),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'API indisponível. Tente novamente em instantes.' }, { status: 503 });
  }

  const body = (await response.json().catch(() => null)) as LoginBackendBody | null;

  if (!response.ok || !body?.access_token) {
    return NextResponse.json({ message: body?.message ?? 'Não foi possível entrar com o NWB ID.' }, { status: response.status || 500 });
  }

  return respostaDeSessao({ ...body, access_token: body.access_token }, cookieOptions);
}
