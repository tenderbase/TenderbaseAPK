'use client';
import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface BookmarkButtonProps {
  saved: boolean;
  onToggle?: () => void;
  tenderTitle?: string;
}

/** 44px touch target with a 34px visual box. */
export function BookmarkButton({ saved, onToggle, tenderTitle }: BookmarkButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onToggle?.();
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${tenderTitle ?? 'tender'} from saved` : `Save ${tenderTitle ?? 'tender'}`}
      className={cn(
        'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40',
        saved ? 'bg-navy text-white' : 'bg-canvas text-ink-3',
      )}
    >
      <Bookmark size={18} strokeWidth={1.9} fill={saved ? 'currentColor' : 'none'} aria-hidden />
    </button>
  );
}
