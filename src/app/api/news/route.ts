import { NextResponse } from 'next/server';
import { getNewsRail, type NewsFeedError } from '@/lib/news.server';
import { getServerTier } from '@/lib/tier-server';
import { canReadRailCount } from '@/lib/news-sources';
import { NEWS_RAIL_IDS, type NewsRailId } from '@/types/news';

/**
 * GET /api/news?rail=Business
 *
 * Returns one rail's merged, newest-first stories with an honest envelope
 * (live / fixture / error + per-feed status). Rail entitlement is enforced
 * server-side from the tier cookie — the same model the screens use, so the
 * API never hands a guest a Pro rail even if the UI is bypassed.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const rail = sp.get('rail') as NewsRailId | null;

  if (!rail || !NEWS_RAIL_IDS.includes(rail)) {
    return NextResponse.json({ error: 'Unknown news category.' }, { status: 400 });
  }

  const { tier } = await getServerTier();
  const allowedCount = canReadRailCount(tier);
  const index = NEWS_RAIL_IDS.indexOf(rail);
  if (index >= allowedCount) {
    return NextResponse.json(
      { error: tier === 'free' ? 'Sign in to read more news categories.' : 'This category is Pro — see all news categories with Pro.' },
      { status: 403 },
    );
  }

  try {
    const envelope = await getNewsRail(rail);
    return NextResponse.json(envelope, {
      headers: { 'Cache-Control': 's-maxage=240, stale-while-revalidate=600' },
    });
  } catch (err) {
    const code = (err as NewsFeedError).code ?? 'NETWORK_ERROR';
    return NextResponse.json(
      { error: `News feeds are unreachable right now (${code}).`, code },
      { status: 502 },
    );
  }
}
