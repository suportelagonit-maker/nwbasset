import { NextResponse } from 'next/server';

import {
  ACTIVE_EMPRESA_CNPJ_COOKIE,
  ACTIVE_EMPRESA_LOGO_COOKIE,
  ACTIVE_EMPRESA_NAME_COOKIE,
  AUTH_TOKEN_COOKIE,
  DASHBOARD_SCOPE_COOKIE,
  EMPRESA_ID_COOKIE,
  EMPRESAS_OPTIONS_COOKIE,
  USER_EMAIL_COOKIE,
  USER_IS_SUPER_ADMIN_COOKIE,
  TERMO_PENDENTE_COOKIE,
  USER_NAME_COOKIE,
  sessionCookieOptions,
} from '@/lib/auth-session';

import { API_BASE_URL } from '@/lib/api-base';

type EmpresaPayload = {
  id: number;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  logo_url?: string | null;
  perfil?: string | null;
};

export async function POST(request: Request) {
  const cookieOptions = sessionCookieOptions(request);
  const payload = await request.json();
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json(
      { message: `API Laravel indisponivel em ${API_BASE_URL}. Verifique se o backend esta no ar e tente novamente.` },
      { status: 503 },
    );
  }

  const body = (await response.json().catch(() => null)) as
    | {
        access_token?: string;
        usuario?: {
          nome?: string;
          email?: string;
          is_super_admin?: boolean;
          empresas?: EmpresaPayload[];
        };
        empresa_atual?: {
          id?: number;
          nome_fantasia?: string | null;
          cnpj?: string | null;
          logo_url?: string | null;
        };
        termo_pendente?: boolean;
        message?: string;
      }
    | null;

  if (!response.ok || !body?.access_token) {
    return NextResponse.json(
      { message: body?.message ?? 'Falha ao autenticar no backend.' },
      { status: response.status || 500 },
    );
  }

  const nextResponse = NextResponse.json({
    ok: true,
    empresa_id: body.empresa_atual?.id ?? null,
  });

  nextResponse.cookies.set(AUTH_TOKEN_COOKIE, body.access_token, cookieOptions);
  nextResponse.cookies.set(TERMO_PENDENTE_COOKIE, body.termo_pendente ? '1' : '0', cookieOptions);

  if (body.usuario?.nome) {
    nextResponse.cookies.set(USER_NAME_COOKIE, body.usuario.nome, cookieOptions);
  }

  if (body.usuario?.email) {
    nextResponse.cookies.set(USER_EMAIL_COOKIE, body.usuario.email, cookieOptions);
  }

  const empresas = Array.isArray(body.usuario?.empresas)
    ? body.usuario.empresas.filter(
        (empresa): empresa is EmpresaPayload =>
          Number.isInteger(Number(empresa?.id)) &&
          Number(empresa.id) > 0 &&
          typeof empresa?.nome_fantasia === 'string' &&
          empresa.nome_fantasia.trim() !== '',
      )
    : [];

  if (empresas.length > 0) {
    nextResponse.cookies.set(EMPRESAS_OPTIONS_COOKIE, JSON.stringify(empresas), cookieOptions);
  } else {
    nextResponse.cookies.delete(EMPRESAS_OPTIONS_COOKIE);
  }

  nextResponse.cookies.set(USER_IS_SUPER_ADMIN_COOKIE, body.usuario?.is_super_admin ? '1' : '0', cookieOptions);

  const empresaAtualId = Number(body.empresa_atual?.id ?? '');

  if (Number.isInteger(empresaAtualId) && empresaAtualId > 0) {
    nextResponse.cookies.set(EMPRESA_ID_COOKIE, String(empresaAtualId), cookieOptions);
    nextResponse.cookies.set(DASHBOARD_SCOPE_COOKIE, 'empresa', cookieOptions);
    nextResponse.cookies.set(ACTIVE_EMPRESA_NAME_COOKIE, body.empresa_atual?.nome_fantasia ?? '', cookieOptions);

    if (body.empresa_atual?.cnpj) {
      nextResponse.cookies.set(ACTIVE_EMPRESA_CNPJ_COOKIE, body.empresa_atual.cnpj, cookieOptions);
    } else {
      nextResponse.cookies.delete(ACTIVE_EMPRESA_CNPJ_COOKIE);
    }

    if (body.empresa_atual?.logo_url) {
      nextResponse.cookies.set(ACTIVE_EMPRESA_LOGO_COOKIE, body.empresa_atual.logo_url, cookieOptions);
    } else {
      nextResponse.cookies.delete(ACTIVE_EMPRESA_LOGO_COOKIE);
    }
  } else {
    nextResponse.cookies.delete(EMPRESA_ID_COOKIE);
    nextResponse.cookies.set(DASHBOARD_SCOPE_COOKIE, 'geral', cookieOptions);
    nextResponse.cookies.set(ACTIVE_EMPRESA_NAME_COOKIE, 'Painel geral', cookieOptions);
    nextResponse.cookies.delete(ACTIVE_EMPRESA_CNPJ_COOKIE);
    nextResponse.cookies.delete(ACTIVE_EMPRESA_LOGO_COOKIE);
  }

  return nextResponse;
}
