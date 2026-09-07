'use client';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ChipProps {
  label: string;
  selected?: boolean;
  /** 'solid' for filter tabs, 'outline' for multi-select facets. */
  tone?: 'solid' | 'outline';
  onClick?: () => void;
}

export function Chip({ label, selected = false, tone = 'solid', onClick }: ChipProps) {
  const selectedClass =
    tone === 'solid'
      ? 'bg-navy border-navy text-white font-semibold'
      : 'bg-blue-soft border-blue-line text-navy font-semibold';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5',
        'text-[13.5px] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40',
        selected ? selectedClass : 'border-line bg-white text-ink-2',
      )}
    >
      {label}
      {selected && tone === 'outline' && <Check size={14} strokeWidth={2.6} aria-hidden />}
    </button>
  );
}
