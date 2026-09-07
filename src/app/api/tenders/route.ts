import { NextResponse } from 'next/server';
import { listTenders } from '@/lib/tenders';
import type { SortOption } from '@/types/tender';

/** Proxies the tender search so the API key stays on the server. */
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const page = await listTenders({
    query: sp.get('q') ?? undefined,
    category: sp.get('category') ?? undefined,
    province: sp.get('province') ?? undefined,
    organisation: sp.get('organisation') ?? undefined,
    status: sp.get('status') ?? undefined,
    closingWithin: sp.get('closingWithin') ?? undefined,
    sort: (sp.get('sort') as SortOption) ?? undefined,
    page: Number(sp.get('page') ?? 1),
    limit: Number(sp.get('limit') ?? 20),
  });
  return NextResponse.json(page, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  });
}
