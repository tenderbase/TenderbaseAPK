'use client';

import Link from 'next/link';
import { ArrowRight, BrainCircuit, CheckCircle2, Clock3, FileText, MapPin, Target, TriangleAlert } from 'lucide-react';
import { daysUntil, formatDate, formatValue } from '@/lib/format';
import type { TenderWithUserState } from '@/types/tender';

function tone(score: number | null) {
  if (score === null) return { label: 'Fit pending', cls: 'bg-canvas text-ink-3' };
  if (score >= 80) return { label: 'Strong fit', cls: 'bg-open-bg text-open' };
  if (score >= 60) return { label: 'Worth reviewing', cls: 'bg-soon-bg text-soon' };
  return { label: 'Low fit', cls: 'bg-urgent-bg text-urgent' };
}

function AnalystCard({ tender }: { tender: TenderWithUserState }) {
  const score = tender.matchScore;
  const fit = tone(score);
  const days = tender.closingDate ? daysUntil(tender.closingDate) : null;
  return (
    <article className="rounded-[18px] border border-line bg-white p-4 shadow-card-sm hover:shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-soft text-blue"><Target size={18} /></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-md px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.07em] ${fit.cls}`}>{score === null ? '—' : `${score}%`} · {fit.label}</span>
            {days !== null && days >= 0 && days <= 3 && <span className="rounded-md bg-urgent-bg px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.07em] text-urgent">Closing soon</span>}
          </div>
          <h2 className="mt-2 text-[15px] font-semibold leading-[1.3] text-ink">{tender.title}</h2>
          <p className="mt-1 text-[11.5px] font-medium text-ink-3">{tender.organisation}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Deadline" value={tender.closingDate ? formatDate(tender.closingDate) : 'Not stated'} />
        <Metric label="Time" value={days === null ? '—' : days < 0 ? 'Closed' : days === 0 ? 'Today' : `${days} days`} />
        <Metric label="Value" value={formatValue(tender.valueCents)} />
        <Metric label="Documents" value={String(tender.documents.length)} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-ink-3">
          {tender.location && <span className="inline-flex items-center gap-1"><MapPin size={12} />{tender.location}</span>}
          <span className="inline-flex items-center gap-1"><FileText size={12} />{tender.category}</span>
        </div>
        <Link href={`/tenders/${tender.id}`} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-[10px] bg-navy px-3 text-[11.5px] font-semibold text-white">Analyse <ArrowRight size={13} /></Link>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[10px] bg-canvas px-2.5 py-2"><p className="text-[9px] font-bold uppercase tracking-[0.08em] text-ink-3">{label}</p><p className="mt-1 truncate text-[11.5px] font-semibold text-ink">{value}</p></div>;
}

export function BidAnalystView({ tenders }: { tenders: TenderWithUserState[] }) {
  const ranked = [...tenders].sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1));
  const strong = ranked.filter((t) => (t.matchScore ?? 0) >= 80).length;
  const closing = ranked.filter((t) => t.closingDate && daysUntil(t.closingDate) >= 0 && daysUntil(t.closingDate) <= 7).length;
  const withDocs = ranked.filter((t) => t.documents.length > 0).length;

  return (
    <main className="min-h-screen bg-canvas pb-28">
      <header className="border-b border-line bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-pro text-[#3d3205]"><BrainCircuit size={20} /></span><span className="rounded-md border border-pro-line bg-pro-soft px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#7a610f]">Pro Bid Analyst</span></div>
          <h1 className="mt-3 text-[28px] font-bold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[34px]">Decide what deserves your bid team&apos;s time.</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-[1.55] text-ink-2">A premium decision layer over your tender feed. Rank opportunities by the fit signals already available, then open the tender for deep analysis.</p>
          <div className="mt-5 grid max-w-xl grid-cols-3 gap-2.5">
            <Metric label="Strong fits" value={String(strong)} /><Metric label="Closing ≤ 7d" value={String(closing)} /><Metric label="With documents" value={String(withDocs)} />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <section className="mb-4 rounded-[16px] border border-blue/15 bg-blue-soft/45 p-4"><div className="flex gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-white text-blue"><CheckCircle2 size={16} /></span><div><p className="text-[13px] font-semibold text-ink">Explainable by design</p><p className="mt-1 text-[11.5px] leading-[1.5] text-ink-2">Fit uses the business profile and tender preferences signals already available to TenderBase. Document-level AI conclusions will only appear once they are actually grounded in the tender pack.</p></div></div></section>
        {ranked.length === 0 ? <section className="rounded-[18px] border border-line bg-white p-6 text-center"><TriangleAlert size={22} className="mx-auto text-soon" /><h2 className="mt-3 text-[16px] font-semibold text-ink">No analyst opportunities yet</h2><p className="mx-auto mt-1 max-w-md text-[12px] leading-5 text-ink-2">Complete your company profile and tender preferences so TenderBase can rank opportunities against your business.</p><Link href="/profile/company" className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-navy px-4 text-[12px] font-semibold text-white">Complete profile <ArrowRight size={14} /></Link></section> : <div className="grid gap-3 lg:grid-cols-2">{ranked.slice(0, 12).map((tender) => <AnalystCard key={tender.id} tender={tender} />)}</div>}
        <section className="mt-5 rounded-[18px] border border-line bg-white p-4 sm:p-5"><div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-ai-bg text-ai"><Clock3 size={17} /></span><div><p className="text-[13px] font-semibold text-ink">The premium roadmap is already reflected here</p><p className="mt-1 text-[11.5px] leading-[1.5] text-ink-2">Next: document extraction → requirements checklist → disqualifier detection → tender Q&amp;A → bid response assistant → pipeline automation.</p></div></div></section>
      </div>
    </main>
  );
}
