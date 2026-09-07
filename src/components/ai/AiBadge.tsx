import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

export function AiBadge({ label = 'AI', className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-md bg-ai-bg px-2',
        'text-[11px] font-bold tracking-[0.03em] text-ai',
        className,
      )}
    >
      <Sparkles size={12} strokeWidth={2.2} aria-hidden />
      {label}
    </span>
  );
}
