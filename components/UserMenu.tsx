'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

type UserMenuProps = {
  initial: string;
  userName?: string | null;
  userEmail?: string | null;
};

export default function UserMenu({ initial, userName, userEmail }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white outline-none transition hover:opacity-90"
      >
        {initial}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-[rgba(17,24,39,0.08)] bg-white p-2 shadow-[0_18px_38px_rgba(17,24,39,0.12)]">
          <div className="rounded-xl px-3 py-3">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">{userName ?? 'Usuário autenticado'}</p>
            <p className="mt-1 truncate text-xs text-[var(--muted)]">{userEmail ?? 'Conta ativa'}</p>
          </div>

          <div className="my-1 h-px bg-[rgba(17,24,39,0.08)]" />

          <Link
            href="/perfil"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-[var(--ink)] transition hover:bg-[rgba(17,24,39,0.04)]"
          >
            <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 19a7 7 0 0 1 14 0" />
            </svg>
            <span>Perfil</span>
          </Link>

          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium text-[var(--rose)] transition hover:bg-[rgba(190,18,60,0.06)]"
            >
              <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 6H6.5A1.5 1.5 0 0 0 5 7.5v9A1.5 1.5 0 0 0 6.5 18H9" />
                <path d="M13 16l4-4-4-4" />
                <path d="M17 12H9" />
              </svg>
              <span>Sair</span>
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}


