'use client';

import Image from 'next/image';

import { formatarData, formatarDataHora, type TermoAceite, type TermoUsoData } from '@/lib/termo-uso';

/** Carimbo do aceite eletrônico: quem, quando, de onde e qual texto. */
export function CarimboAceite({ aceite, compacto = false }: { aceite: TermoAceite; compacto?: boolean }) {
  return (
    <div
      className={[
        'termo-carimbo inline-block rounded-[12px] border-[3px] border-[#15803d] bg-[rgba(74,222,128,0.08)] text-[#14532d]',
        compacto ? 'px-3 py-2' : '-rotate-2 px-5 py-3.5',
      ].join(' ')}
      aria-label={`Aceito eletronicamente por ${aceite.nome_usuario} em ${formatarDataHora(aceite.aceito_em)}`}
    >
      <p className={['font-bold uppercase tracking-[0.22em]', compacto ? 'text-[9px]' : 'text-[11px]'].join(' ')}>✓ Aceito eletronicamente</p>
      <p className={['mt-1 font-[family-name:var(--font-heading)] font-semibold tracking-[-0.02em]', compacto ? 'text-[13px]' : 'text-[17px]'].join(' ')}>
        {aceite.nome_usuario}
      </p>
      <p className={['tabular-nums', compacto ? 'text-[11px]' : 'text-[13px]'].join(' ')}>{formatarDataHora(aceite.aceito_em)}</p>
      <p className={['mt-0.5 opacity-80', compacto ? 'text-[9px]' : 'text-[10px]'].join(' ')}>
        Versão {aceite.versao}
        {aceite.ip ? ` · IP ${aceite.ip}` : ''}
        {!compacto ? ` · Hash ${aceite.hash_conteudo.slice(0, 12)}…` : ''}
      </p>
    </div>
  );
}

/**
 * O documento do termo, como aparece na tela de aceite, no perfil e na
 * impressão: cabeçalho, texto vigente e — quando aceito — o carimbo.
 */
export default function TermoDocumento({ termo, aceite }: { termo: TermoUsoData; aceite?: TermoAceite | null }) {
  return (
    <article className="termo-documento rounded-[20px] border border-[var(--line)] bg-white">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-5 md:px-8">
        <div className="min-w-0">
          <Image src="/logoasset.png" alt="NWB Asset" width={150} height={40} className="h-auto w-[120px] object-contain" />
          <h1 className="mt-3 font-[family-name:var(--font-heading)] text-[1.25rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--ink)] md:text-[1.5rem]">
            {termo.titulo}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--muted)]">
            Versão {termo.versao} · publicada em {formatarData(termo.publicado_em)} · identificador {termo.hash.slice(0, 12)}…
          </p>
        </div>
        {aceite ? <CarimboAceite aceite={aceite} compacto /> : null}
      </header>

      <div
        className="termo-conteudo px-5 py-5 text-[14px] leading-7 text-[#2b3038] md:px-8 md:py-7"
        // O HTML vem do próprio backend (resources/termos), não de entrada de usuário.
        dangerouslySetInnerHTML={{ __html: termo.conteudo_html }}
      />

      <footer className="border-t border-[var(--line)] px-5 py-6 md:px-8">
        {aceite ? (
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="text-[12px] leading-5 text-[var(--muted)]">
              <p className="font-semibold uppercase tracking-[0.14em]">Registro do aceite</p>
              <p className="mt-1">
                <span className="font-semibold text-[var(--ink)]">{aceite.nome_usuario}</span> ({aceite.email_usuario}) aceitou a versão {aceite.versao} deste termo em{' '}
                <span className="font-semibold text-[var(--ink)]">{formatarDataHora(aceite.aceito_em)}</span>
                {aceite.ip ? ` a partir do endereço IP ${aceite.ip}` : ''}.
              </p>
              <p className="mt-1 break-all font-mono text-[10px]">Hash SHA-256 do texto aceito: {aceite.hash_conteudo}</p>
            </div>
            <CarimboAceite aceite={aceite} />
          </div>
        ) : (
          <p className="text-[12px] text-[var(--muted)]">Documento ainda não aceito por este usuário.</p>
        )}
      </footer>
    </article>
  );
}
