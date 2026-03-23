import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import { AUTH_TOKEN_COOKIE } from '@/lib/auth-session';

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export async function GET(request: Request) {
  const token = (await cookies()).get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Sessão expirada.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cnpj = onlyDigits(searchParams.get('cnpj') ?? '');

  if (cnpj.length !== 14) {
    return NextResponse.json({ message: 'Informe um CNPJ válido com 14 dígitos.' }, { status: 422 });
  }

  let response: Response;

  try {
    response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'NWB-Asset/1.0',
      },
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ message: 'Não foi possível consultar o CNPJ no serviço externo.' }, { status: 503 });
  }

  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;

  if (!response.ok || !body) {
    return NextResponse.json(
      { message: String(body?.message ?? body?.errors ?? 'CNPJ não encontrado no serviço externo.') },
      { status: response.status || 500 },
    );
  }

  return NextResponse.json({
    data: {
      cnpj,
      razao_social: String(body.razao_social ?? ''),
      nome_fantasia: String(body.nome_fantasia ?? body.razao_social ?? ''),
      email: String(body.email ?? ''),
      telefone: String(body.ddd_telefone_1 ?? body.ddd_telefone_2 ?? ''),
      cep: String(body.cep ?? ''),
      endereco: String(body.logradouro ?? ''),
      numero: String(body.numero ?? ''),
      complemento: String(body.complemento ?? ''),
      bairro: String(body.bairro ?? ''),
      cidade: String(body.municipio ?? ''),
      estado: String(body.uf ?? ''),
    },
  });
}
