import type { Metadata } from 'next';
import { TodayExperience } from './TodayExperience';
import { getClosingSoon, getFacets, getLatest, getStats } from '@/lib/tenders';

export const metadata: Metadata = {
  title: 'TenderBase — Your tender command centre',
};

export const revalidate = 300;

export default async function DashboardPage() {
  const [stats, closingPage, latest, facets] = await Promise.all([
    getStats(),
    getClosingSoon(6, 7),
    getLatest(8),
    getFacets(),
  ]);

  const source = latest.source === 'fixture' || stats.source === 'fixture' ? 'fixture' : stats.source;
  const notice = latest.notice ?? stats.notice ?? closingPage.notice;

  return (
    <TodayExperience
      latest={latest.results}
      closingSoon={closingPage.results}
      stats={{ open: stats.activeTenders, closing: closingPage.total || stats.expiringSoonTenders }}
    />
  );
}
