import type { AuthSession } from './auth-session';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

export class AdminApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

type RequestOptions = {
  session: AuthSession;
  path: string;
  query?: Record<string, number | string | undefined>;
};

type UsuarioItem = {
  id: number;
  empresa_id: number | null;
  nome: string;
  email: string;
  role: string;
  role_atual: string;
  ativo: boolean;
  ultimo_login_em: string | null;
};

type RolePermissaoItem = {
  id: number;
  role: string;
  permissao: string;
};

export type EmpresaItem = {
  id: number;
  codigo?: string | null;
  razao_social: string;
  nome_fantasia: string;
  cnpj: string;
  logo_url?: string | null;
  inscricao_estadual?: string | null;
  email?: string | null;
  telefone?: string | null;
  status: string;
  filiais_count?: number | null;
};

function buildUrl(path: string, query: Record<string, number | string | undefined> = {}) {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\//, '')}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

async function fetchJson<T>({ session, path, query }: RequestOptions): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${session.token}`,
      ...(session.empresaId ? { 'X-Empresa-Id': String(session.empresaId) } : {}),
    },
  });

  if (!response.ok) {
    throw new AdminApiError(`Falha ao consultar ${path}: ${response.status}`, response.status);
  }

  return (await response.json()) as T;
}

export async function getUsuarios(session: AuthSession): Promise<UsuarioItem[]> {
  const payload = await fetchJson<{ data: UsuarioItem[] }>({
    session,
    path: 'usuarios',
    query: { per_page: 100 },
  });

  return payload.data;
}

export async function getRolePermissoes(session: AuthSession): Promise<RolePermissaoItem[]> {
  const payload = await fetchJson<{ data: RolePermissaoItem[] }>({
    session,
    path: 'roles-permissoes',
  });

  return payload.data;
}

export async function getEmpresas(session: AuthSession): Promise<EmpresaItem[]> {
  const payload = await fetchJson<{ data: EmpresaItem[] }>({
    session,
    path: 'empresas',
    query: { per_page: 100 },
  });

  return payload.data;
}
