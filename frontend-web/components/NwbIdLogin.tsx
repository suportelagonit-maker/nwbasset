'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import {
  NWBID_ID_TOKEN_KEY,
  NWBID_VERIFICADOR_KEY,
  desafioDe,
  gerarVerificador,
  sairDoNwbId,
  urlDeRetorno,
  type NwbIdConfig,
} from '@/lib/nwbid';

type Estado = 'pronto' | 'indo' | 'voltando' | 'erro';

/**
 * Entrada pelo NWB ID (Keycloak, realm nwb-equipe) — authorization code + PKCE.
 *
 * O navegador conversa direto com o Keycloak (cliente público, sem segredo).
 * O access token NÃO vira a sessão: é trocado em POST /api/auth/nwbid por
 * cookies locais, e o resto do sistema não sabe por onde a pessoa entrou.
 */
function NwbIdLoginContent({ config }: { config: NwbIdConfig }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const [estado, setEstado] = useState<Estado>('pronto');
  const [erro, setErro] = useState('');

  const entrar = useCallback(async () => {
    if (!config.habilitado) {
      setErro('NWB ID não configurado neste ambiente.');
      setEstado('erro');
      return;
    }

    setEstado('indo');
    const verificador = gerarVerificador();
    sessionStorage.setItem(NWBID_VERIFICADOR_KEY, verificador);
    const p = new URLSearchParams({
      client_id: config.cliente,
      response_type: 'code',
      scope: 'openid nwb-perfil',
      redirect_uri: urlDeRetorno(),
      code_challenge: await desafioDe(verificador),
      code_challenge_method: 'S256',
    });
    window.location.href = `${config.issuer}/protocol/openid-connect/auth?${p}`;
  }, [config]);

  // Saída: depois que o painel limpou os cookies, encerra também a sessão no NWB ID.
  useEffect(() => {
    if (parametros.get('saiu') === '1') {
      sairDoNwbId(config.issuer);
    }
  }, [parametros, config.issuer]);

  // Volta do Keycloak com ?code= : troca por token e entrega ao backend.
  useEffect(() => {
    const code = parametros.get('code');
    const recusa = parametros.get('error');

    if (recusa) {
      setErro(parametros.get('error_description') ?? 'O NWB ID recusou a entrada.');
      setEstado('erro');
      return;
    }

    if (!code || !config.habilitado) {
      return;
    }

    const verificador = sessionStorage.getItem(NWBID_VERIFICADOR_KEY) ?? '';
    sessionStorage.removeItem(NWBID_VERIFICADOR_KEY);
    setEstado('voltando');

    (async () => {
      try {
        const resposta = await fetch(`${config.issuer}/protocol/openid-connect/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: config.cliente,
            code,
            redirect_uri: urlDeRetorno(),
            code_verifier: verificador,
          }),
        });

        if (!resposta.ok) {
          throw new Error('O NWB ID não devolveu o acesso. Tente entrar de novo.');
        }

        const emitido = (await resposta.json()) as { access_token?: string; id_token?: string };

        // O id_token é o que o Keycloak aceita como prova de QUAL sessão encerrar no logout.
        if (emitido.id_token) {
          sessionStorage.setItem(NWBID_ID_TOKEN_KEY, emitido.id_token);
        }

        const troca = await fetch('/api/auth/nwbid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ access_token: emitido.access_token }),
        });
        const corpo = (await troca.json().catch(() => null)) as { message?: string; empresa_id?: number | null } | null;

        if (!troca.ok) {
          throw new Error(corpo?.message ?? 'Não foi possível entrar.');
        }

        // Limpa o ?code= da barra e segue para o painel (o proxy leva ao termo, se pendente).
        window.history.replaceState(null, '', '/login');
        router.replace(corpo?.empresa_id ? `/dashboard/patrimonio?empresa_id=${corpo.empresa_id}` : '/dashboard/patrimonio');
        router.refresh();
      } catch (falha) {
        setErro(falha instanceof Error ? falha.message : 'Falha na entrada.');
        setEstado('erro');
      }
    })();
  }, [parametros, router, config]);

  if (!config.habilitado) {
    return null;
  }

  return (
    <div className="panel-surface w-full max-w-md rounded-[28px] p-6 md:p-7">
      <span className="inline-flex rounded-full border border-[rgba(246,164,0,0.22)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
        Crachá único da equipe
      </span>
      <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">Entrar com NWB ID</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        A entrada do NWB Asset usa a sua conta <strong>NWB ID</strong> — a mesma dos outros sistemas da NWB. Quem pode abrir o sistema é definido no NWB Acessos.
      </p>

      {estado === 'erro' ? (
        <div role="alert" className="mt-4 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
          {erro}
        </div>
      ) : null}

      {estado === 'voltando' ? (
        <p className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full border border-[var(--line)] bg-white/80 text-sm font-semibold text-[var(--muted)]">
          Confirmando sua entrada…
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void entrar()}
          disabled={estado === 'indo'}
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <circle cx="12" cy="10" r="2.5" />
            <path d="M8.5 17a3.5 3.5 0 0 1 7 0" />
          </svg>
          {estado === 'indo' ? 'Abrindo o NWB ID…' : 'Entrar com NWB ID'}
        </button>
      )}

      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        Sem acesso? Peça a um administrador do NWB Asset para liberar você no NWB Acessos.
      </p>
    </div>
  );
}

/* useSearchParams exige uma fronteira de Suspense para o Next pré-renderizar a rota. */
export default function NwbIdLogin({ config }: { config: NwbIdConfig }) {
  return (
    <Suspense fallback={null}>
      <NwbIdLoginContent config={config} />
    </Suspense>
  );
}
