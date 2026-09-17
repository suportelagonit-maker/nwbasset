'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { renderAdminIcon } from '@/lib/admin-navigation';
import { AJUDA_SECOES, listarTopicos, type AjudaTopico } from '@/lib/ajuda-conteudo';

const INICIO_HREF = '/dashboard/patrimonio';

function normalizar(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function textoDoTopico(topico: AjudaTopico) {
  return [
    topico.titulo,
    topico.objetivo,
    topico.requer ?? '',
    ...topico.passos.flatMap((passo) => [passo.onde, passo.acao, passo.porque ?? '']),
    ...(topico.dicas ?? []),
    ...(topico.palavras ?? []),
  ].join(' ');
}

/** Destaca as ocorrências da busca dentro de um texto. */
function Destaque({ texto, termo }: { texto: string; termo: string }) {
  if (!termo) {
    return <>{texto}</>;
  }

  const alvo = normalizar(texto);
  const chave = normalizar(termo);
  const partes: React.ReactNode[] = [];
  let cursor = 0;
  let indice = alvo.indexOf(chave);

  while (indice !== -1) {
    partes.push(texto.slice(cursor, indice));
    partes.push(
      <mark key={`${indice}-${cursor}`} className="rounded-sm bg-[rgba(246,164,0,0.35)] px-0.5 text-inherit">
        {texto.slice(indice, indice + chave.length)}
      </mark>,
    );
    cursor = indice + chave.length;
    indice = alvo.indexOf(chave, cursor);
  }
  partes.push(texto.slice(cursor));

  return <>{partes}</>;
}

function Topico({
  topico,
  aberto,
  termo,
  onToggle,
}: {
  topico: AjudaTopico;
  aberto: boolean;
  termo: string;
  onToggle: () => void;
}) {
  return (
    <article id={topico.id} className="scroll-mt-40 rounded-[20px] border border-[var(--line)] bg-white">
      <h3 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={aberto}
          aria-controls={`${topico.id}-conteudo`}
          className="flex w-full items-start gap-3 px-4 py-4 text-left md:px-5"
        >
          <span
            className={[
              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[var(--accent-deep)] transition',
              aberto ? 'rotate-90 border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)] bg-[#fafafa]',
            ].join(' ')}
            aria-hidden="true"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="m7 5 6 5-6 5" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold tracking-[-0.01em] text-[var(--ink)] md:text-[16px]">
              <Destaque texto={topico.titulo} termo={termo} />
            </span>
            <span className="mt-0.5 block text-[13px] leading-5 text-[var(--muted)]">
              <Destaque texto={topico.objetivo} termo={termo} />
            </span>
          </span>
        </button>
      </h3>

      {aberto ? (
        <div id={`${topico.id}-conteudo`} className="border-t border-[var(--line)] px-4 pb-5 pt-4 md:px-5">
          {topico.imagem ? (
            <figure className="m-0">
              <a
                href={topico.imagem}
                target="_blank"
                rel="noreferrer"
                title="Abrir a captura em tamanho real"
                className="block overflow-hidden rounded-[16px] border border-[var(--line)] bg-[#f4f6f9]"
              >
                <Image
                  src={topico.imagem}
                  alt={`Tela: ${topico.titulo}`}
                  width={1366}
                  height={800}
                  className="h-auto w-full"
                  sizes="(min-width: 1280px) 820px, 100vw"
                />
              </a>
              <figcaption className="mt-1.5 text-[11px] text-[var(--muted)]">
                {topico.imagemLegenda ?? 'Captura da tela do sistema.'} Clique na imagem para ampliar.
              </figcaption>
            </figure>
          ) : null}

          {topico.requer ? (
            <p className="mt-4 rounded-[14px] border border-[rgba(37,99,235,0.2)] bg-[rgba(37,99,235,0.06)] px-3.5 py-2.5 text-[12.5px] leading-5 text-[#1e3a8a]">
              <span className="font-semibold">Pré-requisito: </span>
              <Destaque texto={topico.requer} termo={termo} />
            </p>
          ) : null}

          <ol className="mt-4 space-y-3">
            {topico.passos.map((passo, indice) => (
              <li key={`${topico.id}-${indice}`} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--ink)] text-[12px] font-bold text-white">{indice + 1}</span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                    <Destaque texto={passo.onde} termo={termo} />
                  </p>
                  <p className="mt-0.5 text-[14px] leading-6 text-[var(--ink)]">
                    <Destaque texto={passo.acao} termo={termo} />
                  </p>
                  {passo.porque ? (
                    <p className="mt-0.5 text-[12.5px] leading-5 text-[var(--muted)]">
                      <Destaque texto={passo.porque} termo={termo} />
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>

          {topico.dicas?.length ? (
            <div className="mt-4 rounded-[14px] border border-[rgba(246,164,0,0.3)] bg-[rgba(246,164,0,0.08)] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">Dicas</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13px] leading-5 text-[#4a4f58]">
                {topico.dicas.map((dica) => (
                  <li key={dica}>
                    <Destaque texto={dica} termo={termo} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {topico.open ? (
            <Link
              href={topico.open.href}
              prefetch={false}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-[12px] font-semibold text-white transition hover:opacity-90"
            >
              {topico.open.label}
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="m7 5 6 5-6 5" />
              </svg>
            </Link>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export default function CentralAjuda() {
  const [termo, setTermo] = useState('');
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
  const buscaRef = useRef<HTMLInputElement | null>(null);
  const todos = useMemo(() => listarTopicos(), []);
  const chave = normalizar(termo.trim());

  const visiveis = useMemo(() => {
    if (!chave) {
      return null;
    }
    return new Set(todos.filter(({ topico }) => normalizar(textoDoTopico(topico)).includes(chave)).map(({ topico }) => topico.id));
  }, [chave, todos]);

  // Link direto (#id) abre o tópico e rola até ele.
  useEffect(() => {
    const id = window.location.hash.replace('#', '');
    if (!id) {
      return;
    }
    if (todos.some(({ topico }) => topico.id === id)) {
      setAbertos(new Set([id]));
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [todos]);

  // Atalho "/" foca a busca.
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.key === '/' && document.activeElement !== buscaRef.current) {
        event.preventDefault();
        buscaRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, []);

  function alternar(id: string) {
    setAbertos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) {
        proximo.delete(id);
      } else {
        proximo.add(id);
      }
      return proximo;
    });
  }

  function expandirTudo() {
    setAbertos(new Set(todos.map(({ topico }) => topico.id)));
  }

  function recolherTudo() {
    setAbertos(new Set());
  }

  const secoesFiltradas = AJUDA_SECOES.map((secao) => ({
    ...secao,
    topicos: visiveis ? secao.topicos.filter((topico) => visiveis.has(topico.id)) : secao.topicos,
  })).filter((secao) => secao.topicos.length > 0);
  const totalResultados = visiveis ? visiveis.size : todos.length;

  return (
    <div className="min-h-screen bg-[var(--workspace-bg)]">
      {/* Cabeçalho fixo: identidade, busca e voltar */}
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(255,255,255,0.96)] backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <Link href={INICIO_HREF} prefetch={false} className="flex shrink-0 items-center gap-3">
            <Image src="/logoasset.png" alt="NWB Asset" width={150} height={40} priority className="h-auto w-[110px] object-contain md:w-[140px]" />
            <span className="hidden h-6 w-px bg-[var(--line)] sm:block" aria-hidden="true" />
            <span className="hidden text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)] sm:block">Central de ajuda</span>
          </Link>

          <label className="relative order-3 w-full min-w-0 md:order-2 md:flex-1">
            <span className="sr-only">Pesquisar na Central de Ajuda</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              ref={buscaRef}
              type="search"
              value={termo}
              onChange={(event) => setTermo(event.target.value)}
              placeholder="Pesquisar: plaqueta, inventário, PDF, senha..."
              className="h-11 w-full rounded-full border border-[var(--line)] bg-white pl-10 pr-4 text-[14px] text-[var(--ink)] outline-none transition focus:border-[rgba(246,164,0,0.6)] focus:shadow-[0_0_0_3px_rgba(246,164,0,0.12)]"
            />
          </label>

          <Link
            href={INICIO_HREF}
            prefetch={false}
            className="order-2 ml-auto inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[var(--accent)] px-4 text-[13px] font-semibold text-white transition hover:opacity-90 md:order-3"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M5 10.5 12 4l7 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-3v5H6a1 1 0 0 1-1-1v-8.5Z" />
            </svg>
            Voltar para o início
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-4 py-6 md:px-6 md:py-8">
        {/* Abertura */}
        <section className="rounded-[24px] border border-[var(--line)] bg-white px-5 py-6 md:px-8 md:py-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-deep)]">Central de Ajuda · NWB Asset</p>
          <h1 className="mt-2 font-[family-name:var(--font-heading)] text-[1.7rem] font-semibold tracking-[-0.04em] text-[var(--ink)] md:text-[2.2rem]">
            Passo a passo de todas as funcionalidades
          </h1>
          <p className="mt-2 max-w-3xl text-[14px] leading-6 text-[var(--muted)]">
            Cada tópico mostra a tela do sistema e o caminho exato — onde clicar, o que preencher e por quê. Use a busca para encontrar um assunto ou abra as seções abaixo.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {AJUDA_SECOES.map((secao) => (
              <a
                key={secao.id}
                href={`#secao-${secao.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[#fafafa] px-3.5 py-2 text-[12.5px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]"
              >
                <span className="text-[var(--accent-deep)] [&>svg]:h-4 [&>svg]:w-4">{renderAdminIcon(secao.icone)}</span>
                {secao.titulo}
                <span className="rounded-full bg-[rgba(17,24,39,0.06)] px-1.5 py-0.5 text-[10px] tabular-nums text-[var(--muted)]">{secao.topicos.length}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Barra de resultados / controles */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[var(--muted)]" aria-live="polite">
            {chave ? (
              <>
                <span className="font-semibold text-[var(--ink)]">{totalResultados}</span> resultado(s) para “{termo.trim()}”
              </>
            ) : (
              <>
                <span className="font-semibold text-[var(--ink)]">{totalResultados}</span> tópicos em {AJUDA_SECOES.length} seções
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={expandirTudo} className="inline-flex h-8 items-center rounded-full border border-[var(--line)] bg-white px-3 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]">
              Expandir tudo
            </button>
            <button type="button" onClick={recolherTudo} className="inline-flex h-8 items-center rounded-full border border-[var(--line)] bg-white px-3 text-[12px] font-semibold text-[var(--ink)] transition hover:border-[var(--accent)] hover:text-[var(--accent-deep)]">
              Recolher tudo
            </button>
          </div>
        </div>

        {/* Seções e tópicos */}
        {secoesFiltradas.length ? (
          <div className="mt-4 space-y-8">
            {secoesFiltradas.map((secao) => (
              <section key={secao.id} id={`secao-${secao.id}`} className="scroll-mt-32">
                <div className="mb-3 flex items-start gap-3 px-1">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[var(--accent-soft)] text-[var(--accent-deep)] [&>svg]:h-5 [&>svg]:w-5">
                    {renderAdminIcon(secao.icone)}
                  </span>
                  <div>
                    <h2 className="font-[family-name:var(--font-heading)] text-[1.25rem] font-semibold tracking-[-0.03em] text-[var(--ink)]">{secao.titulo}</h2>
                    <p className="text-[13px] text-[var(--muted)]">{secao.descricao}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {secao.topicos.map((topico) => (
                    <Topico
                      key={topico.id}
                      topico={topico}
                      termo={termo.trim()}
                      aberto={abertos.has(topico.id) || (Boolean(chave) && totalResultados <= 3)}
                      onToggle={() => alternar(topico.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[20px] border border-dashed border-[var(--line)] bg-white px-6 py-12 text-center">
            <p className="text-[15px] font-semibold text-[var(--ink)]">Nenhum tópico encontrado para “{termo.trim()}”.</p>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Tente outra palavra (ex.: etiqueta, transferência, relatório, senha).</p>
          </div>
        )}

        <footer className="mt-10 border-t border-[var(--line)] pt-5 text-center text-[12px] text-[var(--muted)]">
          As capturas de tela são do próprio sistema e podem mostrar dados de demonstração. Dúvidas que não estejam aqui: fale com o administrador da sua empresa.
        </footer>
      </main>
    </div>
  );
}
