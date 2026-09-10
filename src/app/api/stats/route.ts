import { NextResponse } from 'next/server';
import { getStats } from '@/lib/tenders';

/**
 * Pipeline totals from `/stats`, used for the dashboard counters.
 *
 * Real numbers rather than the previous approximation, which counted "open
 * tenders" as whatever a 1-record list request reported as its total.
 */
export async function GET() {
  const stats = await getStats();
  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  });
}
