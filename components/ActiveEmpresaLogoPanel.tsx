'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type EmpresaOption = {
  id: number;
  nome_fantasia: string;
  cnpj?: string | null;
  logo_url?: string | null;
  perfil?: string | null;
};

type ActiveEmpresaLogoPanelProps = {
  empresaId: number | null;
  empresaNome?: string | null;
  empresaCnpj?: string | null;
  empresaLogoUrl?: string | null;
  empresas?: EmpresaOption[];
  isSuperAdmin?: boolean;
};

function formatCnpj(value?: string | null): string {
  const digits = String(value ?? '').replace(/\D/g, '');

  if (digits.length !== 14) {
    return value?.trim() ?? '';
  }

  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export default function ActiveEmpresaLogoPanel({
  empresaId,
  empresaNome,
  empresaCnpj,
  empresaLogoUrl,
  empresas = [],
  isSuperAdmin = false,
}: ActiveEmpresaLogoPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(empresaLogoUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const empresaSelecionada = useMemo(
    () => empresas.find((empresa) => empresa.id === empresaId) ?? null,
    [empresaId, empresas],
  );

  useEffect(() => {
    setPreviewUrl(empresaLogoUrl ?? null);
  }, [empresaLogoUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!empresaId) {
    return (
      <article className="panel-surface rounded-[24px] p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Logo da empresa</p>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Selecione uma empresa no topo para gerenciar o logo exibido no painel e nas etiquetas patrimoniais.
        </p>
      </article>
    );
  }

  async function syncEmpresaContext(nextLogoUrl: string | null) {
    const empresasAtualizadas = empresas.map((empresa) =>
      empresa.id === empresaId
        ? {
            ...empresa,
            logo_url: nextLogoUrl,
          }
        : empresa,
    );

    const response = await fetch('/api/auth/empresa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        escopo: 'empresa',
        empresa_id: empresaId,
        empresa_nome_fantasia: empresaNome ?? empresaSelecionada?.nome_fantasia ?? '',
        empresa_cnpj: empresaCnpj ?? empresaSelecionada?.cnpj ?? '',
        empresa_logo_url: nextLogoUrl ?? '',
        empresas: empresasAtualizadas,
        is_super_admin: isSuperAdmin,
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new Error(payload?.message ?? 'Não foi possível atualizar o contexto da empresa.');
    }
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError('Selecione um arquivo de logo antes de enviar.');
      return;
    }

    setError(null);
    setMessage(null);

    const formData = new FormData();
    formData.append('logo', selectedFile);

    try {
      const response = await fetch(`/api/admin/empresas/${empresaId}/logo`, {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            data?: { logo_url?: string | null };
            message?: string;
            errors?: Record<string, string[]>;
          }
        | null;

      if (!response.ok || !payload?.data) {
        const firstError = payload?.errors ? Object.values(payload.errors).flat().find(Boolean) : null;
        throw new Error(firstError ?? payload?.message ?? 'Não foi possível enviar o logo da empresa.');
      }

      const nextLogoUrl = payload.data.logo_url ?? null;
      await syncEmpresaContext(nextLogoUrl);
      setSelectedFile(null);
      setPreviewUrl(nextLogoUrl);
      setMessage('Logo da empresa atualizado com sucesso.');

      startTransition(() => {
        router.refresh();
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar o logo da empresa.');
    }
  }

  async function handleRemove() {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/empresas/${empresaId}/logo`, {
        method: 'DELETE',
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            data?: { logo_url?: string | null };
            message?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Não foi possível remover o logo da empresa.');
      }

      await syncEmpresaContext(null);
      setSelectedFile(null);
      setPreviewUrl(null);
      setMessage('Logo da empresa removido com sucesso.');

      startTransition(() => {
        router.refresh();
      });
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Não foi possível remover o logo da empresa.');
    }
  }

  function handleFileChange(file: File | null) {
    if (previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setError(null);
    setMessage(null);
    setPreviewUrl(file ? URL.createObjectURL(file) : empresaLogoUrl ?? null);
  }

  return (
    <article className="panel-surface rounded-[24px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Logo da empresa</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">{empresaNome ?? 'Empresa ativa'}</h3>
          {empresaCnpj ? <p className="mt-1 text-sm text-[var(--muted)]">{formatCnpj(empresaCnpj)}</p> : null}
        </div>
        <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border border-[var(--line)] bg-white px-3">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={`Logo de ${empresaNome ?? 'empresa ativa'}`}
              width={96}
              height={40}
              className="h-auto max-h-[40px] w-auto max-w-full object-contain"
              unoptimized
            />
          ) : (
            <span className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
              Sem logo
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-dashed border-[var(--line)] bg-[#fcfdff] p-4">
        <p className="text-[13px] leading-6 text-[var(--muted)]">
          Este logo aparece no topo do sistema para a empresa selecionada e também pode ser usado na etiqueta patrimonial.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            id={`empresa-logo-input-${empresaId}`}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
          />
          <label htmlFor={`empresa-logo-input-${empresaId}`} className="admin-btn-secondary cursor-pointer">
            {previewUrl ? 'Trocar logo' : 'Selecionar logo'}
          </label>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isPending || !selectedFile}
            className="admin-btn-primary disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? 'Salvando...' : 'Salvar logo'}
          </button>
          {previewUrl ? (
            <button
              type="button"
              onClick={() => void handleRemove()}
              disabled={isPending}
              className="admin-btn-secondary disabled:cursor-not-allowed disabled:opacity-70"
            >
              Remover logo
            </button>
          ) : null}
        </div>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-[rgba(22,163,74,0.16)] bg-[rgba(22,163,74,0.08)] px-4 py-3 text-sm text-[rgb(21,128,61)]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
          {error}
        </div>
      ) : null}
    </article>
  );
}
