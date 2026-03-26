'use client';

import { useState } from 'react';

const FONTES = [
  {
    titulo: 'Receita Federal (Perguntas e Respostas PJ 2023)',
    descricao: 'Depreciação com referência à IN RFB 1.700/2017 e exemplos de veículos.',
    url: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/ecf/perguntas-e-respostas-pj-2023.pdf',
  },
  {
    titulo: 'CPC 27',
    descricao: 'Vida útil econômica e valor residual para ativo imobilizado.',
    url: 'https://www.cpc.org.br/Arquivos/Documentos/316_CPC_27_rev%2019.pdf',
  },
  {
    titulo: 'Receita Federal (Respostas DIPJ 2005)',
    descricao: 'Referência histórica de computadores/periféricos e regra de terrenos não depreciáveis.',
    url: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/dipj/respostas-2005/-respostas-2005.pdf',
  },
];

export default function FontesConsultaButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-white px-3 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        Fontes de Consulta
      </button>

      {open ? (
        <div className="admin-dialog-overlay">
          <div className="panel-surface w-[min(92vw,780px)] overflow-hidden rounded-[24px] p-3 md:p-3.5 shadow-[0_22px_64px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Depreciação patrimonial</p>
                <h3 className="mt-1 text-[1.08rem] font-semibold tracking-[-0.04em] text-[var(--ink)]">Fontes de consulta oficiais</h3>
                <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-[var(--muted)]">
                  Referências normativas para apoiar configuração de vida útil, taxa anual e valor residual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-9 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-[13px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Fechar
              </button>
            </div>

            <div className="mt-3 grid gap-2.5">
              {FONTES.map((fonte) => (
                <article key={fonte.url} className="rounded-[14px] border border-[var(--line)] bg-[#fafafa] p-3">
                  <p className="text-[13px] font-semibold text-[var(--ink)]">{fonte.titulo}</p>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--muted)]">{fonte.descricao}</p>
                  <a
                    href={fonte.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex text-[12px] font-semibold text-[var(--blue)] underline decoration-[rgba(37,99,235,0.35)] underline-offset-2"
                  >
                    Abrir fonte oficial
                  </a>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
