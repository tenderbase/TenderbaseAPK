'use client';

import { createClient } from '@/lib/supabase';
import { currentSessionUserId } from '@/lib/supabase-user';
import type { SavedSearchDef, SavedSearchParams } from '@/lib/saved-searches';

/**
 * Saved-searches persistence against Postgres (table: `saved_searches`,
 * migration 0003).
 *
 * Client-side mirror of saved-remote.ts. The row id is the client-generated
 * one from the device store, so identity survives across devices; `params`
 * travels as JSONB and is parsed defensively on the way out.
 *
 * Unconfigured / signed out → [] / false, and callers keep their honest
 * device-local state instead of faking a sync.
 */

interface DbRow {
  id: string;
  name: string;
  params: unknown;
  created_at: string;
}

function isRecord(v: unknown): v is Record<string, string> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function paramsOf(raw: unknown): SavedSearchParams {
  if (!isRecord(raw)) return {};
  const out: SavedSearchParams = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string' && v !== '') (out as Record<string, string>)[k] = v;
  }
  return out;
}

export async function fetchSavedSearches(): Promise<SavedSearchDef[]> {
  const userId = await currentSessionUserId();
  if (!userId) return [];

  const { data, error } = await createClient()
    .from('saved_searches')
    .select('id, name, params, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[saved-searches] fetch failed:', error.message);
    return [];
  }

  return ((data as DbRow[] | null) ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    params: paramsOf(r.params),
    createdAt: r.created_at,
  }));
}

/** Upserts one saved search. Returns false when there is no session. */
export async function persistSavedSearch(search: SavedSearchDef): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('saved_searches')
    .upsert(
      {
        user_id: userId,
        id: search.id,
        name: search.name,
        params: search.params as unknown as Record<string, unknown>,
        created_at: search.createdAt,
      },
      { onConflict: 'user_id,id' },
    );

  if (error) {
    console.error('[saved-searches] persist failed:', error.message);
    return false;
  }
  return true;
}

/** Deletes one saved search. Returns false when there is no session. */
export async function deleteSavedSearch(id: string): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('saved_searches')
    .delete()
    .eq('user_id', userId)
    .eq('id', id);

  if (error) {
    console.error('[saved-searches] delete failed:', error.message);
    return false;
  }
  return true;
}
