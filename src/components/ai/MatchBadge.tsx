import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * AI match score. Indigo is reserved for AI-derived content so it can never be
 * confused with a status colour (green/amber/red).
 */
export function MatchBadge({
  score,
  compact = false,
  className,
}: {
  score: number;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-ai-bg px-[7px] font-bold text-ai',
        compact ? 'h-5 text-[10.5px]' : 'h-[22px] text-[11px]',
        className,
      )}
      title={`${score}% match with your profile`}
    >
      <Sparkles size={11} strokeWidth={2.3} aria-hidden />
      {score}%
    </span>
  );
}
