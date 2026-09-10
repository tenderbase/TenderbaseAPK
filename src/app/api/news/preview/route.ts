import { NextResponse } from 'next/server';
import { previewFeed, type NewsFeedError } from '@/lib/news.server';
import { getServerTier } from '@/lib/tier-server';

/**
 * GET /api/news/preview?url=https://…
 *
 * Live test of an arbitrary RSS/Atom feed for the Pro custom-feed flow:
 * fetches and parses the URL server-side and returns the latest stories so
 * the user sees exactly what would land in their feed before saving.
 * Pro-only (custom-rss).
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const url = sp.get('url') ?? '';

  const { tier } = await getServerTier();
  if (tier !== 'pro') {
    return NextResponse.json({ error: 'Custom feeds are a Pro feature.' }, { status: 403 });
  }

  try {
    const result = await previewFeed(url);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const e = err as NewsFeedError;
    return NextResponse.json(
      { ok: false, error: e.message ?? 'Could not read that feed.', code: e.code ?? 'NETWORK_ERROR' },
      { status: 422 },
    );
  }
}
