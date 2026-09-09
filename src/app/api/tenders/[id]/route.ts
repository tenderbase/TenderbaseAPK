import { NextResponse } from 'next/server';
import { getTender } from '@/lib/tenders';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const result = await getTender(params.id);
  if (!result) {
    return NextResponse.json({ error: 'Tender not found' }, { status: 404 });
  }
  if (result.source === 'error') {
    return NextResponse.json(result, { status: 503 });
  }
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' },
  });
}
