'use client';

import { createClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';

/**
 * Current signed-in user id — the one auth primitive the remote stores need.
 * Shared by saved-remote and the account-sync stores (saved searches, news
 * bookmarks, alert settings) so session handling lives in exactly one place.
 *
 * Returns null when Supabase is unconfigured or the call fails; every caller
 * then falls back to its honest signed-out / not-yet-synced state.
 */
export async function currentSessionUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
