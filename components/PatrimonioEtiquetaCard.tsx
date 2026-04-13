'use client';

import { useMemo } from 'react';

import PatrimonioBarcode from '@/components/PatrimonioBarcode';
import { useResolvedLogoSrc } from '@/hooks/use-resolved-logo-src';
import { buildEmpresaLogoCandidates } from '@/lib/empresa-logo';

type PatrimonioEtiquetaCardProps = {
  numeroPlaqueta: string;
  barcodeValue: string;
  empresaId?: number | null;
  empresaNome?: string | null;
  logoSrc?: string | null;
  className?: string;
};

export default function PatrimonioEtiquetaCard({
  numeroPlaqueta,
  barcodeValue,
  empresaId,
  empresaNome,
  logoSrc,
  className = '',
}: PatrimonioEtiquetaCardProps) {
  const logoCandidates = useMemo(
    () =>
      buildEmpresaLogoCandidates({
        empresaLogoUrl: logoSrc,
        empresaId,
        empresaNome,
      }),
    [empresaId, empresaNome, logoSrc],
  );
  const currentLogoSrc = useResolvedLogoSrc(logoCandidates);

  const normalizedName = String(empresaNome ?? '')
    .replace(/^igreja\s+/i, '')
    .trim();
  const wordmark = normalizedName
    ? normalizedName
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.toLowerCase())
    : ['nwb', 'asset'];

  return (
    <article
      className={`flex h-[112px] w-[250px] overflow-hidden rounded-[12px] border border-[#d2d7e1] bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.06)] ${className}`.trim()}
    >
      <div className="flex w-[52%] flex-col justify-center border-r border-[rgba(15,23,42,0.08)] pr-3">
        {currentLogoSrc ? (
          <img
            src={currentLogoSrc}
            alt={empresaNome ? `Logo ${empresaNome}` : 'Logo da empresa'}
            className="h-auto w-full object-contain"
            loading="eager"
          />
        ) : (
          <div className="flex flex-col justify-center leading-none text-[#101828]">
            <span className="text-[15px] font-black uppercase tracking-[-0.08em]">{wordmark[0] ?? 'nwb'}</span>
            <span className="-mt-0.5 text-[15px] font-black uppercase tracking-[-0.08em]">{wordmark[1] ?? 'asset'}</span>
          </div>
        )}
      </div>

      <div className="flex w-[48%] flex-col justify-between pl-3">
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#101828]">patrimonio</p>
        </div>

        <div className="overflow-hidden">
          <PatrimonioBarcode value={barcodeValue} className="h-[38px] w-full" height={36} width={1.1} />
        </div>

        <p className="text-right text-[22px] font-black leading-none tracking-[0.08em] text-[#101828]">
          {numeroPlaqueta}
        </p>
      </div>
    </article>
  );
}


