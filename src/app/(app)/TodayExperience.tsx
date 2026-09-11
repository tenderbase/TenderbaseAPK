'use client';

import Link from 'next/link';
import { ArrowUpRight, Bell, CalendarClock, CheckCircle2, ChevronRight, Clock3, FileSearch, Search, Sparkles, Target, TrendingUp, ShieldCheck } from 'lucide-react';
import type { TenderWithUserState } from '@/types/tender';

interface Props {
  latest: TenderWithUserState[];
  closingSoon: TenderWithUserState[];
  stats: { open: number; closing: number };
  signedIn?: boolean;
  firstName?: string | null;
}

export function TodayExperience({ latest, closingSoon, stats, signedIn = false, firstName }: Props) {
  const name = firstName || 'there';
  const urgent = closingSoon.slice(0, 3);
  const newMatches = latest.slice(0, 4);

  return (
    <main className="tb-today min-h-screen pb-[108px]">
      <section className="tb-today-hero">
        <div className="tb-today-topline">
          <div>
            <p className="text-[12px] font-medium text-white/55">{greeting()}</p>
            <h1 className="mt-0.5 text-[25px] font-semibold tracking-[-0.045em] text-white">{signedIn ? `Good to see you, ${name}.` : 'Good to see you.'}</h1>
          </div>
          <Link href="/alerts" aria-label="Alerts" className="tb-today-bell"><Bell size={19}/><span/></Link>
        </div>

        <div className="mt-8 max-w-[680px]">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-blue-200/70">Your tender department</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-[1.08] tracking-[-.055em] text-white sm:text-[40px]">Know what matters.<br/>Do the next right thing.</h2>
          <p className="mt-3 max-w-[560px] text-[14px] leading-6 text-white/60">TenderBase watches the public tender market, ranks opportunities and keeps the work around your bids under control.</p>
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link href="/search" className="tb-today-primary"><Search size={16}/> Find opportunities <ArrowUpRight size={15}/></Link>
          <Link href="/research" className="tb-today-ghost"><TrendingUp size={16}/> Research market</Link>
        </div>
      </section>

      <div className="tb-today-body">
        <section className="tb-attention-grid">
          <div className="tb-attention-card tb-attention-main">
            <div className="flex items-center justify-between">
              <div><p className="tb-eyebrow">Owner work queue</p><h3 className="mt-1 tb-section-title">What needs attention</h3></div>
              <span className="tb-ai-orb"><Sparkles size={17}/></span>
            </div>
            <div className="mt-5 space-y-1">
              {urgent.length > 0 ? urgent.map((t, index) => <Link href={`/tenders/${t.id}`} key={t.id} className="tb-next-row">
                <span className={`tb-next-icon ${index === 0 ? 'is-warning' : ''}`}>{index === 0 ? <Clock3 size={17}/> : <Target size={17}/>}</span>
                <span className="min-w-0 flex-1"><strong>{index === 0 ? 'Review closing tender' : 'Check opportunity'}</strong><small>{t.organisation || 'Tender opportunity'} · {formatDate(t.closingDate)}</small></span>
                <span className="tb-next-due">{daysLabel(t.closingDate)}</span><ChevronRight size={17} className="text-ink-3"/>
              </Link>) : <div className="rounded-[12px] bg-canvas px-4 py-5 text-[12px] leading-5 text-ink-2">No urgent deadlines detected. Use the time to review new matches or research future buyers.</div>}
            </div>
            <Link href="/pipeline" className="mt-4 inline-flex items-center gap-1 text-[12px] font-semibold text-navy">Open bid pipeline <ChevronRight size={14}/></Link>
          </div>

          <div className="tb-focus-card">
            <div className="flex items-center justify-between"><p className="tb-eyebrow text-white/45">Tender radar</p><span className="text-[11px] font-medium text-white/45">Public market</span></div>
            <div className="mt-5 flex items-end gap-3"><strong>{stats.open.toLocaleString('en-ZA')}</strong><span>open opportunities</span></div>
            <div className="tb-radar-line"><i style={{width: `${Math.min(100, Math.max(12, stats.closing * 5))}%`}}/></div>
            <p className="mt-3 text-[12px] leading-5 text-white/55"><b className="text-white/85">{stats.closing}</b> closing soon. TenderBase ranks them by relevance rather than making you scan everything.</p>
            <Link href="/search?closingWithin=7d" className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white">Review closing soon <ArrowUpRight size={14}/></Link>
          </div>
        </section>

        <section className="mt-9">
          <div className="tb-section-head"><div><p className="tb-eyebrow">Daily control</p><h3 className="tb-section-title mt-1">Your tender desk</h3></div><Link href="/readiness" className="tb-section-link">Readiness <ChevronRight size={15}/></Link></div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <DeskCard icon={<FileSearch size={18}/>} title={`${newMatches.length} new matches`} text="Review high-fit opportunities" href="/search" />
            <DeskCard icon={<Clock3 size={18}/>} title={`${stats.closing} deadlines`} text="Keep dates under control" href="/search?closingWithin=7d" />
            <DeskCard icon={<ShieldCheck size={18}/>} title="Readiness" text="Check what could block a bid" href="/readiness" />
            <DeskCard icon={<TrendingUp size={18}/>} title="Market research" text="See where buyers are active" href="/research" />
          </div>
        </section>

        <section className="mt-10">
          <div className="tb-section-head"><div><p className="tb-eyebrow">AI screening</p><h3 className="tb-section-title mt-1">New opportunities worth a look</h3></div><Link href="/search" className="tb-section-link">Find all <ChevronRight size={15}/></Link></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {newMatches.map((t) => <Link key={t.id} href={`/tenders/${t.id}`} className="tb-discovery-card">
              <div className="flex items-center justify-between gap-3"><span className="tb-discovery-label">MATCH</span><ArrowUpRight size={17} className="text-ink-3"/></div>
              <h4>{t.title}</h4><p>{t.organisation || 'Tender opportunity'}{t.category ? ` · ${t.category}` : ''}</p>
              <div className="mt-3 flex items-center gap-2 text-[10.5px] font-semibold text-navy"><Sparkles size={12}/> AI fit screening available</div>
            </Link>)}
          </div>
        </section>

        <Link href="/research" className="tb-today-bottom-cta"><span><b>Look beyond today's tenders</b><small>Research buyers, awards, categories and recurring public demand.</small></span><span className="tb-cta-arrow"><ArrowUpRight size={18}/></span></Link>
      </div>
    </main>
  );
}

function DeskCard({icon,title,text,href}:{icon:React.ReactNode;title:string;text:string;href:string}) { return <Link href={href} className="tb-day-card"><span className="tb-day-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={16} className="ml-auto text-ink-3"/></Link> }
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
function formatDate(value:string){const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';return new Intl.DateTimeFormat('en-ZA',{day:'2-digit',month:'short'}).format(d)}
function daysLabel(value:string){const d=new Date(value);if(Number.isNaN(d.getTime()))return 'Verify';const days=Math.ceil((d.getTime()-Date.now())/86400000);if(days<0)return 'Closed';if(days===0)return 'Today';if(days===1)return 'Tomorrow';return `${days} days`}
