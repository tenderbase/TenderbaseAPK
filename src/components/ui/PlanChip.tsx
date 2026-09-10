import { Crown } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * PRO tier mark. Gold is reserved for tier signalling — this badge (and the
 * upgrade CTA) are the ONLY places gold appears. Treat gold as money.
 */
export function ProBadge({
  label = 'PRO',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1 rounded-md bg-pro px-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#7a610f]',
        className,
      )}
    >
      <Crown size={11} strokeWidth={2.2} aria-hidden />
      {label}
    </span>
  );
}

/** Tier pill shown in headers/drawer: Free · Basic · PRO (gold). */
export function PlanChip({
  tier,
  className,
}: {
  tier: 'free' | 'basic' | 'pro';
  className?: string;
}) {
  if (tier === 'pro') {
    return (
      <span
        className={cn(
          'inline-flex h-[22px] items-center gap-1 rounded-md bg-pro px-1.5 text-[10.5px] font-bold uppercase tracking-wide text-[#7a610f]',
          className,
        )}
      >
        <Crown size={11} strokeWidth={2.2} aria-hidden />
        Pro
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center rounded-md px-2 text-[11px] font-semibold',
        tier === 'basic' ? 'bg-blue-soft text-blue' : 'bg-canvas text-ink-3',
        className,
      )}
    >
      {tier === 'basic' ? 'Basic' : 'Free'}
    </span>
  );
}
