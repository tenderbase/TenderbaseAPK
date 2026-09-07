import { DashboardView } from './DashboardView';
import { getClosingSoon, getLatest } from '@/lib/tenders';

/**
 * Server component: fetches live tenders on the server so the API key never
 * reaches the client. Revalidates on the ISR window set in tender-api.server.
 */
export const revalidate = 300;

export default async function DashboardPage() {
  // Parallel — these are independent upstream calls.
  const [latest, closing] = await Promise.all([getLatest(8), getClosingSoon(6)]);

  const source = latest.source;
  return (
    <DashboardView
      latest={latest.results}
      closingSoon={closing.results}
      stats={{
        newThisWeek: latest.total,
        closingSoon: closing.total,
        saved: 0,
      }}
      source={source}
      notice={latest.notice}
    />
  );
}
