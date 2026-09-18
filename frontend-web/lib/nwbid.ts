/**
 * NWB ID (Keycloak, realm nwb-equipe) — lado do navegador.
 *
 * A configuração vem do backend em tempo de execução (GET auth/nwbid/config),
 * não de NEXT_PUBLIC_*: assim mudar o .env do servidor basta, sem rebuild.
 */

export type NwbIdConfig = {
  habilitado: boolean;
  issuer: string;
  cliente: string;
  sistema: string;
  login_senha: boolean;
};

export const NWBID_ID_TOKEN_KEY = 'nwbasset_nwbid_id_token';
export const NWBID_VERIFICADOR_KEY = 'nwbasset_pkce_verificador';

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

export function gerarVerificador() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function desafioDe(verificador: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verificador));
  return base64url(new Uint8Array(digest));
}

export function urlDeRetorno() {
  return `${window.location.origin}/login`;
}

/**
 * Encerra também a sessão no NWB ID. Sem isso, "Sair" seguido de "Entrar com
 * NWB ID" devolve a mesma pessoa sem pedir senha — num computador
 * compartilhado, isso é entregar a conta ao próximo.
 */
export function sairDoNwbId(issuer: string) {
  let idToken: string | null = null;
  try {
    idToken = sessionStorage.getItem(NWBID_ID_TOKEN_KEY);
    sessionStorage.removeItem(NWBID_ID_TOKEN_KEY);
  } catch {
    return false;
  }
  if (!issuer || !idToken) {
    return false;
  }
  const params = new URLSearchParams({
    id_token_hint: idToken,
    post_logout_redirect_uri: `${window.location.origin}/login`,
  });
  window.location.assign(`${issuer.replace(/\/+$/, '')}/protocol/openid-connect/logout?${params}`);
  return true;
}
