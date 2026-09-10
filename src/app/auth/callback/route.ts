import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { safeNext, welcomeHref } from '@/lib/onboarding';
import { onboardingDecided } from '@/lib/onboarding.server';

/**
 * OAuth callback. Google sends the user here with a one-time `code`, which is
 * exchanged for a session cookie.
 *
 * Registered in two places, which must match exactly:
 *   - Supabase -> Authentication -> URL Configuration -> Redirect URLs
 *   - (Google Cloud only knows Supabase's own /auth/v1/callback, not this one)
 */
export async function GET(request: Request) {
  const { searchParams, origin: rawOrigin } = new URL(request.url);

  // The dev server binds 0.0.0.0, which is not a browsable host. Prefer the
  // Host header the browser actually used.
  const host = request.headers.get('host');
  const origin = host ? `${new URL(rawOrigin).protocol}//${host}` : rawOrigin;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  // Google reports user-facing failures (e.g. consent denied) as params.
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error');
  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/auth/auth-error?reason=${encodeURIComponent(oauthError)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-error?reason=missing_code`);
  }

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/auth-error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  // Only allow internal redirects — an open redirect here would be a phishing
  // vector, since the user has just authenticated.
  const target = safeNext(next);

  // First run: with no onboarding row we still owe this account the Basic/Pro
  // decision, so land there and remember where they were headed. A read that
  // fails (migrations not run) counts as decided — never a redirect loop.
  const decided = await onboardingDecided(supabase);
  const destination = decided ? target : welcomeHref(target);

  // Behind a proxy the origin is the internal host, so prefer the forwarded one.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocal = process.env.NODE_ENV === 'development';
  const base = !isLocal && forwardedHost ? `https://${forwardedHost}` : origin;

  return NextResponse.redirect(`${base}${destination}`);
}
