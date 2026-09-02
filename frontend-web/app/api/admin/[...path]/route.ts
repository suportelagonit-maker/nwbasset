import { type NextRequest } from 'next/server';

import { getAuthSession } from '@/lib/auth-session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

async function proxyRequest(request: NextRequest, path: string[]) {
  const session = await getAuthSession();

  if (!session.token) {
    return Response.json({ message: 'Sess?o expirada.' }, { status: 401 });
  }

  const targetUrl = new URL(`${API_BASE_URL}/${path.join('/')}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const contentType = request.headers.get('content-type') ?? '';
  const body =
    ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : contentType.includes('multipart/form-data')
        ? await request.formData()
        : await request.text();
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(session.empresaId ? { 'X-Empresa-Id': String(session.empresaId) } : {}),
      ...(body && !contentType.includes('multipart/form-data')
        ? { 'Content-Type': contentType || 'application/json' }
        : {}),
    },
    body,
    cache: 'no-store',
  });

  const responseBody = await response.text();

  return new Response(responseBody, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;

  return proxyRequest(request, path);
}
