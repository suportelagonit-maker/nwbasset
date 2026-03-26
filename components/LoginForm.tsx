'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type LoginPayload = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<LoginPayload>({
    email: 'admin@nwbasset.local',
    password: 'NwbAsset@123',
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...form,
        device_name: 'nwbasset-web',
      }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? 'Não foi possível autenticar no NWB Asset.');
      return;
    }

    startTransition(() => {
      router.push('/selecionar-empresa');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel-surface w-full max-w-md rounded-[28px] p-6 md:p-7">
      <div>
        <span className="inline-flex rounded-full border border-[rgba(246,164,0,0.22)] bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">
          Login multiempresa
        </span>
        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight">
          Acesso ao painel patrimonial
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Informe e-mail e senha. O sistema identifica automaticamente o usuário e a empresa vinculada ao acesso.
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
          E-mail
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            className="h-12 rounded-2xl border border-[var(--line)] bg-white/90 px-4 text-[var(--ink)] outline-none"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
          Senha
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            className="h-12 rounded-2xl border border-[var(--line)] bg-white/90 px-4 text-[var(--ink)] outline-none"
          />
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}


