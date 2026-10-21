'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { BUILD_VERSION } from '@/lib/build-version';
import { temTrabalhoEmAndamento } from '@/lib/auto-update-rules';

/**
 * Mantem o aplicativo instalado na versao publicada.
 *
 * O problema real: instalado como PWA, o NWB Asset abre numa janela propria que
 * a pessoa nao fecha — fica dias aberta. Quando sai uma versao nova, aquela
 * janela continua rodando a antiga; e os pedacos de JavaScript do Next tem nome
 * com hash, entao os arquivos da versao velha deixam de existir no servidor.
 * Abrir uma tela ainda nao carregada passa a dar erro de modulo em vez de abrir.
 *
 * O service worker nao resolve: ele nao faz cache de pagina (navegacao e rede
 * primeiro). O que fica velho e a aba aberta.
 *
 * Como funciona: o build grava a versao em dois lugares — congelada no pacote
 * (BUILD_VERSION, de lib/build-version.ts) e em /version.json (sempre a do
 * servidor). Divergiram, saiu versao nova.
 *
 *  - Sem nada digitado, recarrega sozinha (caso comum: janela aberta e parada).
 *  - Com algo digitado, nao recarrega: mostra um aviso discreto e espera, para
 *    nao apagar um formulario em preenchimento.
 *  - Verifica ao voltar o foco e de 15 em 15 minutos.
 */

const INTERVALO_MS = 15 * 60 * 1000;

export function AutoUpdate() {
  const [novaVersao, setNovaVersao] = useState('');
  const recarregando = useRef(false);

  const recarregar = useCallback(() => {
    if (recarregando.current) return;
    recarregando.current = true;
    window.location.reload();
  }, []);

  const conferir = useCallback(async () => {
    // Sem versao no pacote (desenvolvimento), nao ha o que comparar.
    if (!BUILD_VERSION || recarregando.current) return;
    try {
      const resposta = await fetch('/version.json', { cache: 'no-store' });
      if (!resposta.ok) return;
      const { version } = (await resposta.json()) as { version?: string };
      if (!version || version === BUILD_VERSION) return;

      // Pede a atualizacao do service worker junto, para ele nao ficar para
      // tras por ate 24h (quando o navegador olharia sozinho).
      void navigator.serviceWorker
        ?.getRegistration()
        .then((registro) => registro?.update())
        .catch(() => undefined);

      if (!temTrabalhoEmAndamento(document)) {
        recarregar();
        return;
      }
      setNovaVersao(version);
    } catch {
      // Sem rede ou servidor reiniciando: tenta de novo no proximo ciclo.
    }
  }, [recarregar]);

  useEffect(() => {
    if (!BUILD_VERSION) return;
    const timer = window.setTimeout(() => void conferir(), 0);
    const intervalo = window.setInterval(() => void conferir(), INTERVALO_MS);
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void conferir();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
    };
  }, [conferir]);

  if (!novaVersao) return null;
  return (
    <div className="app-update-bar" role="status">
      <span>
        <b>Nova versão disponível</b>
        <small>Esta janela continua na versão anterior. Salve o que está fazendo e atualize.</small>
      </span>
      <button type="button" onClick={recarregar}>
        Atualizar agora
      </button>
    </div>
  );
}
