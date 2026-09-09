'use client';

import {
  EMPTY_COMPANY_PROFILE,
  type CompanyProfile,
} from '@/types/company';

/**
 * Company profile storage.
 *
 * localStorage for now — this is the bidder's own data, not tender data, and
 * it belongs in Supabase behind auth. The interface is deliberately async so
 * swapping in a real backend touches nothing else.
 */

// v2: v1 seeded a demo persona ("Mkhize Solutions") into first-run storage.
// Bumping the key drops any leftover demo row so a fresh account starts blank.
const STORAGE_KEY = 'tenderbase.company-profile.v2';

/** Nothing is seeded — an unset profile is an empty profile, shown honestly. */
export function loadProfile(): CompanyProfile {
  if (typeof window === 'undefined') return EMPTY_COMPANY_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_COMPANY_PROFILE;
    // Merge over the empty shape so fields added in a later version exist.
    return { ...EMPTY_COMPANY_PROFILE, ...(JSON.parse(raw) as Partial<CompanyProfile>) };
  } catch {
    return EMPTY_COMPANY_PROFILE;
  }
}

export function saveProfile(profile: CompanyProfile): CompanyProfile {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (e) {
    console.error('[company] save failed:', e);
  }
  return next;
}

export function resetProfile(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
