import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, BarChart3, Building2, ChevronRight, MapPinned, Search, Sparkles, Trophy, TrendingUp } from 'lucide-react';
import { getLatest, getStats } from '@/lib/tenders';

export const metadata: Metadata = { title: 'Research · TenderBase' };
export const revalidate = 600;

export default async function ResearchPage() {
  const [latest, stats] = await Promise.all([getLatest(30), getStats()]);
  const buyers = countBy(latest.results.map((t) => t.organisation).filter(Boolean) as string[]);
  const categories = countBy(latest.results.map((t) => t.category).filter(Boolean) as string[]);
  const provinces = countBy(latest.results.map((t) => t.province).filter(Boolean) as string[]);
  const topBuyers = Object.entries(buyers).sort((a,b) => b[1]-a[1]).slice(0,5);
  const topCategories = Object.entries(categories).sort((a,b) => b[1]-a[1]).slice(0,5);
  const topProvinces = Object.entries(provinces).sort((a,b) => b[1]-a[1]).slice(0,5);

  return (
    <main className="tb-page pb-24">
      <header className="tb-content pt-6 sm:pt-8">
        <p className="tb-eyebrow">Public procurement intelligence</p>
        <div className="mt-1.5 flex items-start justify-between gap-4">
          <div><h1 className="text-h1 font-semibold text-navy">Research</h1><p className="mt-2 max-w-2xl text-body-lg text-ink-2">Understand where buyers are active before you spend time pursuing a tender.</p></div>
          <span className="hidden rounded-full bg-blue-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.08em] text-navy sm:inline-flex">AI-assisted</span>
        </div>
      </header>

      <section className="tb-content mt-6 grid gap-3 md:grid-cols-3">
        <ResearchCard icon={<Building2 size={18}/>} title="Buyer intelligence" text="See organisations publishing related opportunities and recurring demand." href="#buyers" />
        <ResearchCard icon={<BarChart3 size={18}/>} title="Category intelligence" text="Spot active categories from the public tender dataset." href="#categories" />
        <ResearchCard icon={<MapPinned size={18}/>} title="Regional demand" text="Compare where the current opportunity signal is strongest." href="#regions" />
      </section>

      <section className="tb-content mt-8 grid gap-3 sm:grid-cols-3">
        <Metric label="Open opportunities" value={stats.activeTenders.toLocaleString('en-ZA')} />
        <Metric label="New records analysed" value={String(latest.results.length)} />
        <Metric label="Closing soon" value={String(stats.expiringSoonTenders)} />
      </section>

      <section id="buyers" className="tb-content mt-10 grid gap-5 lg:grid-cols-2">
        <IntelList title="Active buyers" subtitle="Organisations appearing most often in the latest public records." icon={<Building2 size={17}/>} rows={topBuyers} empty="No buyer data is available yet." />
        <IntelList title="Active categories" subtitle="Where recent public tender activity is concentrated." icon={<TrendingUp size={17}/>} rows={topCategories} empty="No category data is available yet." />
      </section>

      <section id="regions" className="tb-content mt-5 grid gap-5 lg:grid-cols-2">
        <IntelList title="Regional signal" subtitle="Provinces represented in the latest records." icon={<MapPinned size={17}/>} rows={topProvinces} empty="No regional data is available yet." />
        <div id="categories" className="tb-card overflow-hidden">
          <div className="border-b border-line px-5 py-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-soft text-navy"><Trophy size={16}/></span><div><h2 className="text-[14px] font-semibold text-ink">What to investigate next</h2><p className="mt-0.5 text-[11px] text-ink-3">Use the market signal to decide where to look deeper.</p></div></div></div>
          <div className="divide-y divide-line">
            <Link href="/search" className="flex items-center gap-3 px-5 py-4 hover:bg-canvas"><Search size={17} className="text-ink-2"/><span className="flex-1"><b className="block text-[12.5px] text-ink">Find related opportunities</b><small className="text-[11px] text-ink-3">Turn a research insight into a live search.</small></span><ChevronRight size={16} className="text-ink-3"/></Link>
            <Link href="/briefing" className="flex items-center gap-3 px-5 py-4 hover:bg-canvas"><Sparkles size={17} className="text-ink-2"/><span className="flex-1"><b className="block text-[12.5px] text-ink">Read your market briefing</b><small className="text-[11px] text-ink-3">Let AI turn public activity into a concise review.</small></span><ChevronRight size={16} className="text-ink-3"/></Link>
          </div>
        </div>
      </section>

      <div className="tb-content mt-7 rounded-[14px] border border-line bg-canvas px-4 py-3 text-[11px] leading-5 text-ink-3"><b className="text-ink-2">Source discipline:</b> Research is based on TenderBase's public procurement data. AI explains patterns; it does not invent buyers, awards, values or future contracts. Verify important facts against the official source.</div>
    </main>
  );
}

function countBy(values: string[]) { return values.reduce<Record<string, number>>((acc, value) => { acc[value] = (acc[value] ?? 0) + 1; return acc; }, {}); }
function Metric({label,value}:{label:string;value:string}) { return <div className="tb-card p-4"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-ink-3">{label}</p><p className="mt-1 text-[22px] font-bold tracking-[-.03em] text-navy">{value}</p></div>; }
function ResearchCard({icon,title,text,href}:{icon:React.ReactNode;title:string;text:string;href:string}) { return <Link href={href} className="tb-card p-4 transition hover:-translate-y-0.5 hover:shadow-card"><span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-canvas text-navy">{icon}</span><h2 className="mt-4 text-[14px] font-semibold text-ink">{title}</h2><p className="mt-1.5 text-[11.5px] leading-5 text-ink-2">{text}</p><span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-navy">Investigate <ArrowUpRight size={13}/></span></Link>; }
function IntelList({title,subtitle,icon,rows,empty}:{title:string;subtitle:string;icon:React.ReactNode;rows:[string,number][];empty:string}) { return <div className="tb-card overflow-hidden"><div className="border-b border-line px-5 py-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-canvas text-navy">{icon}</span><div><h2 className="text-[14px] font-semibold text-ink">{title}</h2><p className="mt-0.5 text-[11px] text-ink-3">{subtitle}</p></div></div></div>{rows.length ? <div className="divide-y divide-line">{rows.map(([name,count],i)=><div key={name} className="flex items-center gap-3 px-5 py-3.5"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-canvas text-[10px] font-bold text-ink-3">{i+1}</span><span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">{name}</span><span className="text-[11px] text-ink-3">{count} records</span></div>)}</div> : <div className="px-5 py-8 text-[11.5px] text-ink-3">{empty}</div>}</div>; }
