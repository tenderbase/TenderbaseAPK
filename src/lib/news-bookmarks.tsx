'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useSavedTenders } from '@/lib/saved-store';
import { mergeById } from '@/lib/sync-core';
import type { NewsItem } from '@/types/news';
import {
  deleteNewsBookmark, fetchNewsBookmarks, persistNewsBookmark,
  type NewsBookmarkRow,
} from '@/lib/news-bookmarks-remote';

/**
 * News-bookmarks store.
 *
 * Device-first like saved searches: rows (id + a story snapshot) are kept in
 * localStorage so bookmark state works signed-out and offline — legacy rows
 * written before snapshots existed (plain id strings) still count as
 * bookmarks but cannot be re-synced until the story is re-saved.
 *
 * When signed in the store merges once with `news_bookmarks` (migration
 * 0004) on sign-in: bookmarks made on other devices appear here and local
 * bookmarks are pushed with their snapshot. toggle() also writes straight
 * through to the account when signed in.
 */

const KEY = 'tb_news_bookmarks_v1';

interface DeviceRow {
  storyId: string;
  sourceId: string;
  savedAt: string;
  /** null for legacy id-only rows migrated from the pre-sync format. */
  item: NewsItem | null;
}

function load(): DeviceRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      // Legacy format: plain story-id strings. They stay bookmarked on this
      // device, but without a snapshot there is nothing to sync — honest.
      return parsed
        .filter((x): x is string => typeof x === 'string')
        .map((id) => ({ storyId: id, sourceId: '', savedAt: new Date().toISOString(), item: null }));
    }
    if (parsed && typeof parsed === 'object') {
      const rows = (parsed as { rows?: unknown }).rows;
      if (Array.isArray(rows)) {
        return rows.filter(
          (r): r is DeviceRow =>
            !!r && typeof r === 'object' && typeof (r as DeviceRow).storyId === 'string',
        );
      }
    }
    return [];
  } catch {
    return [];
  }
}

function storeDevice(rows: DeviceRow[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ rows }));
  } catch {
    /* storage unavailable — state still lives for this session */
  }
}

function bySavedDesc(a: { savedAt: string }, b: { savedAt: string }) {
  return b.savedAt.localeCompare(a.savedAt);
}

function remoteToDevice(r: NewsBookmarkRow): DeviceRow {
  return { storyId: r.storyId, sourceId: r.sourceId, savedAt: r.savedAt, item: r.snapshot };
}

interface NewsBookmarksValue {
  /** Story ids, newest-bookmarked first. */
  ids: string[];
  count: number;
  has: (storyId: string) => boolean;
  /** Bookmark/unbookmark a story. Needs the item for the account snapshot. */
  toggle: (item: NewsItem) => void;
}

const NewsBookmarksContext = createContext<NewsBookmarksValue | null>(null);

export function NewsBookmarksProvider({ children }: { children: ReactNode }) {
  const { session } = useSavedTenders();
  const signedIn = session.signedIn && !session.loading;

  const [rows, setRows] = useState<DeviceRow[]>(() => load());
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  const syncedOnce = useRef(false);

  useEffect(() => {
    storeDevice(rows);
  }, [rows]);

  // Sign-in merge with the account's bookmarks.
  useEffect(() => {
    if (!signedIn) {
      syncedOnce.current = false;
      return;
    }
    if (syncedOnce.current) return;
    let cancelled = false;

    const attempt = async () => {
      if (syncedOnce.current || cancelled) return;
      const remote = await fetchNewsBookmarks(); // [] when unconfigured/signed out
      if (cancelled) return;
      // Legacy id-only rows that the account already knows must not shadow
      // the real snapshot — the remote row wins for those ids.
      const localRows = rowsRef.current.filter(
        (r) => r.item !== null || !remote.some((rm) => rm.storyId === r.storyId),
      );
      const { merged, toUpsert } = mergeById(localRows, remote.map(remoteToDevice), (r) => r.storyId);
      for (const r of toUpsert) {
        if (!r.item) continue; // legacy id-only row — nothing honest to push
        const ok = await persistNewsBookmark(r.item);
        if (cancelled) return;
        if (!ok) {
          syncedOnce.current = false;
          return;
        }
      }
      syncedOnce.current = true;
      setRows([...merged].sort(bySavedDesc));
    };

    void attempt();
    const onOnline = () => void attempt();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  const toggle = useCallback((item: NewsItem) => {
    const cur = rowsRef.current;
    const existing = cur.find((r) => r.storyId === item.id);
    if (existing) {
      if (signedInRef.current) {
        void deleteNewsBookmark(item.id).then((ok) => {
          if (!ok) {
            console.error('[news-bookmarks] delete failed — bookmark kept on this device');
            return;
          }
          setRows((prev) => prev.filter((r) => r.storyId !== item.id));
        });
        return;
      }
      setRows((prev) => prev.filter((r) => r.storyId !== item.id));
      return;
    }
    const row: DeviceRow = {
      storyId: item.id,
      sourceId: item.sourceId,
      savedAt: new Date().toISOString(),
      item,
    };
    setRows((prev) => [row, ...prev].sort(bySavedDesc));
    if (signedInRef.current) {
      void persistNewsBookmark(item).then((ok) => {
        if (!ok) syncedOnce.current = false; // retry on next 'online'
      });
    }
  }, []);

  const ids = rows.map((r) => r.storyId);

  const value = {
    ids,
    count: rows.length,
    has: useCallback((storyId: string) => rowsRef.current.some((r) => r.storyId === storyId), []),
    toggle,
  };

  return <NewsBookmarksContext.Provider value={value}>{children}</NewsBookmarksContext.Provider>;
}

export function useNewsBookmarks(): NewsBookmarksValue {
  const ctx = useContext(NewsBookmarksContext);
  if (!ctx) throw new Error('useNewsBookmarks must be used inside NewsBookmarksProvider');
  return ctx;
}
