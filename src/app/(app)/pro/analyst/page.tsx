import type { Metadata } from 'next';
import Link from 'next/link';
import { Crown } from 'lucide-react';
import { getLatest } from '@/lib/tenders';
import { getServerTier } from '@/lib/tier-server';
import { BidAnalystView } from './BidAnalystView';

export const metadata: Metadata = { title: 'Bid Analyst · TenderBase Pro' };
export const dynamic = 'force-dynamic';

export default async function BidAnalystPage() {
  const { tier } = await getServerTier();
  if (tier !== 'pro') {
    return (
      <main className="min-h-screen bg-canvas px-5 py-10">
        <section className="mx-auto max-w-lg rounded-[20px] border border-line bg-white p-7 text-center shadow-card">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-[14px] bg-pro text-[#3d3205]"><Crown size={23} /></span>
          <h1 className="mt-4 text-[23px] font-bold tracking-[-0.03em] text-ink">Bid Analyst is a Pro workspace</h1>
          <p className="mt-2 text-[13px] leading-5 text-ink-2">Upgrade to rank opportunities, review fit signals and build your tender decision workflow.</p>
          <Link href="/pro" className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] bg-navy px-5 text-[13px] font-semibold text-white">View Pro <Crown size={14} /></Link>
        </section>
      </main>
    );
  }

  const latest = await getLatest(24);
  return <BidAnalystView tenders={latest.results} />;
}
