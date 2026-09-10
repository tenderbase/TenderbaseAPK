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

/**
 * The account's muted kinds:
 * - an array when a row exists (possibly empty),
 * - null when the account has no row yet,
 * - undefined when the fetch failed or there is no session — callers must
 *   NOT treat that as "no row" (they would clobber an existing row).
 */
export async function fetchMutedAlertKinds(): Promise<AlertKind[] | null | undefined> {
  const userId = await currentSessionUserId();
  if (!userId) return undefined;

  const { data, error } = await createClient()
    .from('alert_settings')
    .select('muted')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[alert-settings] fetch failed:', error.message);
    return undefined;
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
