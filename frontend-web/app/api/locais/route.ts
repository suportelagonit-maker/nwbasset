import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_TOKEN_COOKIE, EMPRESA_ID_COOKIE } from '@/lib/auth-session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

async function getSessionHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const empresaId = cookieStore.get(EMPRESA_ID_COOKIE)?.value;

  if (!token) {
    return { error: NextResponse.json({ message: 'Sess?o expirada.' }, { status: 401 }) };
  }

  if (!empresaId) {
    return { error: NextResponse.json({ message: 'Empresa ativa n?o definida.' }, { status: 400 }) };
  }

  return {
    empresaId,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Empresa-Id': empresaId,
    },
  };
}

export async function GET() {
  const session = await getSessionHeaders();

  if ('error' in session) {
    return session.error;
  }

  const response = await fetch(`${API_BASE_URL}/locais?empresa_id=${session.empresaId}&per_page=100`, {
    method: 'GET',
    headers: session.headers,
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  return NextResponse.json(body, { status: response.status });
}

export async function POST(request: Request) {
  const session = await getSessionHeaders();

  if ('error' in session) {
    return session.error;
  }

  const payload = await request.json();

  const response = await fetch(`${API_BASE_URL}/locais`, {
    method: 'POST',
    headers: {
      ...session.headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      empresa_id: Number(session.empresaId),
    }),
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  return NextResponse.json(body, { status: response.status });
}

