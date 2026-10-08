'use client';

import { useCallback, useEffect, useState } from 'react';

import { handleUnauthorizedClientResponse } from '@/lib/client-auth';

/**
 * Avisos de acesso no aparelho (Web Push).
 *
 * Três estados possíveis, e a tela diz em qual deles você está em vez de
 * oferecer um botão que não faria nada:
 *   - o servidor não tem chaves VAPID → não há como enviar;
 *   - o navegador não suporta notificação (ou o iPhone fora do app instalado);
 *   - tudo certo → ligar/desligar este aparelho e escolher os assuntos.
 */

type Assunto = {
  chave: string;
  titulo: string;
  descricao: string;
  somente_administradores: boolean;
};

type EstadoPush = {
  configurado: boolean;
  chave_publica: string | null;
  aparelhos: number;
  preferencias: Record<string, boolean>;
  assuntos: Assunto[];
};

/** A chave VAPID viaja em base64url; o navegador quer bytes. */
function chaveParaBytes(base64url: string) {
  const preenchimento = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + preenchimento).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = window.atob(base64);
  const bytes = new Uint8Array(bruto.length);

  for (let i = 0; i < bruto.length; i += 1) {
    bytes[i] = bruto.charCodeAt(i);
  }

  return bytes;
}

export default function AvisosPush() {
  const [estado, setEstado] = useState<EstadoPush | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [ligadoAqui, setLigadoAqui] = useState(false);
  const [permissao, setPermissao] = useState<NotificationPermission | 'indisponivel'>('indisponivel');
  const [recado, setRecado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const suportado =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/push', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const corpo = (await resposta.json().catch(() => null)) as { data?: EstadoPush; message?: string } | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (!resposta.ok || !corpo?.data) {
        throw new Error(corpo?.message ?? 'Não foi possível carregar os avisos.');
      }

      setEstado(corpo.data);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os avisos.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (!suportado) {
      setCarregando(false);
      return;
    }

    setPermissao(Notification.permission);

    void (async () => {
      const registro = await navigator.serviceWorker.getRegistration();
      const assinatura = await registro?.pushManager.getSubscription();
      setLigadoAqui(Boolean(assinatura));
      await carregar();
    })();
  }, [carregar, suportado]);

  async function ligar() {
    if (!estado?.chave_publica) {
      return;
    }

    setOcupado(true);
    setErro(null);
    setRecado(null);

    try {
      const autorizacao = await Notification.requestPermission();
      setPermissao(autorizacao);

      if (autorizacao !== 'granted') {
        setErro('O navegador não liberou as notificações para este site. Libere nas configurações e tente de novo.');
        return;
      }

      const registro = await navigator.serviceWorker.ready;
      const assinatura =
        (await registro.pushManager.getSubscription()) ??
        (await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: chaveParaBytes(estado.chave_publica),
        }));

      const dados = assinatura.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };

      const resposta = await fetch('/api/admin/push/assinaturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ endpoint: dados.endpoint, keys: dados.keys }),
      });
      const corpo = (await resposta.json().catch(() => null)) as { message?: string } | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (!resposta.ok) {
        throw new Error(corpo?.message ?? 'Não foi possível inscrever este aparelho.');
      }

      setLigadoAqui(true);
      setRecado('Avisos ligados neste aparelho.');
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível ligar os avisos.');
    } finally {
      setOcupado(false);
    }
  }

  async function desligar() {
    setOcupado(true);
    setErro(null);
    setRecado(null);

    try {
      const registro = await navigator.serviceWorker.getRegistration();
      const assinatura = await registro?.pushManager.getSubscription();

      if (assinatura) {
        await fetch('/api/admin/push/assinaturas', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ endpoint: assinatura.endpoint }),
        });
        await assinatura.unsubscribe();
      }

      setLigadoAqui(false);
      setRecado('Este aparelho não receberá mais avisos.');
      await carregar();
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível desligar os avisos.');
    } finally {
      setOcupado(false);
    }
  }

  async function alternarAssunto(chave: string, ativo: boolean) {
    if (!estado) {
      return;
    }

    // Marca na hora: a tela não pode piscar esperando o servidor.
    setEstado({ ...estado, preferencias: { ...estado.preferencias, [chave]: ativo } });
    setErro(null);

    try {
      const resposta = await fetch('/api/admin/push/preferencias', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ preferencias: { [chave]: ativo } }),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        | { data?: { preferencias: Record<string, boolean> }; message?: string }
        | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (!resposta.ok) {
        throw new Error(corpo?.message ?? 'Não foi possível salvar a preferência.');
      }

      if (corpo?.data?.preferencias) {
        setEstado((atual) => (atual ? { ...atual, preferencias: corpo.data!.preferencias } : atual));
      }
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível salvar a preferência.');
      await carregar();
    }
  }

  async function testar() {
    setOcupado(true);
    setErro(null);
    setRecado(null);

    try {
      const resposta = await fetch('/api/admin/push/teste', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      });
      const corpo = (await resposta.json().catch(() => null)) as { message?: string } | null;

      if (handleUnauthorizedClientResponse(resposta.status, corpo?.message)) {
        return;
      }

      if (!resposta.ok) {
        throw new Error(corpo?.message ?? 'Não foi possível enviar o aviso de teste.');
      }

      setRecado(corpo?.message ?? 'Aviso de teste enviado.');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível enviar o aviso de teste.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <article className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[var(--ink)]">Avisos de acesso</h3>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Receba um aviso no celular ou no computador quando sua conta for usada em um aparelho novo.
          </p>
        </div>
        {ligadoAqui ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[rgba(74,222,128,0.16)] px-3 py-1 text-[11px] font-semibold text-[#15803d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            Ligado neste aparelho
          </span>
        ) : null}
      </div>

      {carregando ? <p className="mt-5 text-sm text-[var(--muted)]">Carregando…</p> : null}

      {!carregando && !suportado ? (
        <p className="mt-5 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          Este navegador não envia avisos. No iPhone, só funciona com o NWB Asset instalado na tela de início
          (Compartilhar › Adicionar à Tela de Início).
        </p>
      ) : null}

      {!carregando && suportado && estado && !estado.configurado ? (
        <p className="mt-5 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-4 text-sm leading-6 text-[var(--muted)]">
          Os avisos ainda não foram habilitados neste servidor. Um administrador precisa gerar as chaves de envio
          (<code className="rounded bg-white px-1 py-0.5 text-[12px]">php artisan push:chaves</code>) e reiniciar o sistema.
        </p>
      ) : null}

      {!carregando && suportado && estado?.configurado ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {ligadoAqui ? (
              <>
                <button
                  type="button"
                  onClick={() => void desligar()}
                  disabled={ocupado}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:opacity-60"
                >
                  Desligar neste aparelho
                </button>
                <button
                  type="button"
                  onClick={() => void testar()}
                  disabled={ocupado}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)] disabled:opacity-60"
                >
                  Enviar aviso de teste
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void ligar()}
                disabled={ocupado || permissao === 'denied'}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              >
                {ocupado ? 'Ligando…' : 'Ligar avisos neste aparelho'}
              </button>
            )}
          </div>

          {permissao === 'denied' ? (
            <p className="mt-3 text-[13px] leading-6 text-[var(--rose)]">
              As notificações estão bloqueadas para este site no navegador. Libere nas configurações do site e recarregue
              a página.
            </p>
          ) : null}

          {estado.aparelhos > 0 ? (
            <p className="mt-3 text-[13px] text-[var(--muted)]">
              {estado.aparelhos === 1 ? '1 aparelho recebe' : `${estado.aparelhos} aparelhos recebem`} seus avisos.
            </p>
          ) : null}

          <div className="mt-6 border-t border-[var(--line)] pt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">O que você quer receber</p>

            <div className="mt-3 grid gap-2.5">
              {estado.assuntos.map((assunto) => (
                <label
                  key={assunto.chave}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--line)] bg-[#fafafa] px-4 py-3.5"
                >
                  <input
                    type="checkbox"
                    checked={estado.preferencias[assunto.chave] ?? true}
                    onChange={(evento) => void alternarAssunto(assunto.chave, evento.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border border-[var(--line)] accent-[var(--accent)]"
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)]">{assunto.titulo}</span>
                      {assunto.somente_administradores ? (
                        <span className="rounded-full bg-[rgba(37,99,235,0.1)] px-2 py-0.5 text-[10px] font-semibold text-[var(--blue)]">
                          Administradores
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-[13px] leading-5 text-[var(--muted)]">{assunto.descricao}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {recado ? <p className="mt-4 text-[13px] font-medium text-[#15803d]">{recado}</p> : null}
      {erro ? <p className="mt-4 text-[13px] font-medium text-[var(--rose)]">{erro}</p> : null}
    </article>
  );
}
