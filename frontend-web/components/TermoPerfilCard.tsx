'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import TermoDocumento, { CarimboAceite } from '@/components/TermoDocumento';
import { carregarTermo, formatarDataHora, type TermoUsoData } from '@/lib/termo-uso';

/** Visualizador do termo em tela cheia, com impressão. */
function TermoViewer({ termo, onClose }: { termo: TermoUsoData; onClose: () => void }) {
  useEffect(() => {
    document.body.classList.add('termo-viewer-aberto');
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.body.classList.remove('termo-viewer-aberto');
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', handle);
    };
  }, [onClose]);

  return (
    <div className="termo-viewer fixed inset-0 z-[120] flex flex-col bg-[rgba(15,23,42,0.55)] backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={termo.titulo}>
      <div className="termo-viewer-barra flex items-center justify-between gap-3 bg-[#111827] px-4 py-3 text-white md:px-6 print:hidden">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">Visualizador</p>
          <p className="truncate text-[14px] font-semibold">{termo.titulo}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center rounded-full border border-white/25 px-3.5 text-[12px] font-semibold text-white transition hover:bg-white/10">
            Imprimir / salvar PDF
          </button>
          <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-full bg-[var(--accent)] px-3.5 text-[12px] font-semibold text-white transition hover:opacity-90">
            Fechar
          </button>
        </div>
      </div>
      <div className="termo-viewer-corpo flex-1 overflow-y-auto p-3 md:p-6">
        <div className="mx-auto max-w-[900px]">
          <TermoDocumento termo={termo} aceite={termo.aceite} />
        </div>
      </div>
    </div>
  );
}

/** Cartão do perfil: situação do aceite, carimbo e acesso ao viewer. */
export default function TermoPerfilCard() {
  const [termo, setTermo] = useState<TermoUsoData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    carregarTermo().then(setTermo).catch((falha: Error) => setErro(falha.message));
  }, []);

  return (
    <article className="panel-surface rounded-[22px] p-4 md:rounded-[28px] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Termo de Responsabilidade e LGPD</p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--ink)]">{termo?.titulo ?? 'Termo de uso da ferramenta'}</h3>
          <p className="mt-1 text-[13px] text-[var(--muted)]">
            {termo ? `Versão ${termo.versao}` : 'Carregando...'}
            {termo?.aceite ? ` · aceito em ${formatarDataHora(termo.aceite.aceito_em)}` : termo ? ' · aceite pendente' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAberto(true)}
          disabled={!termo}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
            <path d="M14 3v5h5M9 13h6M9 17h6" />
          </svg>
          Abrir termo
        </button>
      </div>

      {erro ? <p className="mt-3 text-[13px] text-[var(--rose)]">{erro}</p> : null}

      {termo?.aceite ? (
        <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-[rgba(34,197,94,0.25)] bg-[rgba(74,222,128,0.06)] p-4 md:flex-row md:items-center md:justify-between">
          <div className="grid gap-2 text-[13px] sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Aceito por</p>
              <p className="font-semibold text-[var(--ink)]">{termo.aceite.nome_usuario}</p>
              <p className="text-[12px] text-[var(--muted)]">{termo.aceite.email_usuario}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Data e hora</p>
              <p className="font-semibold tabular-nums text-[var(--ink)]">{formatarDataHora(termo.aceite.aceito_em)}</p>
              <p className="text-[12px] text-[var(--muted)]">{termo.aceite.ip ? `IP ${termo.aceite.ip}` : 'IP não registrado'}</p>
            </div>
          </div>
          <CarimboAceite aceite={termo.aceite} largura={300} />
        </div>
      ) : termo ? (
        <p className="mt-4 rounded-2xl border border-[rgba(246,164,0,0.3)] bg-[rgba(246,164,0,0.08)] px-4 py-3 text-[13px] text-[#7c4a03]">
          Este usuário ainda não aceitou a versão vigente do termo.
        </p>
      ) : null}

      {/* Portal: o viewer precisa ser filho direto do body para a regra de impressao esconder o resto da pagina. */}
      {aberto && termo ? createPortal(<TermoViewer termo={termo} onClose={() => setAberto(false)} />, document.body) : null}
    </article>
  );
}
