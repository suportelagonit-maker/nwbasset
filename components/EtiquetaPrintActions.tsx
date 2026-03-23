'use client';

import Link from 'next/link';

type EtiquetaPrintActionsProps = {
  consultaHref: string;
};

export default function EtiquetaPrintActions({ consultaHref }: EtiquetaPrintActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={consultaHref}
        className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-white px-5 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
      >
        Abrir consulta
      </Link>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)]"
      >
        Imprimir etiqueta
      </button>
    </div>
  );
}
