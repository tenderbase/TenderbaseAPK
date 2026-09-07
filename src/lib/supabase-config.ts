/**
 * Supabase configuration guard.
 *
 * Auth is optional until credentials exist: the app must still run, and the
 * sign-in button must explain itself rather than throwing an opaque error.
 * Safe to import from both client and server components.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Placeholder values ship in .env.example; treat them as "not configured". */
function isPlaceholder(v: string): boolean {
  return v === '' || v.includes('your-project') || v.includes('your-anon-key');
}

export const isSupabaseConfigured =
  !isPlaceholder(SUPABASE_URL) && !isPlaceholder(SUPABASE_ANON_KEY);

/**
 * Dev-only auth bypass, for browsing the app in a sandboxed preview where the
 * OAuth redirect URI cannot be allowlisted.
 *
 * Hard-gated on NODE_ENV !== 'production' as well as the flag, so it cannot be
 * switched on in a deployed build even by setting the env var. Never a
 * substitute for a real session: it only relaxes the route guard, and any
 * Supabase query still runs as an anonymous user under RLS.
 */
export const isAuthBypassed =
  process.env.NODE_ENV !== 'production' &&
  process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';
