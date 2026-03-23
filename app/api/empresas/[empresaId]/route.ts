import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_TOKEN_COOKIE } from '@/lib/auth-session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

async function getToken() {
  return (await cookies()).get(AUTH_TOKEN_COOKIE)?.value;
}

export async function GET(_: Request, context: { params: Promise<{ empresaId: string }> }) {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ message: 'Sessao expirada.' }, { status: 401 });
  }

  const { empresaId } = await context.params;

  const response = await fetch(`${API_BASE_URL}/empresas/${empresaId}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  return NextResponse.json(body, { status: response.status });
}

export async function PUT(request: Request, context: { params: Promise<{ empresaId: string }> }) {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ message: 'Sessao expirada.' }, { status: 401 });
  }

  const { empresaId } = await context.params;
  const payload = (await request.json()) as {
    razao_social: string;
    nome_fantasia: string;
    cnpj: string;
    inscricao_estadual?: string;
    email?: string;
    telefone?: string;
    status?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };

  const response = await fetch(`${API_BASE_URL}/empresas/${empresaId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...payload,
      matriz_nome: payload.nome_fantasia,
    }),
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  return NextResponse.json(body, { status: response.status });
}

export async function DELETE(_: Request, context: { params: Promise<{ empresaId: string }> }) {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ message: 'Sessao expirada.' }, { status: 401 });
  }

  const { empresaId } = await context.params;

  const response = await fetch(`${API_BASE_URL}/empresas/${empresaId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => null);

  return NextResponse.json(body, { status: response.status });
}
