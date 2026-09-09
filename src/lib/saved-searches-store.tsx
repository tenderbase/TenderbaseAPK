'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  defaultName, paramsKey,
  type SavedSearchDef, type SavedSearchParams,
} from '@/lib/saved-searches';

/**
 * Saved-searches client store — device-local singleton (clearly labelled in
 * the UI) until the saved-searches account table ships, mirroring the news
 * bookmarks and alert-settings pattern. React never reaches into the pure
 * module, and the pure module stays plain-Node testable.
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

let state: SavedSearchDef[] = load();
const listeners = new Set<() => void>();

function persist(next: SavedSearchDef[]) {
  state = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ list: next }));
  } catch {
    /* storage unavailable — state still works for this session */
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Save a search. Returns null when this exact search is already saved. */
export function addSavedSearch(name: string, params: SavedSearchParams): SavedSearchDef | null {
  const dup = state.some((s) => paramsKey(s.params) === paramsKey(params));
  if (dup) return null;
  const def: SavedSearchDef = {
    id: `ss_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: name.trim() || defaultName(params),
    params,
    createdAt: new Date().toISOString(),
  };
  persist([def, ...state]);
  return def;
}

export function removeSavedSearch(id: string) {
  persist(state.filter((s) => s.id !== id));
}

export function isSearchSaved(params: SavedSearchParams): boolean {
  const key = paramsKey(params);
  return state.some((s) => paramsKey(s.params) === key);
}

export function useSavedSearches() {
  const list = useSyncExternalStore(subscribe, () => state, () => state);
  return {
    list,
    count: list.length,
    add: useCallback((name: string, params: SavedSearchParams) => addSavedSearch(name, params), []),
    remove: useCallback((id: string) => removeSavedSearch(id), []),
    isSaved: useCallback((params: SavedSearchParams) => isSearchSaved(params), []),
  };
}
