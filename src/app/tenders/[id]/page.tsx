import { notFound } from 'next/navigation';
import { TenderDetailView } from './TenderDetailView';
import { getTender } from '@/lib/tenders';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const result = await getTender(params.id);
  if (!result) notFound();
  if (result.source === 'error') return { title: 'Service unavailable · TenderBase' };
  return {
    title: `${result.tender.title} · TenderBase`,
    description: result.tender.description?.slice(0, 155),
  };
}

export default async function TenderDetailPage({ params }: { params: { id: string } }) {
  const result = await getTender(params.id);
  if (!result) notFound();
  if (result.source === 'error') {
    // Honest outage state — distinct from "tender not found" and from the
    // captured-fixture notice dev builds show.
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center">
        <p className="text-[15px] font-semibold text-ink">{result.notice}</p>
        <p className="mt-2 text-body text-ink-2">
          The tender you opened is still on the eTenders portal — nothing has been lost.
        </p>
        <a
          href="/search"
          className="mt-6 inline-flex h-[52px] items-center rounded-md bg-navy px-6 font-semibold text-white"
        >
          Back to search
        </a>
      </main>
    );
  }

  return (
    <TenderDetailView
      tender={result.tender}
      amendments={'amendments' in result.tender ? result.tender.amendments : []}
      source={result.source}
    />
  );
}
