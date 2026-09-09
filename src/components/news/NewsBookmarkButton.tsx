'use client';

import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useNewsBookmarks } from '@/lib/news-bookmarks';
import type { NewsItem } from '@/types/news';

/**
 * Bookmark toggle shared by feed cards and the article reader. The full
 * story item is passed so the account snapshot is available when syncing
 * (`news_bookmarks` table) — the action itself is real and immediate,
 * signed-in or not.
 */
export function NewsBookmarkButton({ item, className }: { item: NewsItem; className?: string }) {
  const { has, toggle } = useNewsBookmarks();
  const saved = has(item.id);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(item);
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
