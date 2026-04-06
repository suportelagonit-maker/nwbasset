'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toFriendlyError } from '@/lib/feedback-message';

type EmpresaOption = {
  id: number;
  nome_fantasia: string;
  cnpj?: string | null;
  logo_url?: string | null;
  perfil?: string | null;
};

type AuthMePayload = {
  data?: {
    nome?: string;
    email?: string;
    is_super_admin?: boolean;
    empresas?: EmpresaOption[];
  };
  message?: string;
};

export default function EmpresaSelectionForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const friendlyError = error ? toFriendlyError(error) : null;

  useEffect(() => {
    void loadContext();
  }, []);

  async function loadContext() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => null)) as AuthMePayload | null;

      if (response.status === 401) {
        router.push('/api/auth/logout');
        return;
      }

      if (!response.ok) {
        setError(payload?.message ?? 'Não foi possível carregar as empresas do usuário.');
        return;
      }

      const allowedEmpresas = payload?.data?.empresas ?? [];
      setEmpresas(allowedEmpresas);
      setIsSuperAdmin(Boolean(payload?.data?.is_super_admin));
      setUserName(String(payload?.data?.nome ?? ''));
      setUserEmail(String(payload?.data?.email ?? ''));
      setEmpresaId(
        Boolean(payload?.data?.is_super_admin) || allowedEmpresas.length > 1
          ? '__geral__'
          : (allowedEmpresas[0] ? String(allowedEmpresas[0].id) : ''),
      );
    } catch {
      setError('Não foi possível carregar as empresas do usuário.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!empresaId) {
      setError('Selecione uma empresa para continuar.');
      return;
    }

    setError(null);

    const empresaSelecionada = empresas.find((empresa) => empresa.id === Number(empresaId));

    const response = await fetch('/api/auth/empresa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(
        empresaId === '__geral__'
          ? { escopo: 'geral', empresas, is_super_admin: isSuperAdmin }
          : {
              escopo: 'empresa',
              empresa_id: Number(empresaId),
              empresa_nome_fantasia: empresaSelecionada?.nome_fantasia ?? '',
              empresa_cnpj: empresaSelecionada?.cnpj ?? '',
              empresa_logo_url: empresaSelecionada?.logo_url ?? '',
              empresas,
              is_super_admin: isSuperAdmin,
            },
      ),
    });

    if (response.status === 401) {
      router.push('/api/auth/logout');
      return;
    }

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? 'Não foi possível aplicar a empresa selecionada.');
      return;
    }

    startTransition(() => {
      router.push('/dashboard/patrimonio');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel-surface relative w-full max-w-md rounded-[28px] p-6 md:p-7">
      <Link
        href="/api/auth/logout"
        className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(246,164,0,0.18)] bg-white text-[var(--accent-deep)] transition hover:border-[rgba(246,164,0,0.38)] hover:bg-[rgba(246,164,0,0.08)]"
        aria-label="Sair do sistema"
        title="Sair do sistema"
      >
        <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M12 3v9" />
          <path d="M7.05 5.05a8 8 0 1 0 9.9 0" />
        </svg>
      </Link>

      <div>
        <div className="mb-4">
          <Image
            src="/logoasset.png"
            alt="NWB Asset"
            width={202}
            height={65}
            priority
            className="h-auto w-[168px] object-contain"
          />
        </div>
        <span className="inline-flex rounded-full border border-[rgba(246,164,0,0.22)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
          Selecionar empresa
        </span>
        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">
          Escolha a empresa ativa
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {isSuperAdmin
            ? 'Perfil global. Escolha a empresa que deseja administrar neste acesso.'
            : 'Escolha a empresa permitida para continuar no painel patrimonial.'}
        </p>
      </div>

      <div className="mt-5 rounded-[22px] border border-[var(--line)] bg-[#fafafa] px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Usuário autenticado</p>
        <p className="mt-2 text-[14px] font-semibold text-[var(--ink)]">{userName || userEmail || 'Usuário'}</p>
        {userEmail ? <p className="mt-1 text-[12px] text-[var(--muted)]">{userEmail}</p> : null}
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
          Empresa
          <select
            value={empresaId}
            onChange={(event) => setEmpresaId(event.target.value)}
            disabled={loading || isPending}
            className="admin-select"
          >
            <option value="">Selecione</option>
            {isSuperAdmin || empresas.length > 1 ? <option value="__geral__">Painel geral - todas as empresas</option> : null}
            {empresas.map((empresa) => (
              <option key={empresa.id} value={empresa.id}>
                {empresa.nome_fantasia}
                {empresa.perfil ? ` - ${empresa.perfil}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      {friendlyError ? (
        <div className="mt-4 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
          <p className="font-semibold">{friendlyError.title}</p>
          <p className="mt-1">{friendlyError.text}</p>
          {friendlyError.help ? <p className="mt-1 text-xs opacity-80">{friendlyError.help}</p> : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || loading || !empresaId}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}


