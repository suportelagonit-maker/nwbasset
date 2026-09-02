/**
 * Endereco da API Laravel.
 *
 * O frontend fala com a API de dois lugares diferentes, e eles nao enxergam a
 * rede do mesmo jeito:
 *
 *   - No NAVEGADOR (componentes 'use client'), o endereco precisa ser publico:
 *     em desenvolvimento http://localhost:5000/api/v1, em producao a URL do
 *     dominio. Esse valor vem de NEXT_PUBLIC_API_BASE_URL e e embutido no
 *     bundle durante o build.
 *
 *   - No SERVIDOR (route handlers em app/api e componentes de servidor), o
 *     codigo roda dentro do container do frontend. Ali "localhost" e o proprio
 *     container, nao o backend. O endereco precisa ser o do servico na rede
 *     interna do Docker: http://backend/api/v1. Esse valor vem de
 *     API_BASE_URL_INTERNAL e e lido em tempo de execucao.
 *
 * Fora do Docker as duas variaveis podem apontar para o mesmo lugar; quando
 * API_BASE_URL_INTERNAL nao existe, o valor publico e usado nos dois casos.
 */
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1';
const INTERNAL_BASE_URL = process.env.API_BASE_URL_INTERNAL ?? PUBLIC_BASE_URL;

function resolveApiBaseUrl(): string {
  const isServer = typeof window === 'undefined';

  return (isServer ? INTERNAL_BASE_URL : PUBLIC_BASE_URL).replace(/\/$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Endereco publico da API, util para montar URLs que o navegador vai abrir
 * (download de arquivo, imagem servida pelo Laravel), mesmo quando o codigo
 * que monta a URL roda no servidor.
 */
export const PUBLIC_API_BASE_URL = PUBLIC_BASE_URL.replace(/\/$/, '');
