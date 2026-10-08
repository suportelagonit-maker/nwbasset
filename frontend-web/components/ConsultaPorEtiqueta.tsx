'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import LeitorCodigo from '@/components/LeitorCodigo';

/**
 * Busca de um bem pela etiqueta, na consulta pública: ler com a câmera ou
 * digitar o código. É o caminho usado em campo, com o celular na mão.
 *
 * Com `?ler=1` na URL (atalho do aplicativo instalado) a câmera já abre.
 */
export default function ConsultaPorEtiqueta({ abrirLeitor = false, codigoAtual = '' }: { abrirLeitor?: boolean; codigoAtual?: string }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState(codigoAtual);

  useEffect(() => {
    if (abrirLeitor) {
      setAberto(true);
    }
  }, [abrirLeitor]);

  function consultar(valor: string) {
    const limpo = valor.trim();
    if (!limpo) {
      return;
    }
    router.push(`/patrimonio/consulta?codigo=${encodeURIComponent(limpo)}`);
    router.refresh();
  }

  return (
    <div className="rounded-[26px] border border-[var(--line)] bg-white p-4 md:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Localizar um bem</p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setAberto(true)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-5 text-[14px] font-semibold text-white transition hover:opacity-90"
        >
          <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M3 8V6a2 2 0 0 1 2-2h2M17 4h2a2 2 0 0 1 2 2v2M21 16v2a2 2 0 0 1-2 2h-2M7 20H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 9v6M10 9v6M13 9v6M17 9v6" />
          </svg>
          Ler etiqueta com a câmera
        </button>

        <form
          className="flex flex-1 gap-2"
          onSubmit={(evento) => {
            evento.preventDefault();
            consultar(codigo);
          }}
        >
          <input
            value={codigo}
            onChange={(evento) => setCodigo(evento.target.value)}
            placeholder="ou digite o código da plaqueta"
            className="h-11 min-w-0 flex-1 rounded-full border border-[var(--line)] bg-white px-4 text-[14px] text-[var(--ink)] outline-none transition focus:border-[rgba(246,164,0,0.6)]"
          />
          <button type="submit" className="inline-flex h-11 items-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)]">
            Buscar
          </button>
        </form>
      </div>

      <LeitorCodigo
        aberto={aberto}
        onFechar={() => setAberto(false)}
        onLer={(valor) => {
          setCodigo(valor);
          consultar(valor);
        }}
        titulo="Ler etiqueta do bem"
        descricao="Aponte a câmera para o código de barras ou o QR Code da plaqueta."
      />
    </div>
  );
}
