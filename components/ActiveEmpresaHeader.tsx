'use client';

import Image from 'next/image';

type ActiveEmpresaHeaderProps = {
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

export default function ActiveEmpresaHeader({ empresaNome, empresaCnpj, empresaLogoUrl }: ActiveEmpresaHeaderProps) {
  if (!empresaNome) {
    return null;
  }

  return (
    <div className="flex min-w-0 max-w-[320px] items-center justify-end gap-3 text-right">
      {empresaLogoUrl ? (
        <div className="flex h-14 w-20 shrink-0 items-center justify-center overflow-hidden px-1">
          <Image
            src={empresaLogoUrl}
            alt={`Logo de ${empresaNome}`}
            width={80}
            height={40}
            className="h-auto max-h-[40px] w-auto max-w-full object-contain"
            unoptimized
          />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold leading-4 text-[var(--ink)]">{empresaNome}</p>
        {empresaCnpj ? <p className="mt-0.5 truncate text-[10px] text-[var(--muted)]">{formatCnpj(empresaCnpj)}</p> : null}
      </div>
    </div>
  );
}
