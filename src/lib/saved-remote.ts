'use client';

import { createClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import type { TenderWithUserState } from '@/types/tender';

/**
 * Saved-tender persistence against Postgres (table: `saved_tenders`).
 *
 * Client-side mirror of the pattern in company-remote.ts / preferences-remote.ts.
 * Every row carries an adapted tender snapshot so the Saved tab renders without
 * a second upstream call; the detail page always re-fetches live data.
 *
 * When there is no Supabase config or no session, helpers return null/[] and
 * the UI falls back to its honest guest state ("sign in to save") — nothing is
 * silently faked.
 */

export interface SavedRow {
  tenderId: string;
  savedAt: string;
  tender: TenderWithUserState;
}

interface DbRow {
  tender_id: string;
  tender_json: unknown;
  saved_at: string;
}

/** Current signed-in user id, or null when unconfigured / signed out. */
export async function currentSessionUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchSavedRows(): Promise<SavedRow[]> {
  const userId = await currentSessionUserId();
  if (!userId) return [];

  const { data, error } = await createClient()
    .from('saved_tenders')
    .select('tender_id, tender_json, saved_at')
    .order('saved_at', { ascending: false });

  if (error) {
    console.error('[saved] fetch failed:', error.message);
    return [];
  }

  return (data as DbRow[] | null)?.map((r) => ({
    tenderId: r.tender_id,
    savedAt: r.saved_at,
    // Snapshot was written by us as an adapted tender; be defensive anyway.
    tender: r.tender_json as TenderWithUserState,
  })) ?? [];
}

/** Upserts a snapshot row. Returns false when there is no session. */
export async function persistSavedTender(tender: TenderWithUserState): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('saved_tenders')
    .upsert(
      {
        user_id: userId,
        tender_id: tender.id,
        tender_json: tender,
        saved_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,tender_id' },
    );

  if (error) {
    console.error('[saved] persist failed:', error.message);
    return false;
  }
  return true;
}

/** Deletes a saved row. Returns false when there is no session. */
export async function deleteSavedTender(tenderId: string): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('saved_tenders')
    .delete()
    .eq('user_id', userId)
    .eq('tender_id', tenderId);

  if (error) {
    console.error('[saved] delete failed:', error.message);
    return false;
  }
  return true;
}
