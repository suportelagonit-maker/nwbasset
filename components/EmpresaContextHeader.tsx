'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type EmpresaOption = {
  id: number;
  nome_fantasia: string;
  cnpj?: string | null;
  logo_url?: string | null;
  perfil?: string | null;
};

type EmpresaContextHeaderProps = {
  isSuperAdmin?: boolean;
  empresas?: EmpresaOption[];
  empresaAtualId?: number | null;
  dashboardScope?: 'empresa' | 'geral';
};

export default function EmpresaContextHeader({
  isSuperAdmin = false,
  empresas = [],
  empresaAtualId = null,
  dashboardScope = 'empresa',
}: EmpresaContextHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);
  const [empresaId, setEmpresaId] = useState(
    dashboardScope === 'geral' ? '__geral__' : empresaAtualId ? String(empresaAtualId) : '',
  );
  const [error, setError] = useState<string | null>(null);

  const canSwitchEmpresa = useMemo(
    () => isSuperAdmin || empresas.length > 1,
    [empresas.length, isSuperAdmin],
  );

  async function handleEmpresaChange(nextValue: string) {
    setEmpresaId(nextValue);
    setError(null);
    setIsNavigating(true);

    const empresaSelecionada = empresas.find((empresa) => empresa.id === Number(nextValue));

    const response = await fetch('/api/auth/empresa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(
        nextValue === '__geral__'
          ? { escopo: 'geral', empresas, is_super_admin: isSuperAdmin }
          : {
              escopo: 'empresa',
              empresa_id: Number(nextValue),
              empresa_nome_fantasia: empresaSelecionada?.nome_fantasia ?? '',
              empresa_cnpj: empresaSelecionada?.cnpj ?? '',
              empresa_logo_url: empresaSelecionada?.logo_url ?? '',
              empresas,
              is_super_admin: isSuperAdmin,
            },
      ),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? 'Não foi possível trocar a empresa ativa.');
      setIsNavigating(false);
      return;
    }

    startTransition(() => {
      router.replace('/dashboard/patrimonio');
      router.refresh();
    });

    setIsNavigating(false);
  }

  if (!canSwitchEmpresa) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center justify-center gap-3">
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Selecione uma Empresa
      </span>
      <select
        value={empresaId}
        onChange={(event) => void handleEmpresaChange(event.target.value)}
        disabled={isPending || isNavigating}
        className="h-10 min-w-[280px] rounded-full border border-[var(--line)] bg-white px-4 text-sm text-[var(--ink)] shadow-none outline-none transition focus:border-[rgba(246,164,0,0.45)]"
      >
        {isSuperAdmin ? <option value="__geral__">Painel geral</option> : null}
        {empresas.map((empresa) => (
          <option key={empresa.id} value={empresa.id}>
            {empresa.nome_fantasia}
          </option>
        ))}
      </select>
      {isPending || isNavigating ? (
        <span
          aria-label="Alterando empresa"
          className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-[rgba(246,164,0,0.16)] border-t-[var(--accent)]"
        />
      ) : null}
      {error ? <span className="hidden text-xs text-[var(--rose)] xl:block">{error}</span> : null}
    </div>
  );
}
