import { cn } from '@/lib/cn';
import type { TenderStatus } from '@/types/tender';

const STATUS_STYLES: Record<TenderStatus, { label: string; className: string; dot: boolean }> = {
  open:         { label: 'Open',         className: 'bg-open-bg text-open',     dot: true },
  closing_soon: { label: 'Closing Soon', className: 'bg-soon-bg text-soon',     dot: false },
  urgent:       { label: 'Urgent',       className: 'bg-urgent-bg text-urgent', dot: false },
  closed:       { label: 'Closed',       className: 'bg-canvas text-ink-3',     dot: false },
};

export function StatusBadge({ status, className }: { status: TenderStatus; className?: string }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-md px-2',
        'text-[11px] font-bold uppercase tracking-wide',
        s.className,
        className,
      )}
    >
      {s.dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
      {s.label}
    </span>
  );
}

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center rounded-md bg-blue-soft px-2',
        'text-[11.5px] font-semibold text-blue',
        className,
      )}
    >
      {category}
    </span>
  );
}
