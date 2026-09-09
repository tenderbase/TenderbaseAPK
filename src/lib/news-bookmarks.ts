'use client';

import { useCallback, useEffect, useState } from 'react';

const KEY = 'tb_news_bookmarks';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * News bookmarks, stored on this device for now — there is no accounts table
 * for them yet, and the UI says exactly that wherever it matters. When the
 * news/accounts release lands, bookmarks sync server-side and this store
 * becomes a mirror.
 */
export function useNewsBookmarks() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
  }, []);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev];
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage full/unavailable — keep in-memory state */
      }
      return next;
    });
  }, []);

  return { ids, has: ids.includes.bind(ids), toggle, count: ids.length };
}
