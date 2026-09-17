'use client';

import { useMemo } from 'react';

import { useResolvedLogoSrc } from '@/hooks/use-resolved-logo-src';
import { buildEmpresaLogoCandidates } from '@/lib/empresa-logo';

type ActiveEmpresaHeaderProps = {
  empresaId?: number | null;
  empresaNome?: string | null;
  empresaCnpj?: string | null;
  empresaLogoUrl?: string | null;
};

function formatCnpj(value?: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (digits.length !== 14) {
    return value?.trim() ?? '';
  }

  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export default function ActiveEmpresaHeader({
  empresaId,
  empresaNome,
  empresaCnpj,
  empresaLogoUrl,
}: ActiveEmpresaHeaderProps) {
  const logoCandidates = useMemo(
    () =>
      buildEmpresaLogoCandidates({
        empresaLogoUrl,
        empresaId,
        empresaNome,
      }),
    [empresaId, empresaLogoUrl, empresaNome],
  );
  const currentLogoSrc = useResolvedLogoSrc(logoCandidates, '/logoasset.png');

  if (!empresaNome) {
    return null;
  }

  return (
    <div className="flex min-w-0 max-w-[210px] items-center justify-end gap-2 text-right sm:max-w-[320px] sm:gap-3">
      {currentLogoSrc ? (
        <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden px-1 sm:h-14 sm:w-20">
          <img
            src={currentLogoSrc}
            alt={`Logo de ${empresaNome}`}
            className="h-auto max-h-[32px] w-auto max-w-full object-contain sm:max-h-[40px]"
            loading="eager"
          />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[12px] font-semibold leading-4 text-[var(--ink)] sm:text-[13px]">{empresaNome}</p>
        {empresaCnpj ? <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{formatCnpj(empresaCnpj)}</p> : null}
      </div>
    </div>
  );
}


