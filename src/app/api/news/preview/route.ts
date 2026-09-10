import { NextResponse } from 'next/server';
import { previewFeed, type NewsFeedError } from '@/lib/news.server';
import { getServerTier } from '@/lib/tier-server';
import { cookieGrantUnlocksServerAction } from '@/lib/tier-cookies';

/**
 * GET /api/news/preview?url=https://…
 *
 * Live test of an arbitrary RSS/Atom feed for the Pro custom-feed flow:
 * fetches and parses the URL server-side and returns the latest stories so
 * the user sees exactly what would land in their feed before saving.
 * Pro-only (custom-rss).
 *
 * Two gates, because this is the one news endpoint where the server connects to
 * an address that came from a browser:
 *   1. Entitlement — and specifically a *verified* one. The tier the UI runs on
 *      may legitimately come from a preview cookie, but a cookie must never be
 *      what unlocks a server-side fetch (`cookieGrantUnlocksServerAction`).
 *   2. The target itself — `previewFeed` rejects anything that resolves to a
 *      loopback, private, link-local or otherwise reserved address, per hop
 *      (see `lib/feed-target.ts`). A 403 is not a network boundary here.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const url = sp.get('url') ?? '';

  const { tier, source } = await getServerTier();
  if (tier !== 'pro') {
    return NextResponse.json({ error: 'Custom feeds are a Pro feature.' }, { status: 403 });
  }
  if (!cookieGrantUnlocksServerAction({ source, isProduction: process.env.NODE_ENV === 'production' })) {
    return NextResponse.json(
      {
        // `error` carries the sentence because that is what the UI shows.
        error: 'Testing a custom feed runs on our server, so it needs a verified subscription rather than a preview grant.',
        code: 'needs_verified_subscription',
      },
      { status: 403 },
    );
  }

  try {
    const result = await previewFeed(url);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const e = err as NewsFeedError;
    // A blocked target is the user's URL being unfeedable *and* our policy
    // refusing it; say so with 400 rather than 422 ("not a feed"), and never
    // echo the resolved address back.
    if (e.code === 'BLOCKED') {
      return NextResponse.json(
        { ok: false, error: e.message ?? 'That feed address is not allowed.', code: 'BLOCKED' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e.message ?? 'Could not read that feed.', code: e.code ?? 'NETWORK_ERROR' },
      { status: 422 },
    );
  }
}
