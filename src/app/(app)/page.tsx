import type { Metadata } from 'next';
import { TodayExperience } from './TodayExperience';
import { getClosingSoon, getLatest, getStats } from '@/lib/tenders';

export const metadata: Metadata = {
  title: 'TenderBase — Your tender command centre',
};

export const revalidate = 300;

export default async function DashboardPage() {
  const [stats, closingPage, latest] = await Promise.all([
    getStats(),
    getClosingSoon(6, 7),
    getLatest(8),
  ]);

  return (
    <TodayExperience
      latest={latest.results}
      closingSoon={closingPage.results}
      stats={{
        open: stats.activeTenders,
        closing: closingPage.total || stats.expiringSoonTenders,
      }}
    />
  );
}
