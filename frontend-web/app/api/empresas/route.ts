import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_TOKEN_COOKIE } from '@/lib/auth-session';


import { API_BASE_URL } from '@/lib/api-base';
async function getToken() {
  return (await cookies()).get(AUTH_TOKEN_COOKIE)?.value;
}

export async function GET() {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ message: 'Sess?o expirada.' }, { status: 401 });
  }

  const response = await fetch(`${API_BASE_URL}/empresas?per_page=100`, {
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

export async function POST(request: Request) {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ message: 'Sess?o expirada.' }, { status: 401 });
  }

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

  const response = await fetch(`${API_BASE_URL}/empresas`, {
    method: 'POST',
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

