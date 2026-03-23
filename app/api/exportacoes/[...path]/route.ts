import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_TOKEN_COOKIE, EMPRESA_ID_COOKIE } from '@/lib/auth-session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;
  const empresaId = cookieStore.get(EMPRESA_ID_COOKIE)?.value;
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');
  const url = new URL(request.url);
  const backendUrl = new URL(`${API_BASE_URL}/exportacoes/${path}`);

  url.searchParams.forEach((value, key) => {
    backendUrl.searchParams.set(key, value);
  });

  const response = await fetch(backendUrl.toString(), {
    headers: {
      Accept: '*/*',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(empresaId ? { 'X-Empresa-Id': empresaId } : {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return NextResponse.json({ message: 'Falha ao exportar relatorio.' }, { status: response.status });
  }

  const headers = new Headers();
  const contentType = response.headers.get('content-type');
  const contentDisposition = response.headers.get('content-disposition');

  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (contentDisposition) {
    headers.set('content-disposition', contentDisposition);
  }

  return new NextResponse(response.body, { headers });
}
