type ExportButtonProps = {
  href: string;
  label: string;
  tone?: 'teal' | 'amber' | 'rose';
};

const toneStyles: Record<NonNullable<ExportButtonProps['tone']>, string> = {
  teal: 'border-[rgba(246,164,0,0.14)] bg-[rgba(246,164,0,0.08)] text-[var(--accent-deep)] hover:bg-[rgba(246,164,0,0.14)]',
  amber: 'border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.1)] text-[var(--mint-deep)] hover:bg-[rgba(74,222,128,0.16)]',
  rose: 'border-[rgba(190,18,60,0.18)] bg-[rgba(190,18,60,0.08)] text-[var(--rose)] hover:bg-[rgba(190,18,60,0.14)]',
};

export default function ExportButton({ href, label, tone = 'teal' }: ExportButtonProps) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold transition ${toneStyles[tone]}`}
    >
      {label}
    </a>
  );
}


