'use client';

import { createClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { DEFAULT_PREFERENCES, type TenderPreferences } from '@/types/preferences';
import type { Category, Province } from '@/types/tender';

/** Tender preferences persistence. Mirrors company-remote.ts. */

type Row = {
  categories: string[]; provinces: string[]; include_national: boolean;
  min_days_to_close: number; require_documents: boolean;
  alert_on_new_match: boolean; alert_on_closing_soon: boolean;
  alert_on_saved_updated: boolean; digest: string;
};

function toPrefs(r: Row): TenderPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    categories: (r.categories ?? []) as Category[],
    provinces: (r.provinces ?? []) as Province[],
    includeNational: r.include_national,
    minDaysToClose: r.min_days_to_close as TenderPreferences['minDaysToClose'],
    requireDocuments: r.require_documents,
    alertOnNewMatch: r.alert_on_new_match,
    alertOnClosingSoon: r.alert_on_closing_soon,
    alertOnSavedUpdated: r.alert_on_saved_updated,
    digest: r.digest as TenderPreferences['digest'],
  };
}

function toRow(p: TenderPreferences) {
  return {
    categories: p.categories,
    provinces: p.provinces,
    include_national: p.includeNational,
    min_days_to_close: p.minDaysToClose,
    require_documents: p.requireDocuments,
    alert_on_new_match: p.alertOnNewMatch,
    alert_on_closing_soon: p.alertOnClosingSoon,
    alert_on_saved_updated: p.alertOnSavedUpdated,
    digest: p.digest,
  };
}

async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchPreferences(): Promise<TenderPreferences | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  const { data, error } = await createClient()
    .from('tender_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[preferences] fetch failed:', error.message);
    return null;
  }
  return data ? toPrefs(data as Row) : null;
}

export async function persistPreferences(prefs: TenderPreferences): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('tender_preferences')
    .upsert({ user_id: userId, ...toRow(prefs) }, { onConflict: 'user_id' });

  if (error) {
    console.error('[preferences] save failed:', error.message);
    return false;
  }
  return true;
}
