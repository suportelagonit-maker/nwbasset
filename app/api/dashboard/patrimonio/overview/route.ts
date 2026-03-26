import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_TOKEN_COOKIE, EMPRESA_ID_COOKIE } from '@/lib/auth-session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const requestUrl = new URL(request.url);
  const targetUrl = new URL(`${API_BASE_URL}/dashboard/patrimonio/overview`);

  requestUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const empresaId = requestUrl.searchParams.get('empresa_id') ?? cookieStore.get(EMPRESA_ID_COOKIE)?.value ?? null;

  try {
    const response = await fetch(targetUrl.toString(), {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(empresaId ? { 'X-Empresa-Id': empresaId } : {}),
      },
    });

    const payload = await response.text();

    return new NextResponse(payload, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Falha de conexão ao consultar o dashboard patrimonial.' },
      { status: 502 },
    );
  }
}

