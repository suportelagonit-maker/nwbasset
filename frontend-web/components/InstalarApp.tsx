'use client';

import { useEffect, useState } from 'react';

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Convite para instalar o NWB Asset como aplicativo.
 *
 * No Android/Chrome o navegador avisa quando a instalação é possível
 * (`beforeinstallprompt`) e o botão dispara o convite nativo. O iPhone não
 * tem esse evento: ali mostramos como fazer pelo menu Compartilhar.
 */
export default function InstalarApp({ className = '' }: { className?: string }) {
  const [prompt, setPrompt] = useState<PromptInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);
  const [ajudaIos, setAjudaIos] = useState(false);

  useEffect(() => {
    const jaInstalado =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalado(jaInstalado);
    setIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    /* O evento costuma chegar antes deste componente montar; o script do
       layout o guarda em window.__nwbInstalacao e avisa por "nwb:instalacao". */
    const guardado = () =>
      (window as Window & { __nwbInstalacao?: PromptInstalacao | null }).__nwbInstalacao ?? null;

    setPrompt(guardado());

    const aoGuardar = () => setPrompt(guardado());
    const aoPoderInstalar = (evento: Event) => {
      evento.preventDefault();
      setPrompt(evento as PromptInstalacao);
    };
    const aoInstalar = () => {
      setInstalado(true);
      setPrompt(null);
    };

    window.addEventListener('nwb:instalacao', aoGuardar);
    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    window.addEventListener('appinstalled', aoInstalar);
    return () => {
      window.removeEventListener('nwb:instalacao', aoGuardar);
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  if (instalado || (!prompt && !ios)) {
    return null;
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            const escolha = await prompt.userChoice;
            if (escolha.outcome === 'accepted') {
              setInstalado(true);
            }
            setPrompt(null);
            (window as Window & { __nwbInstalacao?: PromptInstalacao | null }).__nwbInstalacao = null;
            return;
          }
          setAjudaIos((atual) => !atual);
        }}
        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[var(--ink)]"
      >
        <svg aria-hidden="true" className="h-5 w-5 text-[var(--accent-deep)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
          <path d="M12 7v7M9 11.5l3 3 3-3" />
        </svg>
        Instalar aplicativo
      </button>

      {ajudaIos ? (
        <p className="px-4 pb-3 text-[12px] leading-5 text-[var(--muted)]">
          No iPhone: toque em <strong>Compartilhar</strong> (o quadrado com a seta, na barra do Safari) e escolha{' '}
          <strong>Adicionar à Tela de Início</strong>.
        </p>
      ) : null}
    </div>
  );
}
