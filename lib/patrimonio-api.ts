type ApiFilters = Record<string, number | undefined>;

type ApiSession = {
  token: string;
  empresaId?: number | null;
};

export type DashboardQueryFilters = {
  empresa_id?: number;
  filial_id?: number;
};

export type PatrimonioResumo = {
  total_bens: number;
  valor_total_patrimonio: number;
  bens_depreciados: number;
  bens_sem_plaqueta: number;
  inventarios_abertos: number;
  divergencias_abertas: number;
  total_empresas?: number;
  total_unidades?: number;
  total_departamentos?: number;
  total_locais?: number;
  total_usuarios?: number;
};

export type BensPorLocalItem = {
  local_id: number;
  local: string | null;
  codigo: string | null;
  total_bens: number;
  valor_total: number;
};

export type BensPorDepartamentoItem = {
  departamento_id: number;
  departamento: string | null;
  codigo: string | null;
  total_bens: number;
  valor_total: number;
};

export type EvolucaoPatrimonioItem = {
  competencia: string;
  total_bens_mes: number;
  valor_mes: number;
  total_bens_acumulado: number;
  valor_acumulado: number;
};

export type DashboardOverview = {
  resumo: PatrimonioResumo;
  bens_por_local: BensPorLocalItem[];
  bens_por_departamento: BensPorDepartamentoItem[];
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1').replace(/\/$/, '');

function buildUrl(path: string, filters: ApiFilters = {}): string {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\//, '')}`);

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export function buildExportUrl(path: string, filters: ApiFilters = {}): string {
  const url = new URL(`/api/exportacoes/${path.replace(/^exportacoes\//, '')}`, 'http://frontend.local');

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return `${url.pathname}${url.search}`;
}

async function fetchApi<T>(path: string, filters: ApiFilters | undefined, session: ApiSession): Promise<T> {
  let response: Response;

  try {
    response = await fetch(buildUrl(path, filters), {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${session.token}`,
        ...(session.empresaId ? { 'X-Empresa-Id': String(session.empresaId) } : {}),
      },
    });
  } catch {
    throw new Error(`Falha de conexão ao consultar ${path}. Verifique se a API está disponível.`);
  }

  if (!response.ok) {
    throw new Error(`Falha ao consultar ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getDashboardResumo(filters: DashboardQueryFilters, session: ApiSession): Promise<PatrimonioResumo> {
  return fetchApi<PatrimonioResumo>('dashboard/patrimonio/resumo', filters, session);
}

export async function getDashboardOverview(filters: DashboardQueryFilters, session: ApiSession): Promise<DashboardOverview> {
  return fetchApi<DashboardOverview>('dashboard/patrimonio/overview', filters, session);
}

export async function getDashboardBensPorLocal(filters: DashboardQueryFilters, session: ApiSession): Promise<BensPorLocalItem[]> {
  return fetchApi<BensPorLocalItem[]>('dashboard/patrimonio/bens-por-local', filters, session);
}

export async function getDashboardBensPorDepartamento(
  filters: DashboardQueryFilters,
  session: ApiSession,
): Promise<BensPorDepartamentoItem[]> {
  return fetchApi<BensPorDepartamentoItem[]>('dashboard/patrimonio/bens-por-departamento', filters, session);
}

export async function getDashboardEvolucaoPatrimonio(
  filters: DashboardQueryFilters,
  session: ApiSession,
): Promise<EvolucaoPatrimonioItem[]> {
  return fetchApi<EvolucaoPatrimonioItem[]>('dashboard/patrimonio/evolucao-patrimonio', filters, session);
}
