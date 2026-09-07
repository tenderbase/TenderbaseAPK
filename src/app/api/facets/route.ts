import { NextResponse } from 'next/server';
import { getFacets } from '@/lib/tenders';

export async function GET() {
  const facets = await getFacets();
  if (!facets) return NextResponse.json({ provinces: [], categories: [], sources: [] });
  return NextResponse.json(facets, {
    headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' },
  });
}
