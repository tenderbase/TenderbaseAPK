import { MatchView } from './MatchView';
import { matchTender } from '@/lib/ai';

export const revalidate = 3600;

export default async function MatchPage({ params }: { params: { id: string } }) {
  const match = await matchTender(params.id);
  return <MatchView match={match} />;
}
