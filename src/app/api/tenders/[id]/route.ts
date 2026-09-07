import { NextResponse } from 'next/server';
import { getTender } from '@/lib/tenders';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await getTender(params.id);
  if (!result) {
    return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  }
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  });
}
