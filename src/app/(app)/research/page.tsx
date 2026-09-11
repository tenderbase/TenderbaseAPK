import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Layers3,
  MapPinned,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { getLatest, getStats } from '@/lib/tenders';

export const metadata: Metadata = { title: 'Research · TenderBase' };
export const revalidate = 600;

export default async function ResearchPage() {
  const [latest, stats] = await Promise.all([getLatest(30), getStats()]);
  const records = latest.results;
  const buyers = countBy(records.map((t) => t.organisation).filter(Boolean) as string[]);
  const categories = countBy(records.map((t) => t.category).filter(Boolean) as string[]);
  const provinces = countBy(records.map((t) => t.province).filter(Boolean) as string[]);
  const topBuyers = topEntries(buyers);
  const topCategories = topEntries(categories);
  const topProvinces = topEntries(provinces);
  const uniqueBuyers = Object.keys(buyers).length;
  const uniqueCategories = Object.keys(categories).length;
  const uniqueProvinces = Object.keys(provinces).length;
  const topBuyerShare = records.length && topBuyers[0] ? Math.round((topBuyers[0][1] / records.length) * 100) : 0;
  const dated = records.filter((t) => t.publishedDate && t.closingDate);
  const averageDaysToClose = dated.length
    ? Math.round(dated.reduce((sum, t) => sum + Math.max(0, (new Date(t.closingDate).getTime() - new Date(t.publishedDate).getTime()) / 86400000), 0) / dated.length)
    : null;

  return (
    <main className="tb-page pb-24">
      <header className="tb-content pt-6 sm:pt-8">
        <div className="flex items-center gap-2">
          <span className="tb-eyebrow">Market intelligence</span>
          <span className="rounded-full bg-blue-soft px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-navy">Live data</span>
        </div>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-h1 font-semibold tracking-[-.035em] text-navy">Research</h1>
            <p className="mt-2 text-body-lg text-ink-2">Go beyond finding tenders. Understand which buyers are active, what they are buying, where demand is concentrated, and what deserves a closer look.</p>
          </div>
          <Link href="/search" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-navy px-4 text-[11.5px] font-bold text-white shadow-sm hover:opacity-95">
            <Search size={15} /> Explore live tenders <ArrowUpRight size={14} />
          </Link>
        </div>
      </header>

      <section className="tb-content mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<CircleDollarSign size={17} />} label="Open opportunities" value={stats.activeTenders.toLocaleString('en-ZA')} detail="Across the live dataset" />
        <Metric icon={<Building2 size={17} />} label="Active buyers" value={String(uniqueBuyers)} detail="In latest 30 records" />
        <Metric icon={<Layers3 size={17} />} label="Demand categories" value={String(uniqueCategories)} detail="Represented recently" />
        <Metric icon={<CalendarClock size={17} />} label="Avg. time to close" value={averageDaysToClose === null ? '—' : `${averageDaysToClose}d`} detail="Latest published records" />
      </section>

      <section className="tb-content mt-6 overflow-hidden rounded-2xl bg-[#0d1729] text-white shadow-card">
        <div className="grid lg:grid-cols-[1.35fr_.65fr]">
          <div className="p-5 sm:p-7">
            <div className="flex items-center gap-2 text-blue-200"><Sparkles size={16} /><span className="text-[10px] font-bold uppercase tracking-[.12em]">Research signal</span></div>
            <h2 className="mt-3 max-w-2xl text-[22px] font-extrabold tracking-[-.035em] sm:text-[27px]">Know the market before you commit bid time.</h2>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-blue-100/75">Research turns public procurement activity into practical signals. Use it to shortlist buyers, identify recurring categories, compare regions and decide where deeper tender analysis is worth your time.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <SignalPill icon={<Target size={13} />} text="Bid/no-bid context" />
              <SignalPill icon={<TrendingUp size={13} />} text="Demand patterns" />
              <SignalPill icon={<Compass size={13} />} text="Buyer discovery" />
            </div>
          </div>
          <div className="border-t border-white/10 bg-white/[.035] p-5 lg:border-l lg:border-t-0 sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[.1em] text-blue-100/55">Current concentration</p>
            <p className="mt-2 text-[30px] font-extrabold tracking-[-.04em]">{topBuyerShare}%</p>
            <p className="mt-1 text-[11px] leading-5 text-blue-100/70">of the latest 30 records come from the most represented buyer.</p>
            {topBuyers[0] && <p className="mt-4 truncate text-[12px] font-semibold text-white">{topBuyers[0][0]}</p>}
          </div>
        </div>
      </section>

      <section className="tb-content mt-7 grid gap-5 lg:grid-cols-2">
        <IntelList
          title="Buyer intelligence"
          subtitle="Who is appearing most often in the latest public records."
          icon={<Building2 size={17} />}
          rows={topBuyers}
          empty="No buyer data is available yet."
          href="/search"
          action="Find buyer tenders"
        />
        <IntelList
          title="Category intelligence"
          subtitle="Where recent procurement activity is concentrated."
          icon={<BarChart3 size={17} />}
          rows={topCategories}
          empty="No category data is available yet."
          href="/search"
          action="Explore categories"
        />
      </section>

      <section className="tb-content mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <IntelList
          title="Regional demand"
          subtitle="Provinces represented across the latest records."
          icon={<MapPinned size={17} />}
          rows={topProvinces}
          empty="No regional data is available yet."
          href="/search"
          action="Compare opportunities"
        />
        <div className="tb-card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-soft text-navy"><Trophy size={16} /></span>
              <div><h2 className="text-[14px] font-semibold text-ink">Research playbook</h2><p className="mt-0.5 text-[11px] text-ink-3">A simple path from market signal to action.</p></div>
            </div>
          </div>
          <div className="divide-y divide-line">
            <ResearchStep number="01" title="Spot demand" text="Look for buyers and categories with repeated activity." />
            <ResearchStep number="02" title="Validate fit" text="Open the underlying tender and check eligibility, scope and deadline." />
            <ResearchStep number="03" title="Investigate the buyer" text="Use public records and tender history to understand the opportunity context." />
            <ResearchStep number="04" title="Act" text="Move a qualified opportunity into your pipeline and build the bid plan." />
          </div>
          <Link href="/briefing" className="flex items-center gap-2 border-t border-line px-5 py-4 text-[11.5px] font-bold text-navy hover:bg-canvas">
            <Sparkles size={15} /> Get the AI market briefing <ChevronRight size={15} className="ml-auto" />
          </Link>
        </div>
      </section>

      <section className="tb-content mt-5 grid gap-3 sm:grid-cols-3">
        <InsightCard title="Buyer concentration" value={`${topBuyerShare}%`} text="Share of latest records represented by the top buyer." />
        <InsightCard title="Regional spread" value={`${uniqueProvinces}`} text="Distinct provinces represented in the latest records." />
        <InsightCard title="Closing pressure" value={String(stats.expiringSoonTenders)} text="Opportunities currently marked as closing soon." />
      </section>

      <div className="tb-content mt-7 rounded-[14px] border border-line bg-canvas px-4 py-3 text-[11px] leading-5 text-ink-3">
        <b className="text-ink-2">Source discipline:</b> Research is based on TenderBase&apos;s live public procurement data. These signals describe recent records; they are not forecasts of future awards or guaranteed buyer demand. AI can explain patterns, but important facts should be verified against the official tender source.
      </div>
    </main>
  );
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function topEntries(values: Record<string, number>) {
  return Object.entries(values).sort((a, b) => b[1] - a[1]).slice(0, 5);
}

function Metric({ icon, label, value, detail }: { icon: ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="tb-card p-4">
      <div className="flex items-center justify-between gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-soft text-navy">{icon}</span><span className="text-[9px] font-bold uppercase tracking-[.08em] text-ink-3">Live</span></div>
      <p className="mt-4 text-[10px] font-bold uppercase tracking-[.08em] text-ink-3">{label}</p>
      <p className="mt-1 text-[24px] font-extrabold tracking-[-.035em] text-navy">{value}</p>
      <p className="mt-0.5 text-[10.5px] text-ink-3">{detail}</p>
    </div>
  );
}

function SignalPill({ icon, text }: { icon: ReactNode; text: string }) {
  return <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[10px] font-semibold text-blue-50">{icon}{text}</span>;
}

function IntelList({ title, subtitle, icon, rows, empty, href, action }: { title: string; subtitle: string; icon: ReactNode; rows: [string, number][]; empty: string; href: string; action: string }) {
  return (
    <div className="tb-card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-canvas text-navy">{icon}</span><div><h2 className="text-[14px] font-semibold text-ink">{title}</h2><p className="mt-0.5 text-[11px] text-ink-3">{subtitle}</p></div></div>
      </div>
      {rows.length ? <div className="divide-y divide-line">{rows.map(([name, count], i) => <div key={name} className="flex items-center gap-3 px-5 py-3.5"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-canvas text-[10px] font-bold text-ink-3">{i + 1}</span><span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{name}</span><span className="shrink-0 rounded-full bg-canvas px-2 py-1 text-[10px] font-semibold text-ink-2">{count} records</span></div>)}</div> : <div className="px-5 py-8 text-[11.5px] text-ink-3">{empty}</div>}
      <Link href={href} className="flex items-center gap-2 border-t border-line px-5 py-3.5 text-[11px] font-bold text-navy hover:bg-canvas">{action}<ChevronRight size={14} className="ml-auto" /></Link>
    </div>
  );
}

function ResearchStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="flex gap-3 px-5 py-3.5"><span className="mt-0.5 text-[10px] font-extrabold text-ink-3">{number}</span><div><p className="text-[12px] font-semibold text-ink">{title}</p><p className="mt-0.5 text-[11px] leading-5 text-ink-3">{text}</p></div></div>;
}

function InsightCard({ title, value, text }: { title: string; value: string; text: string }) {
  return <div className="tb-card p-4"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-ink-3">{title}</p><p className="mt-1 text-[22px] font-extrabold tracking-[-.03em] text-navy">{value}</p><p className="mt-1 text-[11px] leading-5 text-ink-3">{text}</p></div>;
}
