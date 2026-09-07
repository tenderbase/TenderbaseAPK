import { Suspense } from 'react';
import { SummaryView } from './SummaryView';
import { summariseTender } from '@/lib/ai';

/**
 * Summaries are generated on demand and cached for an hour: a tender's
 * documents rarely change, and the Gemini free tier is rate-limited.
 */
export const revalidate = 3600;

export default async function SummaryPage({ params }: { params: { id: string } }) {
  const summary = await summariseTender(params.id);
  return (
    <Suspense fallback={null}>
      <SummaryView summary={summary} />
    </Suspense>
  );
}
