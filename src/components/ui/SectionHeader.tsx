import { cn } from '@/lib/cn';

export function SectionHeader({
  title,
  action,
  onAction,
  className,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('mb-3 flex items-baseline justify-between', className)}>
      <h2 className="text-section font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      {action && (
        <button type="button" onClick={onAction} className="text-meta font-semibold text-blue">
          {action}
        </button>
      )}
    </div>
  );
}
