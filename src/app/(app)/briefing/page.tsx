import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, CalendarRange } from 'lucide-react';
import { getUser } from '@/lib/supabase-server';
import { countSavedTenders } from '@/lib/saved-server';
import { getClosingSoon, getLatest, getStats } from '@/lib/tenders';
import { formatDate } from '@/lib/format';
import { CompactTenderCard } from '@/components/tender/CompactTenderCard';
import { TenderCard } from '@/components/tender/TenderCard';
import { DataSourceNotice } from '@/components/ui/DataSourceNotice';

export const metadata: Metadata = { title: 'Weekly Briefing · TenderBase' };
export const revalidate = 300;

function weekRange(now = new Date()): string {
  const mon = new Date(now);
  const dayOffset = (mon.getDay() + 6) % 7;
  mon.setDate(mon.getDate() - dayOffset);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return `${formatDate(mon.toISOString())} – ${formatDate(sun.toISOString())}`;
}

export default async function BriefingPage() {
  const user = await getUser();
  const [stats, closingPage, latest] = await Promise.all([getStats(), getClosingSoon(5, 7), getLatest(4)]);
  const savedCount = user ? await countSavedTenders() : 0;
  const source = stats.source === 'error' || latest.source === 'error' ? 'error' : 'live';
  const notice = latest.notice ?? stats.notice;

  return (
    <main className="pb-24">
      <header className="flex items-center gap-3 border-b border-line bg-white px-4 py-2">
        <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-blue-soft text-navy"><Sparkles size={17} strokeWidth={2} aria-hidden /></span>
        <div className="min-w-0 flex-1"><h1 className="text-card-title font-semibold tracking-[-0.02em]">Weekly Briefing</h1></div>
      </header>
      <div className="px-5 pt-3.5">
        <DataSourceNotice source={source} notice={notice} />
        <p className="mb-2 flex items-center gap-1.5 text-caption text-ink-3"><CalendarRange size={13} strokeWidth={2} aria-hidden />This week · {weekRange()}</p>
        <section className="rounded-lg border border-line bg-white p-4 shadow-card">
          <span className="rounded-md bg-navy/10 px-2 py-0.5 text-micro font-semibold text-navy">{user ? 'Your week in tenders' : 'The week in tenders'}</span>
          <dl className="mt-3.5 flex gap-2.5">
            {[[String(stats.activeTenders), 'Open right now', ''], [String(closingPage.total), 'Closing this week', 'text-soon'], [user ? String(savedCount) : '—', 'Saved by you', '']].map(([v, l, c]) => <div key={l} className="flex-1 rounded-[11px] bg-canvas p-2.5"><dd className={`text-[19px] font-bold leading-none tracking-[-0.04em] ${c}`}>{v}</dd><dt className="mt-1 text-micro leading-[13px] text-ink-3">{l}</dt></div>)}
          </dl>
          <p className="mt-3 text-[13px] leading-[19px] text-ink-2">These are live catalogue numbers. {user ? 'Your personal briefing will lead with tenders that match your business as your profile and preferences become more complete.' : 'A personal briefing starts with a free account and your business profile.'}</p>
        </section>
        {!user && <section className="mt-3.5 flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-7 text-center"><h2 className="text-card-title font-semibold tracking-[-0.02em] text-ink">Make this briefing yours</h2><p className="mt-1.5 max-w-[280px] text-meta text-ink-2">Sign in free, add your company profile, and TenderBase will match the week to you.</p><Link href="/login?next=/briefing" className="mt-4 inline-flex h-[46px] items-center justify-center rounded-md bg-navy px-5 text-[14.5px] font-semibold text-white">Sign in — it&apos;s free</Link></section>}
        {closingPage.results.length > 0 && <><div className="mb-3 mt-5 flex items-baseline justify-between"><h2 className="text-section font-semibold tracking-[-0.02em] text-ink">Closing this week</h2><Link href="/search?closingWithin=7d" className="text-meta font-semibold text-blue">See all</Link></div><div className="space-y-2.5">{closingPage.results.map((t) => <CompactTenderCard key={t.id} tender={t} />)}</div></>}
        {latest.results.length > 0 && <><div className="mb-3 mt-5 flex items-baseline justify-between"><h2 className="text-section font-semibold tracking-[-0.02em] text-ink">Latest published</h2><Link href="/search" className="text-meta font-semibold text-blue">See all</Link></div><div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">{latest.results.map((t) => <TenderCard key={t.id} tender={t} showTenderNumber={false} />)}</div></>}
      </div>
    </main>
  );
}
