'use client';

import { createClient } from '@/lib/supabase';
import { currentSessionUserId } from '@/lib/supabase-user';
import type { NewsItem } from '@/types/news';

/**
 * News-bookmark persistence against Postgres (table: `news_bookmarks`,
 * migration 0004).
 *
 * Client-side mirror of saved-remote.ts. Rows key on the app's stable
 * `story_id` ("<sourceId>:<url-hash>") and carry a NewsItem snapshot so a
 * future Saved-stories list renders even while feeds are unreachable.
 *
 * Unconfigured / signed out → [] / false; callers keep honest device state.
 */

export interface NewsBookmarkRow {
  storyId: string;
  sourceId: string;
  savedAt: string;
  snapshot: NewsItem;
}

interface DbRow {
  story_id: string;
  source_id: string;
  snapshot: unknown;
  saved_at: string;
}

function snapshotOf(raw: unknown, storyId: string, sourceId: string): NewsItem {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if (typeof r.id === 'string' && typeof r.title === 'string' && typeof r.url === 'string') {
      return {
        id: r.id,
        sourceId: typeof r.sourceId === 'string' ? r.sourceId : sourceId,
        title: r.title,
        dek: typeof r.dek === 'string' ? r.dek : '',
        url: r.url,
        publishedAt: typeof r.publishedAt === 'string' ? r.publishedAt : null,
      };
    }
  }
  // Never fabricate: a malformed row degrades to id + source only, which the
  // UI can still filter on without inventing a headline.
  return { id: storyId, sourceId, title: '', dek: '', url: '', publishedAt: null };
}

export async function fetchNewsBookmarks(): Promise<NewsBookmarkRow[]> {
  const userId = await currentSessionUserId();
  if (!userId) return [];

  const { data, error } = await createClient()
    .from('news_bookmarks')
    .select('story_id, source_id, snapshot, saved_at')
    .order('saved_at', { ascending: false });

  if (error) {
    console.error('[news-bookmarks] fetch failed:', error.message);
    return [];
  }

  return ((data as DbRow[] | null) ?? []).map((r) => ({
    storyId: r.story_id,
    sourceId: r.source_id,
    savedAt: r.saved_at,
    snapshot: snapshotOf(r.snapshot, r.story_id, r.source_id),
  }));
}

/** Upserts one bookmark from a feed item. Returns false without a session. */
export async function persistNewsBookmark(item: NewsItem): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('news_bookmarks')
    .upsert(
      {
        user_id: userId,
        story_id: item.id,
        source_id: item.sourceId,
        snapshot: item as unknown as Record<string, unknown>,
        saved_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,story_id' },
    );

  if (error) {
    console.error('[news-bookmarks] persist failed:', error.message);
    return false;
  }
  return true;
}

/** Deletes one bookmark. Returns false without a session. */
export async function deleteNewsBookmark(storyId: string): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('news_bookmarks')
    .delete()
    .eq('user_id', userId)
    .eq('story_id', storyId);

  if (error) {
    console.error('[news-bookmarks] delete failed:', error.message);
    return false;
  }
  return true;
}
