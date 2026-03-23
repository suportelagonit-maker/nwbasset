import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_TOKEN_COOKIE, EMPRESA_ID_COOKIE } from '@/lib/auth-session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const requestUrl = new URL(request.url);
  const requestedEmpresaId = requestUrl.searchParams.get('empresa_id');
  const empresaId = requestedEmpresaId || cookieStore.get(EMPRESA_ID_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...(empresaId ? { 'X-Empresa-Id': empresaId } : {}),
      },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'API Laravel indisponível.' }, { status: 503 });
  }

  const body = await response.json().catch(() => null);

  return NextResponse.json(body, { status: response.status });
}
