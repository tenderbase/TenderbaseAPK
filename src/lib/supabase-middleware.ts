import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  SUPABASE_ANON_KEY, SUPABASE_URL, isAuthBypassed, isSupabaseConfigured,
} from './supabase-config';

/** Routes that require a signed-in user. */
const PROTECTED = ['/', '/search', '/saved', '/alerts', '/profile', '/tenders', '/briefing', '/welcome'];

/** Routes only a signed-out user should see. */
const AUTH_ROUTES = ['/login', '/signup'];

function isProtected(pathname: string): boolean {
  if (pathname === '/') return true;
  return PROTECTED.some((p) => p !== '/' && pathname.startsWith(p));
}

/**
 * Refreshes the auth cookie on every request and enforces route access.
 *
 * The response object must be the one Supabase wrote cookies onto, otherwise
 * the refreshed token is silently dropped and the user is logged out at random.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Without credentials the app runs unauthenticated rather than erroring.
  if (!isSupabaseConfigured) return response;

  // Preview bypass: skip the guard entirely, but still refresh any real session.
  if (isAuthBypassed) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (!user && isProtected(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    // Preserve where they were headed so login can return them there.
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && AUTH_ROUTES.some((p) => pathname.startsWith(p))) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
