import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_TOKEN_COOKIE, EMPRESA_ID_COOKIE } from '@/lib/auth-session';


import { API_BASE_URL } from '@/lib/api-base';
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

export async function PUT(request: Request, context: { params: Promise<{ departamentoId: string }> }) {
  const session = await getSessionHeaders();

  if ('error' in session) {
    return session.error;
  }

  const { departamentoId } = await context.params;
  const payload = await request.json();

  const response = await fetch(`${API_BASE_URL}/departamentos/${departamentoId}`, {
    method: 'PUT',
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

export async function DELETE(_: Request, context: { params: Promise<{ departamentoId: string }> }) {
  const session = await getSessionHeaders();

  if ('error' in session) {
    return session.error;
  }

  const { departamentoId } = await context.params;

  const response = await fetch(`${API_BASE_URL}/departamentos/${departamentoId}`, {
    method: 'DELETE',
    headers: session.headers,
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  return NextResponse.json(body, { status: response.status });
}
