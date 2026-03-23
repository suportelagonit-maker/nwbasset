'use client';

type SystemFeedbackStackProps = {
  error?: string | null;
  message?: string | null;
  errorTitle?: string | null;
  messageTitle?: string | null;
  onCloseError?: () => void;
  onCloseMessage?: () => void;
};

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function FeedbackCard({
  tone,
  title,
  text,
  onClose,
}: {
  tone: 'success' | 'error';
  title: string;
  text: string;
  onClose?: () => void;
}) {
  return (
    <div
      className={`pointer-events-auto w-full max-w-[360px] rounded-[20px] border px-4 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)] ${
        tone === 'success'
          ? 'border-[rgba(34,197,94,0.15)] bg-white text-[var(--ink)]'
          : 'border-[rgba(225,29,72,0.15)] bg-white text-[var(--ink)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
            tone === 'success' ? 'bg-[rgba(34,197,94,0.12)] text-[var(--mint-deep)]' : 'bg-[rgba(225,29,72,0.1)] text-[var(--rose)]'
          }`}
        >
          {tone === 'success' ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="m5 12 4.2 4.2L19 6.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
              <path d="M12 8v5" />
              <circle cx="12" cy="16.5" r=".7" fill="currentColor" stroke="none" />
              <path d="M10.3 3.9 2.9 17a1.3 1.3 0 0 0 1.1 2h16a1.3 1.3 0 0 0 1.1-2L13.7 3.9a1.3 1.3 0 0 0-2.4 0Z" />
            </svg>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[var(--ink)]">{text}</p>
        </div>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--muted)] transition hover:border-[var(--blue)] hover:text-[var(--blue)]"
            aria-label="Fechar mensagem"
          >
            <CloseIcon />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function SystemFeedbackStack({
  error,
  message,
  errorTitle,
  messageTitle,
  onCloseError,
  onCloseMessage,
}: SystemFeedbackStackProps) {
  if (!error && !message) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[140] flex w-[min(92vw,380px)] flex-col gap-3">
      {message ? <FeedbackCard tone="success" title={messageTitle ?? 'Operacao concluida'} text={message} onClose={onCloseMessage} /> : null}
      {error ? <FeedbackCard tone="error" title={errorTitle ?? 'Atencao'} text={error} onClose={onCloseError} /> : null}
    </div>
  );
}
