import { notFound } from 'next/navigation';
import { TenderDetailView } from './TenderDetailView';
import { getTender } from '@/lib/tenders';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const result = await getTender(params.id);
  if (!result) return { title: 'Tender not found · TenderBase' };
  return {
    title: `${result.tender.title} · TenderBase`,
    description: result.tender.description?.slice(0, 155),
  };
}

export default async function TenderDetailPage({ params }: { params: { id: string } }) {
  const result = await getTender(params.id);
  if (!result) notFound();

  return (
    <TenderDetailView
      tender={result.tender}
      amendments={'amendments' in result.tender ? result.tender.amendments : []}
      source={result.source}
    />
  );
}
