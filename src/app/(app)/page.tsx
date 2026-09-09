import type { Metadata } from 'next';
import { DashboardView } from './DashboardView';
import { getClosingSoon, getLatest, getStats } from '@/lib/tenders';

export const metadata: Metadata = {
  title: 'TenderBase — Find the opportunities that matter',
};

/**
 * Server component: fetches live tenders on the server so upstream concerns
 * never reach the client bundle. Revalidates on the ISR window set in
 * tender-api.server.
 */
export const revalidate = 300;

export default async function DashboardPage() {
  // Parallel — these are independent upstream calls.
  const [stats, closingPage, latest] = await Promise.all([
    getStats(),
    getClosingSoon(6, 7),
    getLatest(8),
  ]);

  // Prefer the fixture notice: it is the one that explains why the whole page is
  // showing captured data rather than live rows.
  const source = latest.source === 'fixture' || stats.source === 'fixture' ? 'fixture' : 'live';
  const notice = latest.notice ?? stats.notice ?? closingPage.notice;

  return (
    <DashboardView
      latest={latest.results}
      closingSoon={closingPage.results}
      stats={{
        // Real counts from /stats, not the row count of a 1-record probe.
        open: stats.activeTenders,
        closing: closingPage.total || stats.expiringSoonTenders,
      }}
      source={source}
      notice={notice}
    />
  );
}
