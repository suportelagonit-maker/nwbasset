'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type EmpresaOption = {
  id: number;
  nome_fantasia: string;
  perfil?: string | null;
};

type AuthMePayload = {
  data?: {
    is_super_admin?: boolean;
    empresas?: EmpresaOption[];
    empresa_atual?: {
      id?: number;
    };
  };
  message?: string;
};

type EmpresasPayload = {
  data?: EmpresaOption[];
  message?: string;
};

export default function EmpresaSelector() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [empresaId, setEmpresaId] = useState('');
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/users') && !pathname.startsWith('/permissoes')) {
      return;
    }

    void loadSessionContext();
  }, [pathname]);

  useEffect(() => {
    const currentEmpresa = searchParams.get('empresa_id');

    if (currentEmpresa) {
      setEmpresaId(currentEmpresa);
    }
  }, [searchParams]);

  async function loadSessionContext() {
    setLoading(true);
    setErrorMessage('');

    try {
      const [meResponse, empresasResponse] = await Promise.all([
        fetch('/api/auth/me', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }),
        fetch('/api/empresas?per_page=100', {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        }),
      ]);

      const meBody = (await meResponse.json().catch(() => null)) as AuthMePayload | null;
      const empresasBody = (await empresasResponse.json().catch(() => null)) as EmpresasPayload | null;

      if (meResponse.status === 401 || empresasResponse.status === 401) {
        router.push('/api/auth/logout');
        return;
      }

      const allowedEmpresas = empresasBody?.data?.length ? empresasBody.data : (meBody?.data?.empresas ?? []);
      setEmpresas(allowedEmpresas);
      setIsSuperAdmin(Boolean(meBody?.data?.is_super_admin));

      const currentEmpresaId = Number(searchParams.get('empresa_id') ?? '');
      const empresaAtualId = Number(meBody?.data?.empresa_atual?.id ?? '');
      const defaultEmpresaId = allowedEmpresas[0]?.id ?? null;
      const hasCurrentAccess = allowedEmpresas.some((empresa) => empresa.id === currentEmpresaId);
      const hasEmpresaAtualAccess = allowedEmpresas.some((empresa) => empresa.id === empresaAtualId);
      const nextEmpresaId = hasCurrentAccess
        ? currentEmpresaId
        : hasEmpresaAtualAccess
          ? empresaAtualId
          : defaultEmpresaId;

      if (nextEmpresaId) {
        setEmpresaId(String(nextEmpresaId));

        if (!hasCurrentAccess || !searchParams.get('empresa_id')) {
          await applyEmpresa(String(nextEmpresaId), false);
        }
      } else {
        setEmpresaId('');
      }
    } catch {
      setErrorMessage('Não foi possível carregar as empresas disponíveis.');
    } finally {
      setLoading(false);
    }
  }

  async function applyEmpresa(nextEmpresaId?: string, navigate = true) {
    const normalized = (nextEmpresaId ?? empresaId).trim();

    if (!normalized) {
      return;
    }

    setSwitching(true);
    setErrorMessage('');

    let response: Response;

    try {
      response = await fetch('/api/auth/empresa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ empresa_id: Number(normalized) }),
      });
    } catch {
      setSwitching(false);
      setErrorMessage('Não foi possível aplicar a empresa selecionada.');
      return;
    }

    if (response.status === 401) {
      router.push('/api/auth/logout');
      return;
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      setSwitching(false);
      setErrorMessage(body?.message ?? 'Não foi possível aplicar a empresa selecionada.');
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    params.set('empresa_id', normalized);

    if (navigate) {
      router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname);
      router.refresh();
    }

    setSwitching(false);
  }

  const activeEmpresa = useMemo(
    () => empresas.find((empresa) => String(empresa.id) === String(searchParams.get('empresa_id') ?? empresaId)),
    [empresas, searchParams, empresaId],
  );

  if (!pathname.startsWith('/dashboard') && !pathname.startsWith('/users') && !pathname.startsWith('/permissoes')) {
    return null;
  }

  return (
    <div className="admin-filter-surface flex flex-col gap-4 rounded-[24px] px-5 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <label
          className="whitespace-nowrap text-[13px] font-medium leading-none text-[var(--muted)]"
          htmlFor="empresa-selector"
        >
          Empresa ativa
        </label>
        <select
          id="empresa-selector"
          value={empresaId}
          onChange={async (event) => {
            const nextEmpresaId = event.target.value;
            setEmpresaId(nextEmpresaId);
            await applyEmpresa(nextEmpresaId);
          }}
          disabled={loading || switching}
          className="admin-select min-w-[220px] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {empresas.map((empresa) => (
            <option key={empresa.id} value={empresa.id}>
              {empresa.nome_fantasia}
              {empresa.perfil ? ` - ${empresa.perfil}` : ''}
            </option>
          ))}
        </select>
        {empresas.length > 1 ? (
          <span className="text-[12px] text-[var(--muted)]">
            {switching ? 'Aplicando empresa...' : 'Troca automática ao selecionar'}
          </span>
        ) : null}
      </div>

      {errorMessage ? <p className="w-full text-[12px] text-[#c2410c] sm:text-right">{errorMessage}</p> : null}
    </div>
  );
}
