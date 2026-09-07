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

const STORAGE_KEY = 'tenderbase.company-profile.v1';

/** Seeded so the screen has realistic content before Supabase exists. */
export const DEMO_PROFILE: CompanyProfile = {
  legalName: 'Mkhize Solutions (Pty) Ltd',
  tradingName: 'Mkhize Solutions',
  companyType: 'Private Company (Pty) Ltd',
  registrationNumber: '2018/443921/07',
  vatNumber: '4820318877',
  csdNumber: 'MAAA0891234',
  taxClearanceExpiry: '2027-03-31',
  bbbeeLevel: 2,
  bbbeeExpiry: '2027-01-15',
  cidbGrading: null,
  contactPerson: 'Sipho Mkhize',
  email: 'info@mkhize-solutions.co.za',
  phone: '+27 31 502 8841',
  addressLine: '14 Umgeni Road',
  city: 'Durban',
  province: 'KwaZulu-Natal',
  postalCode: '4001',
  updatedAt: new Date().toISOString(),
};

export function loadProfile(): CompanyProfile {
  if (typeof window === 'undefined') return DEMO_PROFILE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEMO_PROFILE;
    // Merge over the empty shape so fields added in a later version exist.
    return { ...EMPTY_COMPANY_PROFILE, ...(JSON.parse(raw) as Partial<CompanyProfile>) };
  } catch {
    return DEMO_PROFILE;
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
