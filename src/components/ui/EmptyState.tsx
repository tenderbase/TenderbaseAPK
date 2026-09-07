import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-[#D3DAE3] bg-white px-5 py-8 text-center">
      <div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-canvas text-ink-3">
        <Icon size={24} strokeWidth={1.7} aria-hidden />
      </div>
      <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">{title}</h3>
      <p className="mt-1.5 max-w-[260px] text-meta text-ink-2">{description}</p>
      {actionLabel && (
        <Button size="sm" fullWidth={false} className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
