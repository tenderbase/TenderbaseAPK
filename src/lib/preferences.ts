'use client';

import { DEFAULT_PREFERENCES, type TenderPreferences } from '@/types/preferences';

/**
 * Preferences storage.
 *
 * localStorage for now, same as the company profile — this is per-user data
 * that belongs in Supabase behind auth. Kept behind these three functions so
 * swapping the backend touches nothing else.
 */

const STORAGE_KEY = 'tenderbase.preferences.v1';

export function loadPreferences(): TenderPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    // Merge over defaults so fields added in a later version still exist.
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<TenderPreferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function savePreferences(prefs: TenderPreferences): TenderPreferences {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('[preferences] save failed:', e);
  }
  return prefs;
}

export function resetPreferences(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
