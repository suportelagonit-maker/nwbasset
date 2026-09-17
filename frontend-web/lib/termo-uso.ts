export type TermoAceite = {
  versao: string;
  nome_usuario: string;
  email_usuario: string;
  aceito_em: string | null;
  ip: string | null;
  hash_conteudo: string;
};

export type TermoUsoData = {
  versao: string;
  titulo: string;
  publicado_em: string;
  hash: string;
  conteudo_html: string;
  aceite: TermoAceite | null;
  pendente: boolean;
};

export async function carregarTermo(): Promise<TermoUsoData> {
  const response = await fetch('/api/auth/termo', { headers: { Accept: 'application/json' }, cache: 'no-store' });
  const payload = (await response.json().catch(() => null)) as { data?: TermoUsoData; message?: string } | null;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.message ?? `Não foi possível carregar o termo (${response.status}).`);
  }

  return payload.data;
}

export async function aceitarTermo(versao: string): Promise<TermoAceite> {
  const response = await fetch('/api/auth/termo', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ aceito: true, versao }),
  });
  const payload = (await response.json().catch(() => null)) as { data?: TermoAceite; message?: string } | null;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.message ?? `Não foi possível registrar o aceite (${response.status}).`);
  }

  return payload.data;
}

export function formatarDataHora(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toLocaleDateString('pt-BR')} às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
}

export function formatarData(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}
