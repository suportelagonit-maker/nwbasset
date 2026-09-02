'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toFriendlyError } from '@/lib/feedback-message';

type LoginPayload = {
  email: string;
  password: string;
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      reset?: (widgetId: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

const CAPTCHA_ENABLED = ['1', 'true', 'yes', 'on'].includes(
  String(process.env.NEXT_PUBLIC_LOGIN_CAPTCHA_ENABLED ?? '')
    .trim()
    .toLowerCase(),
);
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export default function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [form, setForm] = useState<LoginPayload>({
    email: 'admin@nwbasset.local',
    password: 'NwbAsset@123',
  });
  const captchaContainerRef = useRef<HTMLDivElement | null>(null);
  const captchaWidgetIdRef = useRef<string | null>(null);
  const friendlyError = error ? toFriendlyError(error) : null;

  useEffect(() => {
    if (!CAPTCHA_ENABLED) {
      return;
    }

    if (!TURNSTILE_SITE_KEY) {
      setCaptchaError('CAPTCHA nao configurado no frontend.');
      return;
    }

    let cancelled = false;

    const renderCaptcha = () => {
      if (cancelled || !captchaContainerRef.current || !window.turnstile || captchaWidgetIdRef.current) {
        return;
      }

      captchaWidgetIdRef.current = window.turnstile.render(captchaContainerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'light',
        callback: (token) => {
          setCaptchaToken(token);
          setCaptchaError(null);
        },
        'expired-callback': () => {
          setCaptchaToken('');
          setCaptchaError('Captcha expirado. Valide novamente.');
        },
        'error-callback': () => {
          setCaptchaToken('');
          setCaptchaError('Falha ao carregar captcha. Tente novamente.');
        },
      });
    };

    if (window.turnstile) {
      renderCaptcha();
    } else {
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="1"]');

      if (existingScript) {
        existingScript.addEventListener('load', renderCaptcha, { once: true });
      } else {
        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.dataset.turnstileScript = '1';
        script.addEventListener('load', renderCaptcha, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (captchaWidgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(captchaWidgetIdRef.current);
      }
      captchaWidgetIdRef.current = null;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (CAPTCHA_ENABLED) {
      if (!TURNSTILE_SITE_KEY) {
        setError('CAPTCHA nao configurado no sistema.');
        return;
      }

      if (!captchaToken) {
        setError('Confirme o captcha para continuar.');
        return;
      }
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...form,
        device_name: 'nwbasset-web',
        captcha_token: CAPTCHA_ENABLED ? captchaToken : undefined,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          message?: string;
          empresa_id?: number | null;
        }
      | null;

    if (!response.ok) {
      setError(payload?.message ?? 'Nao foi possivel autenticar no NWB Asset.');

      if (CAPTCHA_ENABLED && captchaWidgetIdRef.current && window.turnstile?.reset) {
        window.turnstile.reset(captchaWidgetIdRef.current);
        setCaptchaToken('');
      }

      return;
    }

    const targetEmpresaParam =
      typeof payload?.empresa_id === 'number' && payload.empresa_id > 0
        ? `?empresa_id=${payload.empresa_id}`
        : '';
    const targetUrl = `/dashboard/patrimonio${targetEmpresaParam}`;

    startTransition(() => {
      router.push(targetUrl);
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
          Informe e-mail e senha. O sistema identifica automaticamente o usuario e a empresa vinculada ao acesso.
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

      {CAPTCHA_ENABLED ? (
        <div className="mt-4 grid gap-2 text-sm font-medium text-[var(--muted)]">
          <span>Validacao humana</span>
          <div
            ref={captchaContainerRef}
            className="min-h-[66px] rounded-2xl border border-[var(--line)] bg-white/90 p-2"
          />
          {captchaError ? <p className="text-xs text-[var(--rose)]">{captchaError}</p> : null}
        </div>
      ) : null}

      {friendlyError ? (
        <div className="mt-4 rounded-2xl border border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] px-4 py-3 text-sm text-[var(--rose)]">
          <p className="font-semibold">{friendlyError.title}</p>
          <p className="mt-1">{friendlyError.text}</p>
          {friendlyError.help ? <p className="mt-1 text-xs opacity-80">{friendlyError.help}</p> : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending || (CAPTCHA_ENABLED && !captchaToken)}
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-white transition hover:bg-[var(--accent-deep)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  );
}
