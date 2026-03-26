import { formatCurrency, formatNumber } from '@/lib/format';

type Accent = 'neutral' | 'mint' | 'amber';

type DashboardCardProps = {
  label: string;
  value: number;
  accent?: Accent;
  compact?: boolean;
  isCurrency?: boolean;
  subtitle?: string;
  wave?: boolean;
};

const subtitleStyles: Record<Accent, string> = {
  neutral: 'text-[#3d4450]',
  mint: 'text-[var(--mint-deep)]',
  amber: 'text-[var(--accent-deep)]',
};

const dotStyles: Record<Accent, string> = {
  neutral: 'before:bg-[rgba(61,68,80,0.22)]',
  mint: 'before:bg-[var(--mint-soft)]',
  amber: 'before:bg-[var(--gold-soft)]',
};

const waveStyles: Record<Exclude<Accent, 'neutral'>, string> = {
  mint: 'text-[var(--mint)]',
  amber: 'text-[var(--accent)]',
};

function WaveDecoration({ accent }: { accent: Exclude<Accent, 'neutral'> }) {
  return (
    <div className={`absolute inset-x-0 bottom-0 ${waveStyles[accent]}`}>
      <svg viewBox="0 0 300 20" preserveAspectRatio="none" className="h-5 w-full">
        <path
          d="M0 15C12 15 12 8 24 8s12 7 24 7 12-7 24-7 12 7 24 7 12-7 24-7 12 7 24 7 12-7 24-7 12 7 24 7 12-7 24-7 12 7 24 7 12-7 24-7 12 7 24 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export default function DashboardCard({
  label,
  value,
  accent = 'neutral',
  compact = false,
  isCurrency = false,
  subtitle,
  wave = false,
}: DashboardCardProps) {
  const formattedValue = isCurrency ? formatCurrency(value) : formatNumber(value);

  return (
    <article
      className={`relative overflow-hidden rounded-[22px] border border-[rgba(17,24,39,0.08)] bg-white px-5 py-4 shadow-[0_8px_18px_rgba(17,24,39,0.04)] ${
        compact ? 'min-h-[118px]' : 'min-h-[158px]'
      }`}
    >
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-medium text-[var(--muted)]">{label}</p>
        </div>

        <div className="space-y-2">
          <p
            className={`font-[family-name:var(--font-heading)] font-medium tracking-[-0.05em] text-[var(--ink)] ${
              compact ? 'text-[2rem]' : 'text-[2.2rem]'
            }`}
          >
            {formattedValue}
          </p>

          <div className={`relative inline-flex items-center text-[15px] font-medium ${subtitleStyles[accent]}`}>
            <span className={`relative pl-4 ${dotStyles[accent]} before:absolute before:left-0 before:top-1/2 before:h-2 before:w-2 before:-translate-y-1/2 before:rounded-full`}>
              {subtitle ?? label}
            </span>
          </div>
        </div>
      </div>

      {wave && accent !== 'neutral' ? <WaveDecoration accent={accent} /> : null}
    </article>
  );
}


