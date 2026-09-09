'use client';

import { createClient } from '@/lib/supabase';
import { currentSessionUserId } from '@/lib/supabase-user';
import type { AlertKind } from '@/lib/alerts';

/**
 * Alert-settings persistence against Postgres (table: `alert_settings`,
 * migration 0005) — currently the muted in-app alert kinds.
 *
 * Client-side mirror of saved-remote.ts. Single row per user; the whole
 * muted list is upserted together. Unconfigured / signed out → null / false,
 * and callers keep their honest device state.
 */

interface DbRow {
  muted: unknown;
}

const KNOWN: AlertKind[] = ['match', 'closing', 'system'];

function mutedOf(raw: unknown): AlertKind[] {
  if (!Array.isArray(raw)) return [];
  const out: AlertKind[] = [];
  for (const v of raw) {
    if (typeof v === 'string' && (KNOWN as string[]).includes(v) && !out.includes(v as AlertKind)) {
      out.push(v as AlertKind);
    }
  }
  return out;
}

/** The account's muted kinds, or null when there is no row yet. */
export async function fetchMutedAlertKinds(): Promise<AlertKind[] | null> {
  const userId = await currentSessionUserId();
  if (!userId) return null;

  const { data, error } = await createClient()
    .from('alert_settings')
    .select('muted')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[alert-settings] fetch failed:', error.message);
    return null;
  }
  if (!data) return null;
  return mutedOf((data as DbRow).muted);
}

/** Upserts the whole muted list. Returns false without a session. */
export async function persistMutedAlertKinds(muted: AlertKind[]): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;

  const clean = KNOWN.filter((k) => muted.includes(k));

  const { error } = await createClient()
    .from('alert_settings')
    .upsert({ user_id: userId, muted: clean }, { onConflict: 'user_id' });

  if (error) {
    console.error('[alert-settings] persist failed:', error.message);
    return false;
  }
  return true;
}
