'use client';

import { createClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { EMPTY_COMPANY_PROFILE, type CompanyProfile } from '@/types/company';

/**
 * Company profile persistence against Postgres.
 *
 * Falls back to localStorage when there is no session, so the screen keeps
 * working signed-out and in the preview bypass. Row shape is snake_case in the
 * database and camelCase in the app; the mapping lives here and nowhere else.
 */

type Row = {
  legal_name: string; trading_name: string | null; company_type: string | null;
  registration_number: string | null; vat_number: string | null; csd_number: string | null;
  tax_clearance_expiry: string | null; bbbee_level: number | null; bbbee_expiry: string | null;
  cidb_grading: string | null; contact_person: string | null; email: string | null;
  phone: string | null; address_line: string | null; city: string | null;
  province: string | null; postal_code: string | null; updated_at: string;
};

function toProfile(r: Row): CompanyProfile {
  return {
    ...EMPTY_COMPANY_PROFILE,
    legalName: r.legal_name ?? '',
    tradingName: r.trading_name,
    companyType: r.company_type as CompanyProfile['companyType'],
    registrationNumber: r.registration_number,
    vatNumber: r.vat_number,
    csdNumber: r.csd_number,
    taxClearanceExpiry: r.tax_clearance_expiry,
    bbbeeLevel: r.bbbee_level as CompanyProfile['bbbeeLevel'],
    bbbeeExpiry: r.bbbee_expiry,
    cidbGrading: r.cidb_grading,
    contactPerson: r.contact_person,
    email: r.email,
    phone: r.phone,
    addressLine: r.address_line,
    city: r.city,
    province: r.province,
    postalCode: r.postal_code,
    updatedAt: r.updated_at,
  };
}

function toRow(p: CompanyProfile) {
  return {
    legal_name: p.legalName,
    trading_name: p.tradingName,
    company_type: p.companyType,
    registration_number: p.registrationNumber,
    vat_number: p.vatNumber,
    csd_number: p.csdNumber,
    tax_clearance_expiry: p.taxClearanceExpiry,
    bbbee_level: p.bbbeeLevel,
    bbbee_expiry: p.bbbeeExpiry,
    cidb_grading: p.cidbGrading,
    contact_person: p.contactPerson,
    email: p.email,
    phone: p.phone,
    address_line: p.addressLine,
    city: p.city,
    province: p.province,
    postal_code: p.postalCode,
  };
}

/** Null when signed out or Supabase isn't configured. */
async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data } = await createClient().auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function fetchProfile(): Promise<CompanyProfile | null> {
  const userId = await currentUserId();
  if (!userId) return null;

  const { data, error } = await createClient()
    .from('company_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[company] fetch failed:', error.message);
    return null;
  }
  return data ? toProfile(data as Row) : null;
}

/** Returns false when there is no session, so the caller can fall back. */
export async function persistProfile(profile: CompanyProfile): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('company_profiles')
    .upsert({ user_id: userId, ...toRow(profile) }, { onConflict: 'user_id' });

  if (error) {
    console.error('[company] save failed:', error.message);
    return false;
  }
  return true;
}
