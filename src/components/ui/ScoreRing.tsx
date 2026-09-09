import { cn } from '@/lib/cn';

/**
 * The TenderBase signature motif — the match score ring. Used on Today's
 * Matches, the match detail sheet and (later) tender detail.
 *
 * Colour follows score, never decoration:
 *   0–39 muted · 40–64 navy · 65–84 blue · 85+ signal (emerald).
 */
export function scoreTone(score: number): string {
  if (score >= 85) return 'text-open stroke-open';
  if (score >= 65) return 'text-blue stroke-blue';
  if (score >= 40) return 'text-navy stroke-navy';
  return 'text-ink-3 stroke-ink-3';
}

export function ScoreRing({
  score,
  size = 52,
  strokeWidth = 4,
  showValue = true,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (clamped / 100) * c;

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${clamped}% match`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-line"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className={cn('transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none', scoreTone(clamped))}
        />
      </svg>
      {showValue && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn('font-bold tabular-nums tracking-[-0.04em]', scoreTone(clamped))}
            style={{ fontSize: Math.max(10, size * 0.24) }}
          >
            {clamped}
          </span>
        </span>
      )}
    </div>
  );
}
