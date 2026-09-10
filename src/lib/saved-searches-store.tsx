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
import {
  defaultName, paramsKey,
  type SavedSearchDef, type SavedSearchParams,
} from '@/lib/saved-searches';
import { useSavedTenders } from '@/lib/saved-store';
import { mergeById } from '@/lib/sync-core';
import {
  deleteSavedSearch, fetchSavedSearches, persistSavedSearch,
} from '@/lib/saved-searches-remote';

/**
 * Saved-searches store.
 *
 * Device-first: the list is written to localStorage on every change, so it
 * works signed-out and offline. When a session is present the store is
 * remote-first too — on sign-in it merges the account's rows
 * (`saved_searches`, migration 0003) with whatever this device has: rows
 * from other devices appear, local rows the account lacks are pushed, and
 * identical rows are not re-uploaded (mergeById in sync-core).
 * add/remove also write straight through to the account when signed in.
 *
 * The pure param/name logic stays in saved-searches.ts (plain-Node
 * testable); this file is only state + sync plumbing.
 */

const KEY = 'tb_saved_searches_v1';

function load(): SavedSearchDef[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { list?: SavedSearchDef[] };
    return Array.isArray(parsed?.list) ? parsed.list : [];
  } catch {
    return [];
  }
}

function storeDevice(next: SavedSearchDef[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ list: next }));
  } catch {
    /* storage unavailable — state still lives for this session */
  }
}

function byCreatedDesc(a: SavedSearchDef, b: SavedSearchDef) {
  return b.createdAt.localeCompare(a.createdAt);
}

interface SavedSearchesValue {
  /** Newest first. */
  list: SavedSearchDef[];
  count: number;
  /** Save a search. Returns null when this exact search is already saved. */
  add: (name: string, params: SavedSearchParams) => SavedSearchDef | null;
  remove: (id: string) => void;
  isSaved: (params: SavedSearchParams) => boolean;
}

const SavedSearchesContext = createContext<SavedSearchesValue | null>(null);

export function SavedSearchesProvider({ children }: { children: ReactNode }) {
  const { session } = useSavedTenders();
  const signedIn = session.signedIn && !session.loading;

  const [list, setList] = useState<SavedSearchDef[]>(() => load());
  const listRef = useRef(list);
  listRef.current = list;
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  /** One merge pass per sign-in (reset on sign-out); cleared on failure so
   *  an 'online' event retries. */
  const syncedOnce = useRef(false);

  useEffect(() => {
    storeDevice(list);
  }, [list]);

  // Sign-in merge: pull account rows, push what only this device has.
  useEffect(() => {
    if (!signedIn) {
      syncedOnce.current = false;
      return;
    }
    if (syncedOnce.current) return;
    let cancelled = false;

    const attempt = async () => {
      if (syncedOnce.current || cancelled) return;
      const remote = await fetchSavedSearches(); // [] when unconfigured/signed out
      if (cancelled) return;
      const local = listRef.current;
      const { merged, toUpsert } = mergeById(local, remote, (s) => s.id);
      for (const s of toUpsert) {
        // Push only real rows; a failed push keeps the row on this device
        // and clears the flag so an 'online' event retries the merge.
        const ok = await persistSavedSearch(s);
        if (cancelled) return;
        if (!ok) {
          syncedOnce.current = false;
          return;
        }
      }
      syncedOnce.current = true;
      setList([...merged].sort(byCreatedDesc));
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

  const add = useCallback((name: string, params: SavedSearchParams): SavedSearchDef | null => {
    const cur = listRef.current;
    if (cur.some((s) => paramsKey(s.params) === paramsKey(params))) return null;
    const def: SavedSearchDef = {
      id: `ss_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || defaultName(params),
      params,
      createdAt: new Date().toISOString(),
    };
    setList((prev) => [def, ...prev].sort(byCreatedDesc));
    if (signedInRef.current) {
      void persistSavedSearch(def).then((ok) => {
        if (!ok) syncedOnce.current = false; // retry on next 'online'
      });
    }
    return def;
  }, []);

  const remove = useCallback((id: string) => {
    if (signedInRef.current) {
      // Delete on the account first: if it fails we keep the row on this
      // device rather than let the next merge resurrect it remotely.
      void deleteSavedSearch(id).then((ok) => {
        if (!ok) {
          console.error('[saved-searches] delete failed — row kept on this device');
          return;
        }
        setList((prev) => prev.filter((s) => s.id !== id));
      });
      return;
    }
    setList((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const value = {
    list,
    count: list.length,
    add,
    remove,
    isSaved: useCallback((params: SavedSearchParams) => {
      const key = paramsKey(params);
      return listRef.current.some((s) => paramsKey(s.params) === key);
    }, []),
  };

  return <SavedSearchesContext.Provider value={value}>{children}</SavedSearchesContext.Provider>;
}

export function useSavedSearches(): SavedSearchesValue {
  const ctx = useContext(SavedSearchesContext);
  if (!ctx) throw new Error('useSavedSearches must be used inside SavedSearchesProvider');
  return ctx;
}
