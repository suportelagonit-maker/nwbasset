import { cookies } from 'next/headers';

export const AUTH_TOKEN_COOKIE = 'nwbasset_token';
export const EMPRESA_ID_COOKIE = 'nwbasset_empresa_id';
export const DASHBOARD_SCOPE_COOKIE = 'nwbasset_dashboard_scope';
export const USER_NAME_COOKIE = 'nwbasset_user_name';
export const USER_EMAIL_COOKIE = 'nwbasset_user_email';
export const ACTIVE_EMPRESA_NAME_COOKIE = 'nwbasset_empresa_nome';
export const ACTIVE_EMPRESA_CNPJ_COOKIE = 'nwbasset_empresa_cnpj';
export const ACTIVE_EMPRESA_LOGO_COOKIE = 'nwbasset_empresa_logo';
export const EMPRESAS_OPTIONS_COOKIE = 'nwbasset_empresas_options';
export const USER_IS_SUPER_ADMIN_COOKIE = 'nwbasset_is_super_admin';
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

export type EmpresaSessionOption = {
  id: number;
  nome_fantasia: string;
  cnpj?: string | null;
  logo_url?: string | null;
  perfil?: string | null;
};

export type AuthSession = {
  token: string | null;
  empresaId: number | null;
  dashboardScope: 'empresa' | 'geral';
  userName: string | null;
  userEmail: string | null;
  empresaNome: string | null;
  empresaCnpj: string | null;
  empresaLogoUrl: string | null;
  isSuperAdmin: boolean;
  empresas: EmpresaSessionOption[];
};

export type AuthMeData = {
  is_super_admin?: boolean;
  empresa_atual?: {
    id?: number;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    logo_url?: string | null;
  };
  empresas?: Array<{
    id: number;
    nome_fantasia?: string | null;
    cnpj?: string | null;
    logo_url?: string | null;
    perfil?: string | null;
  }>;
};

function parseEmpresasCookie(rawValue: string | undefined): EmpresaSessionOption[] {
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (empresa): empresa is EmpresaSessionOption =>
          typeof empresa === 'object' &&
          empresa !== null &&
          typeof (empresa as { id?: unknown }).id === 'number' &&
          typeof (empresa as { nome_fantasia?: unknown }).nome_fantasia === 'string',
      )
      .map((empresa) => ({
        id: empresa.id,
        nome_fantasia: empresa.nome_fantasia,
        cnpj: empresa.cnpj ?? null,
        logo_url: empresa.logo_url ?? null,
        perfil: empresa.perfil ?? null,
      }));
  } catch {
    return [];
  }
}

export async function getAuthSession(): Promise<AuthSession> {
  const cookieStore = await cookies();
  const empresaId = Number(cookieStore.get(EMPRESA_ID_COOKIE)?.value ?? '');
  const dashboardScope = cookieStore.get(DASHBOARD_SCOPE_COOKIE)?.value === 'geral' ? 'geral' : 'empresa';

  return {
    token: cookieStore.get(AUTH_TOKEN_COOKIE)?.value ?? null,
    empresaId: Number.isInteger(empresaId) && empresaId > 0 ? empresaId : null,
    dashboardScope,
    userName: cookieStore.get(USER_NAME_COOKIE)?.value ?? null,
    userEmail: cookieStore.get(USER_EMAIL_COOKIE)?.value ?? null,
    empresaNome: cookieStore.get(ACTIVE_EMPRESA_NAME_COOKIE)?.value ?? null,
    empresaCnpj: cookieStore.get(ACTIVE_EMPRESA_CNPJ_COOKIE)?.value ?? null,
    empresaLogoUrl: cookieStore.get(ACTIVE_EMPRESA_LOGO_COOKIE)?.value ?? null,
    isSuperAdmin: cookieStore.get(USER_IS_SUPER_ADMIN_COOKIE)?.value === '1',
    empresas: parseEmpresasCookie(cookieStore.get(EMPRESAS_OPTIONS_COOKIE)?.value),
  };
}

export async function getAuthMeData(empresaIdOverride?: number | null): Promise<AuthMeData | null> {
  const session = await getAuthSession();

  if (!session.token) {
    return null;
  }

  const empresaId =
    typeof empresaIdOverride === 'number' && Number.isInteger(empresaIdOverride) && empresaIdOverride > 0
      ? empresaIdOverride
      : session.empresaId;

  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.token}`,
        ...(empresaId ? { 'X-Empresa-Id': String(empresaId) } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json().catch(() => null)) as { data?: AuthMeData } | null;

    return body?.data ?? null;
  } catch {
    return null;
  }
}
