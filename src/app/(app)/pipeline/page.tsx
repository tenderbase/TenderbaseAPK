'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, ChevronDown, Clock3, FileText, Plus, Target } from 'lucide-react';
import Link from 'next/link';
import { useSavedTenders } from '@/lib/saved-store';
import { daysUntil } from '@/lib/format';

type Stage = 'New match' | 'Review' | 'Bid planning' | 'Preparing' | 'Ready to submit' | 'Submitted' | 'Clarification / negotiation' | 'Award pending' | 'Won' | 'Lost';
const STAGES: Stage[] = ['New match', 'Review', 'Bid planning', 'Preparing', 'Ready to submit', 'Submitted', 'Clarification / negotiation', 'Award pending', 'Won', 'Lost'];
const STORAGE_KEY = 'tenderbase-pipeline-stages-v2';
const LEGACY_STAGE_PREFIX = 'tenderbase-stage-';

function validStage(value: unknown): value is Stage { return typeof value === 'string' && (STAGES as string[]).includes(value); }

export default function PipelinePage() {
  const { saved, session } = useSavedTenders();
  const [stages, setStages] = useState<Record<string, Stage>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const next: Record<string, Stage> = raw ? JSON.parse(raw) as Record<string, Stage> : {};
      for (const row of saved) {
        if (validStage(next[row.tenderId])) continue;
        const detailStage = window.localStorage.getItem(`${LEGACY_STAGE_PREFIX}${row.tenderId}`);
        if (validStage(detailStage)) next[row.tenderId] = detailStage;
      }
      setStages(next);
    } catch {}
  }, [saved]);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stages)); } catch {}
  }, [stages]);

  const opportunities = useMemo(() => saved.map((row) => ({ tender: row.tender, stage: stages[row.tenderId] ?? 'New match' as Stage })), [saved, stages]);
  const active = opportunities.filter((o) => !['Won', 'Lost'].includes(o.stage));
  const closingSoon = active.filter((o) => o.tender.closingDate && daysUntil(o.tender.closingDate) >= 0 && daysUntil(o.tender.closingDate) <= 7).length;
  const preparing = opportunities.filter((o) => ['Bid planning', 'Preparing', 'Ready to submit'].includes(o.stage)).length;

  function setStage(id: string, stage: Stage) {
    setStages((prev) => ({ ...prev, [id]: stage }));
    try { window.localStorage.setItem(`${LEGACY_STAGE_PREFIX}${id}`, stage); } catch {}
  }

  return (
    <main className="tb-page">
      <header className="tb-content pt-6 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="tb-eyebrow">Controlled bid administration</p>
            <h1 className="mt-1.5 text-h1 font-semibold text-navy">Bid Pipeline</h1>
            <p className="mt-2 max-w-2xl text-body-lg text-ink-2">A tender only enters the pipeline when you are spending business effort on it. Saved opportunities stay in your Watchlist.</p>
          </div>
          <Link href="/search" aria-label="Add opportunity from Find" className="tb-icon-button shrink-0"><Plus size={20} strokeWidth={1.9} aria-hidden /></Link>
        </div>
      </header>

      <section className="tb-content mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat icon={<Target size={16}/>} label="Active opportunities" value={String(active.length)} />
        <Stat icon={<Clock3 size={16}/>} label="Closing ≤ 7d" value={String(closingSoon)} />
        <Stat icon={<BriefcaseBusiness size={16}/>} label="In preparation" value={String(preparing)} />
      </section>

      <section className="tb-content mt-6">
        {!session.signedIn && <div className="mb-4 rounded-[16px] border border-line bg-white p-4 text-[12px] text-ink-2">Sign in to keep your Watchlist and bid pipeline between sessions.</div>}
        {opportunities.length === 0 ? (
          <div className="tb-card overflow-hidden">
            <div className="bg-navy px-5 py-6 sm:px-7 sm:py-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/10 text-white"><BriefcaseBusiness size={21}/></div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.1em] text-white/55">Your bid desk</p>
              <h2 className="mt-1.5 max-w-lg text-[24px] font-semibold leading-[1.2] tracking-[-.025em] text-white">Find → review → plan → prepare → submit → respond → learn</h2>
              <p className="mt-3 max-w-xl text-body text-white/70">Choose an opportunity from Find and move it through the actual tender workflow. TenderBase handles the administrative structure; you own the bid decision and submission.</p>
            </div>
            <Link href="/search" className="flex min-h-12 items-center gap-3 px-5 text-body font-semibold text-navy sm:px-7"><span className="flex-1">Find an opportunity</span><ArrowRight size={18}/></Link>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {STAGES.map((stage, index) => {
              const items = opportunities.filter((o) => o.stage === stage);
              return (
                <section key={stage} aria-labelledby={`pipeline-stage-${index}`} className="w-full overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                  <header className="flex min-h-[58px] w-full items-center justify-between gap-3 border-b border-line bg-canvas px-4 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-ink-2 ring-1 ring-line">{index + 1}</span>
                      <h2 id={`pipeline-stage-${index}`} className="min-w-0 text-[14px] font-semibold leading-tight text-navy">{stage}</h2>
                    </div>
                    <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-white px-2 text-[11px] font-semibold text-ink-2 ring-1 ring-line">{items.length}</span>
                  </header>
                  <div className="w-full p-3 sm:p-4">
                    {items.length === 0 ? (
                      <div className="w-full rounded-[13px] border border-dashed border-line px-3 py-5 text-center text-[11px] text-ink-4">No opportunities</div>
                    ) : (
                      <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
                        {items.map(({ tender }) => (
                          <article key={tender.id} className="w-full rounded-[14px] border border-line bg-canvas p-4">
                            <Link href={`/tenders/${tender.id}`} className="block w-full min-w-0">
                              <p className="line-clamp-3 break-words text-[13px] font-semibold leading-[1.4] text-ink">{tender.title}</p>
                              <p className="mt-1 break-words text-[10.5px] text-ink-3">{tender.organisation}</p>
                            </Link>
                            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-3 text-[10.5px] text-ink-3">
                              <span className="inline-flex items-center gap-1"><FileText size={12}/>{tender.documents.length} documents</span>
                              {tender.closingDate && <span>{daysUntil(tender.closingDate)}d remaining</span>}
                            </div>
                            <div className="relative mt-3 w-full">
                              <label className="sr-only" htmlFor={`stage-${tender.id}`}>Move opportunity</label>
                              <select id={`stage-${tender.id}`} value={stage} onChange={(e) => setStage(tender.id, e.target.value as Stage)} className="h-10 w-full appearance-none rounded-[10px] border border-line bg-white px-3 pr-9 text-[11px] font-semibold text-navy outline-none focus:ring-2 focus:ring-navy/15">
                                {STAGES.map((option) => <option key={option} value={option}>{option}</option>)}
                              </select>
                              <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3"/>
                            </div>
                            {stage === 'Won' && <span className="mt-2 flex items-center justify-center gap-1 rounded-[9px] bg-open-bg py-2 text-[10px] font-semibold text-open"><CheckCircle2 size={12}/> Won</span>}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="tb-card min-w-0 p-3.5"><div className="flex items-center gap-2 text-ink-3"><span className="shrink-0">{icon}</span><span className="text-[9px] font-bold uppercase tracking-[.08em]">{label}</span></div><p className="mt-1.5 truncate text-[18px] font-bold text-ink">{value}</p></div>;
}
