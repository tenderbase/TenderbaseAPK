import { notFound } from 'next/navigation';
import { DirectTender } from './DirectTender';
import { TenderDetailView } from './TenderDetailViewV2';
import { TenderDecisionStrip } from './TenderDecisionStrip';
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
    return <DirectTender id={params.id} serverNotice={result.notice} />;
  }

  return (
    <>
      <TenderDecisionStrip tender={result.tender} />
      <TenderDetailView
        tender={result.tender}
        amendments={'amendments' in result.tender ? result.tender.amendments : []}
        source={result.source}
        via={result.via}
      />
    </>
  );
}
