import { NextResponse } from 'next/server';
import { getFacets } from '@/lib/tenders';

/**
 * Filter vocabularies for the search UI, from `/categories` and `/provinces`.
 *
 * Shape changed with the ingestion API: categories now arrive as
 * `{ name, count, group }` where `name` is the verbatim upstream category (what
 * `/tenders?category=` filters on) and `group` is the app's coarse taxonomy for
 * display. The old `{ provinces, categories, sources }` facet shape belonged to
 * the retired Railway service and had a `sources` axis this API does not have.
 */
export async function GET() {
  const facets = await getFacets();
  return NextResponse.json(facets, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  });
}
