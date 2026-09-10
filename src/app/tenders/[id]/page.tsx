import { notFound } from 'next/navigation';
import { DirectTender } from './DirectTender';
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
    // The server could not reach the ingestion API — it has no local copy of
    // this id and cannot tell "gone" from "unreachable". The browser resolves
    // it directly against the public upstream; `DirectTender` renders the real
    // detail, a true not-found, or the honest outage state.
    return <DirectTender id={params.id} serverNotice={result.notice} />;
  }

  return (
    <TenderDetailView
      tender={result.tender}
      amendments={'amendments' in result.tender ? result.tender.amendments : []}
      source={result.source}
      via={result.via}
    />
  );
}
