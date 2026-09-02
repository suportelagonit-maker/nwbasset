'use client';

type SystemConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function SystemConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: SystemConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="admin-dialog-overlay">
      <div className="panel-surface admin-dialog-shell overflow-hidden rounded-[24px] p-3 md:p-3.5 shadow-[0_22px_64px_rgba(15,23,42,0.18)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] pb-3">
          <div className="min-w-0">
            <p className="admin-modal-kicker">Confirmacao</p>
            <h3 className="admin-modal-title">{title}</h3>
            <p className="admin-modal-copy max-w-none">{description}</p>
          </div>

          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${
              tone === 'danger'
                ? 'border-[rgba(225,29,72,0.12)] bg-[rgba(225,29,72,0.06)] text-[var(--rose)]'
                : 'border-[rgba(37,99,235,0.12)] bg-[rgba(37,99,235,0.06)] text-[var(--blue)]'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4.5 w-4.5">
              <path d="M12 8v5" />
              <circle cx="12" cy="16.5" r=".7" fill="currentColor" stroke="none" />
              <path d="M10.3 3.9 2.9 17a1.3 1.3 0 0 0 1.1 2h16a1.3 1.3 0 0 0 1.1-2L13.7 3.9a1.3 1.3 0 0 0-2.4 0Z" />
            </svg>
          </span>
        </div>

        <div className="mt-3 rounded-[18px] border border-[var(--line)] bg-[#fafafa] px-3 py-3">
          <p className="text-[12px] leading-5 text-[var(--muted)]">
            {tone === 'danger'
              ? 'Esta acao altera permanentemente o estado atual do registro.'
              : 'Confira os dados antes de confirmar a operacao.'}
          </p>
        </div>

        <div className="admin-modal-footer -mx-3 mt-3 px-3 md:-mx-3.5 md:px-3.5">
          <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--blue)] hover:text-[var(--blue)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70 ${
              tone === 'danger' ? 'bg-[var(--rose)] hover:opacity-90' : 'bg-[var(--blue)] hover:opacity-90'
            }`}
          >
            {busy ? 'Processando...' : confirmLabel}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}


