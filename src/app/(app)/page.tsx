import { DashboardView } from './DashboardView';
import { getLatest, listTenders } from '@/lib/tenders';

/**
 * Server component: fetches live tenders on the server so the API key never
 * reaches the client. Revalidates on the ISR window set in tender-api.server.
 */
export const revalidate = 300;

export default async function DashboardPage() {
  // Parallel — these are independent upstream calls.
  const [allOpen, closingPage, latest] = await Promise.all([
    listTenders({ limit: 1 }),
    listTenders({ closingWithin: '7d', limit: 6 }),
    getLatest(8),
  ]);

  const source = latest.source;
  return (
    <DashboardView
      latest={latest.results}
      closingSoon={closingPage.results}
      stats={{
        newThisWeek: allOpen.total > 0 ? allOpen.total : latest.results.length,
        closingSoon: closingPage.total > 0 ? closingPage.total : closingPage.results.length,
        saved: 0,
      }}
      source={source}
      notice={latest.notice}
    />
  );
}
