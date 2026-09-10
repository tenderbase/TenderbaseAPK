import { Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDeadline, getStatus } from '@/lib/format';
import type { LifecycleStatus } from '@/types/tender';

const TONE: Record<string, string> = {
  open: 'bg-canvas text-ink-2',
  closing_soon: 'bg-soon-bg text-soon',
  urgent: 'bg-urgent-bg text-urgent',
  closed: 'bg-canvas text-ink-3',
  cancelled: 'bg-urgent-bg text-urgent',
};

/**
 * Deadline urgency. Tone is derived from the same inputs as the status badge,
 * so the two can never contradict each other.
 */
export function DeadlineBadge({
  closingDate,
  lifecycleStatus,
  className,
}: {
  closingDate: string;
  lifecycleStatus?: LifecycleStatus | null;
  className?: string;
}) {
  const status = getStatus({ closingDate, lifecycleStatus });
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-[7px] px-2.5',
        'text-[11.5px] font-semibold',
        TONE[status],
        className,
      )}
    >
      <Clock size={13} strokeWidth={2.1} aria-hidden />
      {formatDeadline(closingDate, undefined, lifecycleStatus)}
    </span>
  );
}
