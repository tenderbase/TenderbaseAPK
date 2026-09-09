import type { Metadata } from 'next';
import { DashboardView } from './DashboardView';
import { getClosingSoon, getFacets, getLatest, getStats } from '@/lib/tenders';

export const metadata: Metadata = {
  title: 'TenderBase — Find the opportunities that matter',
};

/**
 * Server component: fetches live tenders on the server so upstream concerns
 * never reach the client bundle. Revalidates on the ISR window set in
 * tender-api.server. Facet categories also feed the guest home's quick chips.
 */
export const revalidate = 300;

export default async function DashboardPage() {
  // Parallel — these are independent upstream calls.
  const [stats, closingPage, latest, facets] = await Promise.all([
    getStats(),
    getClosingSoon(6, 7),
    getLatest(8),
    getFacets(),
  ]);

  // Prefer the fixture notice: it is the one that explains why the whole page
  // is showing captured data rather than live rows.
  const source = latest.source === 'fixture' || stats.source === 'fixture' ? 'fixture' : stats.source;
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
      guestCategories={
        facets.source === 'live' || facets.source === 'fixture'
          ? facets.categories.slice(0, 6).map((c) => ({ name: c.name, count: c.count }))
          : []
      }
    />
  );
}
