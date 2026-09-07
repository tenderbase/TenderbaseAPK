import { Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatDeadline, getStatus } from '@/lib/format';

const TONE: Record<string, string> = {
  open: 'bg-canvas text-ink-2',
  closing_soon: 'bg-soon-bg text-soon',
  urgent: 'bg-urgent-bg text-urgent',
  closed: 'bg-canvas text-ink-3',
};

/**
 * Deadline urgency. Tone is derived from the date itself, so it can never
 * contradict the status badge.
 */
export function DeadlineBadge({ closingDate, className }: { closingDate: string; className?: string }) {
  const status = getStatus({ closingDate });
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
      {formatDeadline(closingDate)}
    </span>
  );
}
