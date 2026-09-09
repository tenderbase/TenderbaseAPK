'use client';

import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useNewsBookmarks } from '@/lib/news-bookmarks';

/**
 * Bookmark toggle shared by feed cards and the article reader. Honest about
 * scope: bookmarks live on this device until account sync ships (the store
 * label says so) — the action itself is real and immediate.
 */
export function NewsBookmarkButton({ id, className }: { id: string; className?: string }) {
  const { has, toggle } = useNewsBookmarks();
  const saved = has(id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      }}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Bookmark story'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors',
        saved ? 'bg-navy text-white' : 'bg-canvas text-ink-3 hover:text-ink',
        className,
      )}
    >
      <Bookmark size={16} strokeWidth={1.9} fill={saved ? 'currentColor' : 'none'} aria-hidden />
    </button>
  );
}
