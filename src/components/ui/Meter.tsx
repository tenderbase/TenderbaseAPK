import { cn } from '@/lib/cn';

/**
 * Usage meter. Shown BEFORE limits are hit (honest quota UX): a small bar +
 * count so users can pace themselves, then the gating UI (Upgrade Sheet in a
 * later phase) takes over at zero.
 */
export function Meter({
  used,
  max,
  label,
  tone = 'navy',
  className,
}: {
  used: number;
  max: number;
  label?: string;
  tone?: 'navy' | 'amber';
  className?: string;
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (used / max) * 100));
  const left = Math.max(0, max - used);

  return (
    <div className={cn('w-full', className)}>
      {(label || max > 0) && (
        <div className="mb-1 flex items-baseline justify-between gap-2">
          {label && <span className="text-[11.5px] font-medium text-ink-2">{label}</span>}
          <span className="text-[11px] tabular-nums text-ink-3">
            {used} of {max} used{max > 0 && left > 0 ? ` · ${left} left` : ''}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(used)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? 'Usage'}
        className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none',
            pct >= 100 ? 'bg-urgent' : tone === 'amber' ? 'bg-soon' : 'bg-navy',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
