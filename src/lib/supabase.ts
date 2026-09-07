import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client. Env vars are the only config — no secrets in code.
 * Works inside Capacitor because it talks to the hosted Supabase URL.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
