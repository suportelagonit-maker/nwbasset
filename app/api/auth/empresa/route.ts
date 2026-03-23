import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

import {
  ACTIVE_EMPRESA_CNPJ_COOKIE,
  ACTIVE_EMPRESA_LOGO_COOKIE,
  ACTIVE_EMPRESA_NAME_COOKIE,
  AUTH_TOKEN_COOKIE,
  DASHBOARD_SCOPE_COOKIE,
  EMPRESA_ID_COOKIE,
  EMPRESAS_OPTIONS_COOKIE,
  USER_IS_SUPER_ADMIN_COOKIE,
} from '@/lib/auth-session';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_TOKEN_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ message: 'Não autenticado.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    empresa_id?: number;
    escopo?: 'geral' | 'empresa';
    empresa_nome_fantasia?: string;
    empresa_cnpj?: string | null;
    empresa_logo_url?: string | null;
    empresas?: Array<{
      id: number;
      nome_fantasia: string;
      cnpj?: string | null;
      logo_url?: string | null;
      perfil?: string | null;
    }>;
    is_super_admin?: boolean;
  } | null;

  const requestedScope = payload?.escopo === 'geral' ? 'geral' : 'empresa';
  const empresaId = Number(payload?.empresa_id ?? '');
  const empresas = Array.isArray(payload?.empresas)
    ? payload.empresas.filter(
        (empresa) =>
          Number.isInteger(Number(empresa?.id)) &&
          Number(empresa.id) > 0 &&
          typeof empresa?.nome_fantasia === 'string' &&
          empresa.nome_fantasia.trim() !== '',
      )
    : [];

  if (requestedScope === 'geral') {
    const response = NextResponse.json({ ok: true, escopo: 'geral' });

    response.cookies.delete(EMPRESA_ID_COOKIE);
    response.cookies.set(DASHBOARD_SCOPE_COOKIE, 'geral', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    response.cookies.set(ACTIVE_EMPRESA_NAME_COOKIE, 'Painel geral', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    response.cookies.delete(ACTIVE_EMPRESA_CNPJ_COOKIE);
    response.cookies.delete(ACTIVE_EMPRESA_LOGO_COOKIE);
    response.cookies.set(EMPRESAS_OPTIONS_COOKIE, JSON.stringify(empresas), {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    response.cookies.set(USER_IS_SUPER_ADMIN_COOKIE, payload?.is_super_admin ? '1' : '0', {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });

    return response;
  }

  if (!Number.isInteger(empresaId) || empresaId <= 0) {
    return NextResponse.json({ message: 'empresa_id inválido.' }, { status: 422 });
  }

  const response = NextResponse.json({ ok: true, empresa_id: empresaId });

  response.cookies.set(EMPRESA_ID_COOKIE, String(empresaId), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  response.cookies.set(DASHBOARD_SCOPE_COOKIE, 'empresa', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  response.cookies.set(ACTIVE_EMPRESA_NAME_COOKIE, payload?.empresa_nome_fantasia ?? '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  if (payload?.empresa_cnpj) {
    response.cookies.set(ACTIVE_EMPRESA_CNPJ_COOKIE, payload.empresa_cnpj, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  } else {
    response.cookies.delete(ACTIVE_EMPRESA_CNPJ_COOKIE);
  }
  if (payload?.empresa_logo_url) {
    response.cookies.set(ACTIVE_EMPRESA_LOGO_COOKIE, payload.empresa_logo_url, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
  } else {
    response.cookies.delete(ACTIVE_EMPRESA_LOGO_COOKIE);
  }
  response.cookies.set(EMPRESAS_OPTIONS_COOKIE, JSON.stringify(empresas), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  response.cookies.set(USER_IS_SUPER_ADMIN_COOKIE, payload?.is_super_admin ? '1' : '0', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
