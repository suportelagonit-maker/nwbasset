import type { PendingSyncAction, SessionData } from './storage';

export const API_BASE_URL = 'http://127.0.0.1:5000/api/v1';

type PaginatedResponse<T> = {
  data: T[];
};

type ResourceResponse<T> = {
  data: T;
};

export type Inventario = {
  id: number;
  empresa_id: number;
  filial_id: number;
  nome: string;
  data_inicio: string;
  data_fim: string | null;
  status: 'ABERTO' | 'EM_ANDAMENTO' | 'FINALIZADO';
};

export type InventarioItem = {
  id: number;
  inventario_id: number;
  bem_patrimonial_id: number;
  localizado: boolean;
  data_verificacao: string | null;
  observacoes: string | null;
};

export type PlaquetaPatrimonial = {
  id: number;
  bem_patrimonial_id: number;
  empresa_id: number;
  filial_id: number;
  codigo_plaqueta: string;
  numero_plaqueta: string;
  codigo_barras_conteudo: string;
  link_consulta: string;
  qr_code_conteudo: string;
  status: 'GERADA' | 'APLICADA' | 'INATIVA' | 'SUBSTITUIDA';
  data_geracao: string;
  data_aplicacao: string | null;
  observacoes: string | null;
};

export type BemPatrimonial = {
  id: number;
  empresa_id: number;
  filial_id: number;
  numero_tombo: string;
  numero_serie: string | null;
  descricao: string;
  categoria: string | null;
  marca: string | null;
  modelo: string | null;
  status_bem: string;
  estado_conservacao: string;
  local_id: number;
  responsavel_id: number | null;
};

export type DivergenciaPayload = {
  inventarioId: number;
  bemPatrimonialId: number;
  tipoDivergencia: string;
  descricao: string;
};

export type AuthLoginPayload = {
  email: string;
  password: string;
  deviceName?: string;
  empresaId?: number;
};

type AuthLoginResponse = {
  access_token: string;
  empresa_atual: {
    id: number;
    nome_fantasia: string;
  } | null;
  usuario: {
    nome: string;
    email: string;
  };
};

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(`${API_BASE_URL}/${path.replace(/^\//, '')}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
}

function buildHeaders(session: SessionData, extraHeaders?: HeadersInit): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Empresa-Id': String(session.empresaId),
    ...(session.apiToken ? { Authorization: `Bearer ${session.apiToken}` } : {}),
    ...extraHeaders,
  };
}

async function request<T>(
  path: string,
  session: SessionData,
  init?: RequestInit,
  query?: Record<string, string | number | undefined>
): Promise<T> {
  const response = await fetch(buildUrl(path, query), {
    ...init,
    headers: buildHeaders(session, init?.headers),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Falha ao acessar ${path} (${response.status})`);
  }

  return (await response.json()) as T;
}

function unwrapResource<T>(payload: T | ResourceResponse<T>): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as ResourceResponse<T>).data;
  }

  return payload as T;
}

export async function login(payload: AuthLoginPayload): Promise<AuthLoginResponse> {
  const response = await fetch(buildUrl('auth/login'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      device_name: payload.deviceName ?? 'nwbasset-mobile',
      empresa_id: payload.empresaId,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Falha ao autenticar (${response.status})`);
  }

  return (await response.json()) as AuthLoginResponse;
}

export async function fetchInventariosAbertos(session: SessionData): Promise<Inventario[]> {
  const response = await request<PaginatedResponse<Inventario>>(
    'inventarios',
    session,
    undefined,
    {
      empresa_id: session.empresaId,
      filial_id: session.filialId,
      per_page: 100,
    }
  );

  return response.data.filter((inventario) => inventario.status === 'ABERTO' || inventario.status === 'EM_ANDAMENTO');
}

export async function fetchInventarioItens(session: SessionData, inventarioId: number): Promise<InventarioItem[]> {
  const response = await request<PaginatedResponse<InventarioItem>>(
    'inventario-itens',
    session,
    undefined,
    {
      inventario_id: inventarioId,
      per_page: 500,
    }
  );

  return response.data;
}

export async function fetchBem(session: SessionData, bemId: number): Promise<BemPatrimonial> {
  const response = await request<ResourceResponse<BemPatrimonial> | BemPatrimonial>(`bens/${bemId}`, session);

  return unwrapResource(response);
}

export async function fetchPlaquetas(session: SessionData): Promise<PlaquetaPatrimonial[]> {
  const response = await request<PaginatedResponse<PlaquetaPatrimonial>>(
    'plaquetas',
    session,
    undefined,
    {
      empresa_id: session.empresaId,
      filial_id: session.filialId,
      per_page: 500,
    }
  );

  return response.data;
}

export async function findBemByScannedCode(session: SessionData, scannedCode: string): Promise<PlaquetaPatrimonial | null> {
  const publicLookup = await fetch(buildUrl('public/plaquetas/lookup', { codigo: scannedCode }), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (publicLookup.ok) {
    const payload = (await publicLookup.json()) as { data?: { plaqueta?: PlaquetaPatrimonial } };

    if (payload.data?.plaqueta) {
      return payload.data.plaqueta;
    }
  }

  const plaquetas = await fetchPlaquetas(session);

  return (
    plaquetas.find((plaqueta) => {
      const queryCodigo = plaqueta.link_consulta.split('codigo=')[1];
      const codigoUrl = queryCodigo ? decodeURIComponent(queryCodigo) : '';

      return (
        plaqueta.codigo_plaqueta === scannedCode ||
        plaqueta.numero_plaqueta === scannedCode ||
        plaqueta.codigo_barras_conteudo === scannedCode ||
        plaqueta.link_consulta === scannedCode ||
        plaqueta.qr_code_conteudo === scannedCode ||
        codigoUrl === scannedCode
      );
    }) ?? null
  );
}

export async function confirmarPresenca(
  session: SessionData,
  inventarioItemId: number,
  observacoes?: string,
): Promise<InventarioItem> {
  const response = await request<ResourceResponse<InventarioItem> | InventarioItem>(`inventario-itens/${inventarioItemId}`, session, {
    method: 'PUT',
    body: JSON.stringify({
      localizado: true,
      data_verificacao: new Date().toISOString().slice(0, 10),
      observacoes: observacoes ?? null,
    }),
  });

  return unwrapResource(response);
}

export async function registrarDivergencia(session: SessionData, payload: DivergenciaPayload): Promise<unknown> {
  return request('divergencias', session, {
    method: 'POST',
    body: JSON.stringify({
      inventario_id: payload.inventarioId,
      bem_patrimonial_id: payload.bemPatrimonialId,
      tipo_divergencia: payload.tipoDivergencia,
      descricao: payload.descricao,
    }),
  });
}

export async function syncPendingActions(session: SessionData, pendingActions: PendingSyncAction[]): Promise<PendingSyncAction[]> {
  const remaining: PendingSyncAction[] = [];

  for (const action of pendingActions) {
    try {
      if (action.type === 'confirm_presence') {
        await confirmarPresenca(session, action.payload.inventarioItemId, action.payload.observacoes);
      }

      if (action.type === 'register_divergence') {
        await registrarDivergencia(session, {
          inventarioId: action.payload.inventarioId,
          bemPatrimonialId: action.payload.bemPatrimonialId,
          tipoDivergencia: action.payload.tipoDivergencia,
          descricao: action.payload.descricao,
        });
      }
    } catch {
      remaining.push(action);
    }
  }

  return remaining;
}
