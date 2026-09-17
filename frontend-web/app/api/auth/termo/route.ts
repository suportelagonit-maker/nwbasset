import { NextResponse } from 'next/server';

import { API_BASE_URL } from '@/lib/api-base';
import { TERMO_PENDENTE_COOKIE, getAuthSession, sessionCookieOptions } from '@/lib/auth-session';

/**
 * Termo de Responsabilidade de Uso e LGPD.
 *
 * GET  -> texto vigente + situação do aceite do usuário da sessão.
 * POST -> registra o aceite no backend e limpa o cookie que bloqueia a
 *         navegação (o backend segue como fonte da verdade: sem aceite, a
 *         API responde 428 e o proxy volta a marcar o cookie).
 */
export async function GET() {
  const session = await getAuthSession();

  if (!session.token) {
    return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/termo-uso`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${session.token}` },
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: 'Falha de conexão ao consultar o termo.' }, { status: 502 });
  }

  const payload = await response.text();

  return new NextResponse(payload, {
    status: response.status,
    headers: { 'Content-Type': response.headers.get('content-type') ?? 'application/json' },
  });
}

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session.token) {
    return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { versao?: string; aceito?: boolean } | null;
  const forwardedFor = request.headers.get('x-forwarded-for') ?? '';

  const response = await fetch(`${API_BASE_URL}/termo-uso/aceite`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
      // Preserva o IP real do usuário quando o Next roda atrás do proxy.
      ...(forwardedFor ? { 'X-Forwarded-For': forwardedFor } : {}),
    },
    body: JSON.stringify({ aceito: body?.aceito === true, versao: body?.versao ?? '' }),
    cache: 'no-store',
  }).catch(() => null);

  if (!response) {
    return NextResponse.json({ message: 'Falha de conexão ao registrar o aceite.' }, { status: 502 });
  }

  const payload = (await response.json().catch(() => null)) as { message?: string; data?: unknown } | null;

  if (!response.ok) {
    return NextResponse.json({ message: payload?.message ?? 'Não foi possível registrar o aceite.' }, { status: response.status });
  }

  const nextResponse = NextResponse.json({ ok: true, data: payload?.data ?? null });
  nextResponse.cookies.set(TERMO_PENDENTE_COOKIE, '0', sessionCookieOptions(request));

  return nextResponse;
}
