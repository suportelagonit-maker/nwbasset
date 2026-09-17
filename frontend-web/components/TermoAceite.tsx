'use client';

import { useEffect, useRef, useState } from 'react';

import TermoDocumento from '@/components/TermoDocumento';
import { aceitarTermo, carregarTermo, type TermoUsoData } from '@/lib/termo-uso';

/**
 * Tela obrigatória do primeiro acesso: mostra o termo vigente e só libera o
 * sistema depois do aceite. Enquanto o termo não é lido até o fim, o botão
 * de aceite fica desabilitado.
 */
export default function TermoAceite({ userName }: { userName?: string | null }) {
  const [termo, setTermo] = useState<TermoUsoData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [lidoAteOFim, setLidoAteOFim] = useState(false);
  const [marcado, setMarcado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const areaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    carregarTermo()
      .then((dados) => {
        setTermo(dados);
        if (!dados.pendente) {
          // Já aceito (ex.: abriu /termo pelo endereço): segue para o painel.
          window.location.assign('/dashboard/patrimonio');
        }
      })
      .catch((falha: Error) => setErro(falha.message));
  }, []);

  // Considera "lido" quando o usuário rolou até o fim do documento (ou quando ele cabe na tela).
  useEffect(() => {
    const area = areaRef.current;
    if (!area || !termo) {
      return;
    }

    const verificar = () => {
      if (area.scrollHeight - area.scrollTop - area.clientHeight < 40) {
        setLidoAteOFim(true);
      }
    };

    verificar();
    area.addEventListener('scroll', verificar, { passive: true });
    return () => area.removeEventListener('scroll', verificar);
  }, [termo]);

  async function aceitar() {
    if (!termo || !marcado) {
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      await aceitarTermo(termo.versao);
      window.location.assign('/dashboard/patrimonio');
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível registrar o aceite.');
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--workspace-bg)]">
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-deep)]">Primeiro acesso · leitura obrigatória</p>
            <h2 className="mt-1 font-[family-name:var(--font-heading)] text-[1.3rem] font-semibold tracking-[-0.03em] text-[var(--ink)] md:text-[1.6rem]">
              {userName ? `${userName.split(' ')[0]}, ` : ''}antes de continuar, leia e aceite o termo
            </h2>
            <p className="mt-1 text-[13px] text-[var(--muted)]">
              O uso do NWB Asset depende do aceite do Termo de Responsabilidade de Uso e LGPD. Sem o aceite, o sistema não pode ser utilizado.
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="inline-flex h-9 items-center rounded-full border border-[var(--line)] bg-white px-3.5 text-[12px] font-semibold text-[var(--rose)] transition hover:border-[var(--rose)]">
              Não aceito · sair
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[960px] flex-1 flex-col px-4 py-4 md:px-6 md:py-6">
        {erro ? (
          <div className="mb-4 rounded-[16px] border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-[13px] text-[var(--rose)]">{erro}</div>
        ) : null}

        <div
          ref={areaRef}
          className="termo-area max-h-[calc(100dvh-300px)] min-h-[320px] overflow-y-auto rounded-[22px] border border-[var(--line)] bg-[#f4f6f9] p-2 md:p-4"
          aria-busy={!termo}
        >
          {termo ? (
            <TermoDocumento termo={termo} aceite={null} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-[13px] text-[var(--muted)]">Carregando o termo...</div>
          )}
        </div>

        <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-white px-4 py-4 md:px-6">
          {!lidoAteOFim ? (
            <p className="mb-3 text-[12px] font-medium text-[var(--accent-deep)]">Role o documento até o fim para liberar o aceite.</p>
          ) : null}
          <label className={['flex cursor-pointer items-start gap-3', lidoAteOFim ? '' : 'opacity-50'].join(' ')}>
            <input
              type="checkbox"
              checked={marcado}
              disabled={!lidoAteOFim || !termo}
              onChange={(event) => setMarcado(event.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]"
            />
            <span className="text-[14px] leading-6 text-[var(--ink)]">
              <span className="font-semibold">Li e aceito o Termo</span> de Responsabilidade de Uso da Ferramenta e Proteção de Dados (LGPD), versão {termo?.versao ?? '—'}. Estou ciente de que este aceite será registrado com meu nome, data, hora e endereço IP.
            </span>
          </label>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void aceitar()}
              disabled={!marcado || !termo || enviando}
              className="inline-flex h-11 items-center rounded-full bg-[var(--accent)] px-6 text-[14px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? 'Registrando aceite...' : 'Aceitar e entrar no sistema'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
