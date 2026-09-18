import Image from 'next/image';
import { redirect } from 'next/navigation';

import LoginForm from '@/components/LoginForm';
import NwbIdLogin from '@/components/NwbIdLogin';
import { API_BASE_URL } from '@/lib/api-base';
import type { NwbIdConfig } from '@/lib/nwbid';
import { getAuthSession } from '@/lib/auth-session';

const CONFIG_PADRAO: NwbIdConfig = { habilitado: false, issuer: '', cliente: 'nwb-asset', sistema: 'nwb-asset', login_senha: true };

/** Configuração do NWB ID lida do backend em tempo de execução (sem rebuild ao mudar o .env). */
async function carregarConfigNwbId(): Promise<NwbIdConfig> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/nwbid/config`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const payload = (await response.json().catch(() => null)) as { data?: Partial<NwbIdConfig> } | null;
    return response.ok && payload?.data ? { ...CONFIG_PADRAO, ...payload.data } : CONFIG_PADRAO;
  } catch {
    return CONFIG_PADRAO;
  }
}

export default async function LoginPage() {
  const session = await getAuthSession();
  const nwbid = await carregarConfigNwbId();

  if (session.token) {
    if (session.empresaId || session.dashboardScope === 'geral') {
      redirect('/dashboard/patrimonio');
    }

    redirect('/selecionar-empresa');
  }

  return (
    <main className="auth-art-page flex min-h-screen items-center justify-center overflow-hidden px-4 py-6 sm:py-10">
      <div className="auth-art-mesh" aria-hidden="true" />
      <div className="auth-art-orb auth-art-orb--one" aria-hidden="true" />
      <div className="auth-art-orb auth-art-orb--two" aria-hidden="true" />

      <div className="relative z-[1] grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="px-2">
          <div className="mb-5">
            <Image
              src="/logoasset.png"
              alt="NWB Asset"
              width={220}
              height={72}
              priority
              className="h-auto w-[180px] object-contain md:w-[220px]"
            />
          </div>
          <span className="inline-flex rounded-full border border-[rgba(246,164,0,0.22)] bg-white/78 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--accent-deep)]">
            ERP Patrimonial SaaS
          </span>
          <h1 className="mt-5 font-[family-name:var(--font-heading)] text-3xl font-semibold tracking-tight sm:text-4xl md:text-6xl">
            Controle patrimonial com autenticação por empresa e permissão por papel.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
            O painel administrativo agora utiliza token da API Laravel, contexto ativo de empresa e autorização por
            perfil para dashboard, relatórios, bens, inventários e depreciação.
          </p>
        </section>

        <div className="flex w-full flex-col items-center gap-4 lg:items-end">
          <NwbIdLogin config={nwbid} />
          {nwbid.login_senha ? (
            <>
              {nwbid.habilitado ? (
                <p className="w-full max-w-md text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">ou com e-mail e senha</p>
              ) : null}
              <LoginForm />
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}

