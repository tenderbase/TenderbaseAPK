'use client';

import Link from 'next/link';
import { ArrowUpRight, Bell, CalendarDays, CheckCircle2, ChevronRight, Clock3, Menu, Plus, Sparkles, Target, Users } from 'lucide-react';
import type { TenderWithUserState } from '@/types/tender';

interface Props {
  latest: TenderWithUserState[];
  closingSoon: TenderWithUserState[];
  stats: { open: number; closing: number };
  signedIn?: boolean;
  firstName?: string | null;
}

const demoWork = [
  { label: 'Pricing schedule', meta: 'Municipal Offices · Michael', due: 'Today, 4:00 PM', tone: 'warning' },
  { label: 'Tender decision', meta: 'R18.5M · Municipal Offices', due: 'Needs your decision', tone: 'blue' },
];

export function TodayExperience({ latest, closingSoon, stats, signedIn = false, firstName }: Props) {
  const name = firstName || 'there';
  return (
    <main className="tb-today min-h-screen pb-[108px]">
      <section className="tb-today-hero">
        <div className="tb-today-topline">
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" className="tb-today-menu md:hidden"><Menu size={20}/></button>
            <div>
              <p className="text-[12px] font-medium text-white/55">{greeting()}</p>
              <h1 className="mt-0.5 text-[25px] font-semibold tracking-[-0.045em] text-white">Good to see you{signedIn ? `, ${name}` : ''}.</h1>
            </div>
          </div>
          <Link href="/alerts" aria-label="Alerts" className="tb-today-bell"><Bell size={19}/><span/></Link>
        </div>

        <div className="mt-8 max-w-[620px]">
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-blue-200/70">Your command centre</p>
          <h2 className="mt-2 text-[32px] font-semibold leading-[1.08] tracking-[-.055em] text-white sm:text-[38px]">Know what matters.<br/>Move the right tenders forward.</h2>
          <p className="mt-3 max-w-[520px] text-[14px] leading-6 text-white/60">One quiet place for today's decisions, deadlines and team work.</p>
        </div>

        <div className="mt-7 flex flex-wrap gap-2.5">
          <Link href="/search" className="tb-today-primary"><Sparkles size={16}/> Find opportunities <ArrowUpRight size={15}/></Link>
          <Link href="/calendar" className="tb-today-ghost"><CalendarDays size={16}/> View calendar</Link>
        </div>
      </section>

      <div className="tb-today-body">
        <section className="tb-attention-grid">
          <div className="tb-attention-card tb-attention-main">
            <div className="flex items-center justify-between">
              <div><p className="tb-eyebrow">Needs your attention</p><h3 className="mt-1 tb-section-title">The next right move</h3></div>
              <span className="tb-ai-orb"><Sparkles size={17}/></span>
            </div>
            <div className="mt-6 space-y-1">
              {demoWork.map((item) => <Link href="/pipeline" key={item.label} className="tb-next-row">
                <span className={`tb-next-icon ${item.tone === 'warning' ? 'is-warning' : ''}`}>{item.tone === 'warning' ? <Clock3 size={17}/> : <Target size={17}/>}</span>
                <span className="min-w-0 flex-1"><strong>{item.label}</strong><small>{item.meta}</small></span>
                <span className="tb-next-due">{item.due}</span><ChevronRight size={17} className="text-ink-3"/>
              </Link>)}
            </div>
          </div>

          <div className="tb-focus-card">
            <div className="flex items-center justify-between"><p className="tb-eyebrow text-white/45">Your tender radar</p><span className="text-[11px] font-medium text-white/45">Live</span></div>
            <div className="mt-5 flex items-end gap-3"><strong>{stats.open.toLocaleString('en-ZA')}</strong><span>open opportunities</span></div>
            <div className="tb-radar-line"><i style={{width: `${Math.min(100, Math.max(12, stats.closing * 5))}%`}}/></div>
            <p className="mt-3 text-[12px] leading-5 text-white/55"><b className="text-white/85">{stats.closing}</b> closing soon. Keep your pipeline moving before deadlines become urgent.</p>
            <Link href="/search?closingWithin=7d" className="mt-5 inline-flex items-center gap-1.5 text-[12px] font-semibold text-white">See closing soon <ArrowUpRight size={14}/></Link>
          </div>
        </section>

        <section className="mt-9">
          <div className="tb-section-head"><div><p className="tb-eyebrow">Today</p><h3 className="tb-section-title mt-1">Your working day</h3></div><Link href="/calendar" className="tb-section-link">Calendar <ChevronRight size={15}/></Link></div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <DayCard icon={<CheckCircle2 size={18}/>} title="2 tasks" text="Need your attention today" href="/pipeline" />
            <DayCard icon={<Clock3 size={18}/>} title={`${stats.closing} deadlines`} text="Closing within the week" href="/search?closingWithin=7d" />
            <DayCard icon={<Users size={18}/>} title="Team activity" text="Keep work moving together" href="/profile" />
          </div>
        </section>

        {closingSoon.length > 0 && <section className="mt-10">
          <div className="tb-section-head"><div><p className="tb-eyebrow">Deadline radar</p><h3 className="tb-section-title mt-1">Closing soon</h3></div><Link href="/search?closingWithin=7d" className="tb-section-link">See all <ChevronRight size={15}/></Link></div>
          <div className="mt-4 space-y-2.5">
            {closingSoon.slice(0, 3).map((t) => <Link key={t.id} href={`/tenders/${t.id}`} className="tb-tender-row">
              <span className="tb-tender-date">{formatDate(t.closingDate)}</span>
              <span className="min-w-0 flex-1"><strong>{t.title}</strong><small>{t.organisation || 'Tender opportunity'}{t.valueCents != null ? ` · ${formatValue(t.valueCents)}` : ''}</small></span>
              <ChevronRight size={17} className="text-ink-3"/>
            </Link>)}
          </div>
        </section>}

        <section className="mt-10">
          <div className="tb-section-head"><div><p className="tb-eyebrow">Discovery</p><h3 className="tb-section-title mt-1">Fresh opportunities</h3></div><Link href="/search" className="tb-section-link">Discover <ChevronRight size={15}/></Link></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {latest.slice(0, 4).map((t) => <Link key={t.id} href={`/tenders/${t.id}`} className="tb-discovery-card">
              <div className="flex items-center justify-between gap-3"><span className="tb-discovery-label">NEW</span><ArrowUpRight size={17} className="text-ink-3"/></div>
              <h4>{t.title}</h4><p>{t.organisation || 'Tender opportunity'}</p>
            </Link>)}
          </div>
        </section>

        <Link href="/pipeline" className="tb-today-bottom-cta"><span><b>Keep the pipeline moving</b><small>Review active tenders, ownership and next actions.</small></span><span className="tb-cta-arrow"><ArrowUpRight size={18}/></span></Link>
      </div>
    </main>
  );
}

function DayCard({icon,title,text,href}:{icon:React.ReactNode;title:string;text:string;href:string}) { return <Link href={href} className="tb-day-card"><span className="tb-day-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={16} className="ml-auto text-ink-3"/></Link> }
function greeting(){const h=new Date().getHours();return h<12?'Good morning':h<17?'Good afternoon':'Good evening'}
function formatDate(value:string){const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';return new Intl.DateTimeFormat('en-ZA',{day:'2-digit',month:'short'}).format(d)}
function formatValue(cents:number){return new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR',maximumFractionDigits:0}).format(cents/100)}
