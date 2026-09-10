import { NextResponse } from 'next/server';
import { listTenders } from '@/lib/tenders';
import type { SortOption } from '@/types/tender';

/**
 * Proxies `GET /tenders` on the ingestion API.
 *
 * Kept as a same-origin route handler even though the upstream is now public
 * and keyless: it gives the browser one stable contract, lets us add ISR cache
 * headers, and keeps `closingWithin` -> `closingAfter`/`closingBefore`
 * translation on the server where it can be unit-tested.
 *
 * `category` and `province` must arrive as the upstream's verbatim display
 * names ('Construction', 'KwaZulu-Natal'), not slugs — slugs match nothing.
 */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const num = (v: string | null, d: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : d;
  };

  const page = await listTenders({
    query: sp.get('q') ?? undefined,
    category: sp.get('category') ?? undefined,
    province: sp.get('province') ?? undefined,
    status: sp.get('status') ?? undefined,
    closingWithin: sp.get('closingWithin') ?? undefined,
    sort: (sp.get('sort') as SortOption) ?? undefined,
    page: num(sp.get('page'), 1),
    limit: num(sp.get('limit'), 20),
  });

  return NextResponse.json(page, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  });
}
