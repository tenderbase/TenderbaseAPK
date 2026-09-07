import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-config';

/**
 * Server-side Supabase client, backed by the Next.js cookie store.
 *
 * Used in Server Components, Route Handlers and Server Actions. Writing
 * cookies throws in a Server Component render, so those failures are
 * swallowed -- middleware is what actually refreshes the session.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; middleware handles the refresh.
        }
      },
    },
  });
}

/** The signed-in user, or null. Never throws when Supabase isn't configured. */
export async function getUser() {
  const { isSupabaseConfigured } = await import('./supabase-config');
  if (!isSupabaseConfigured) return null;
  try {
    // getUser() revalidates against the auth server; getSession() trusts the
    // cookie and must not be used for authorisation decisions.
    const { data, error } = await createClient().auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
}
