'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, ChevronDown, Clock3, FileText, Plus, Target } from 'lucide-react';
import Link from 'next/link';
import { useSavedTenders } from '@/lib/saved-store';
import { daysUntil } from '@/lib/format';

type Stage = 'Qualifying' | 'Pursuing' | 'Preparing' | 'Submitted';
const STAGES: Stage[] = ['Qualifying', 'Pursuing', 'Preparing', 'Submitted'];
const STORAGE_KEY = 'tenderbase-pipeline-stages-v1';

export default function PipelinePage() {
  const { saved, session } = useSavedTenders();
  const [stages, setStages] = useState<Record<string, Stage>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setStages(JSON.parse(raw) as Record<string, Stage>);
    } catch { /* use empty pipeline */ }
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stages)); } catch { /* non-fatal */ }
  }, [stages]);

  const opportunities = useMemo(
    () => saved.map((row) => ({ tender: row.tender, stage: stages[row.tenderId] ?? 'Qualifying' as Stage })),
    [saved, stages],
  );
  const active = opportunities.filter((o) => o.stage !== 'Submitted');
  const closingSoon = active.filter((o) => o.tender.closingDate && daysUntil(o.tender.closingDate) >= 0 && daysUntil(o.tender.closingDate) <= 7).length;

  function setStage(id: string, stage: Stage) {
    setStages((prev) => ({ ...prev, [id]: stage }));
  }

  return (
    <main className="tb-page">
      <header className="tb-content pt-6 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="tb-eyebrow">Your opportunities</p>
            <h1 className="mt-1.5 text-h1 font-semibold text-navy">Bid Pipeline</h1>
            <p className="mt-2 max-w-xl text-body-lg text-ink-2">Turn saved opportunities into a disciplined path from qualification to submitted bid.</p>
          </div>
          <Link
            href="/search"
            aria-label="Add opportunity from Discover"
            className="tb-icon-button shrink-0"
          >
            <Plus size={20} strokeWidth={1.9} aria-hidden />
          </Link>
        </div>
      </header>

      <section className="tb-content mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat icon={<Target size={16} />} label="Active bids" value={String(active.length)} />
        <Stat icon={<Clock3 size={16} />} label="Closing ≤ 7d" value={String(closingSoon)} />
        <Stat icon={<BriefcaseBusiness size={16} />} label="Preparing" value={String(opportunities.filter((o) => o.stage === 'Preparing').length)} />
      </section>

      <section className="tb-content mt-6">
        {!session.signedIn && (
          <div className="mb-4 rounded-[16px] border border-line bg-white p-4 text-[12px] text-ink-2">Sign in to save tenders and carry opportunities through your bid pipeline.</div>
        )}

        {opportunities.length === 0 ? (
          <div className="tb-card overflow-hidden">
            <div className="bg-navy px-5 py-6 sm:px-7 sm:py-8">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/10 text-white"><BriefcaseBusiness size={21} /></div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.1em] text-white/55">Your bid desk</p>
              <h2 className="mt-1.5 max-w-lg text-[24px] font-semibold leading-[1.2] tracking-[-.025em] text-white">Discover → qualify → pursue → prepare → submit</h2>
              <p className="mt-3 max-w-xl text-body text-white/70">Save a tender from Discover and it becomes an opportunity here. We&apos;ll keep the next action obvious.</p>
            </div>
            <Link href="/search" className="flex min-h-12 items-center gap-3 px-5 text-body font-semibold text-navy sm:px-7"><span className="flex-1">Find your next opportunity</span><ArrowRight size={18} /></Link>
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-4">
            {STAGES.map((stage) => {
              const items = opportunities.filter((o) => o.stage === stage);
              return (
                <div key={stage} className="min-w-0 rounded-[16px] border border-line bg-white p-3">
                  <div className="flex items-center justify-between px-1 pb-3"><div className="flex items-center gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas text-ink-2 text-[10px] font-bold">{STAGES.indexOf(stage) + 1}</span><h2 className="text-[13px] font-semibold text-ink">{stage}</h2></div><span className="text-[11px] font-medium text-ink-3">{items.length}</span></div>
                  <div className="space-y-2.5">
                    {items.length === 0 ? <div className="rounded-[12px] border border-dashed border-line px-3 py-5 text-center text-[11px] text-ink-4">No opportunities</div> : items.map(({ tender }) => (
                      <article key={tender.id} className="min-w-0 rounded-[13px] border border-line bg-canvas p-3">
                        <Link href={`/tenders/${tender.id}`} className="block min-w-0">
                          <p className="line-clamp-3 break-words text-[12.5px] font-semibold leading-[1.35] text-ink">{tender.title}</p>
                          <p className="mt-1 break-words text-[10.5px] text-ink-3">{tender.organisation}</p>
                        </Link>
                        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-[10px] text-ink-3">
                          <span className="inline-flex items-center gap-1"><FileText size={11} />{tender.documents.length}</span>
                        </div>
                        <div className="mt-2 relative">
                          <label className="sr-only" htmlFor={`stage-${tender.id}`}>Move {tender.title} to stage</label>
                          <select
                            id={`stage-${tender.id}`}
                            value={stage}
                            onChange={(event) => setStage(tender.id, event.target.value as Stage)}
                            className="h-9 w-full appearance-none rounded-[9px] border border-line bg-white px-3 pr-8 text-[10.5px] font-semibold text-navy outline-none focus:ring-2 focus:ring-navy/15"
                          >
                            {STAGES.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                          <ChevronDown size={14} aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3" />
                        </div>
                        {stage === 'Submitted' && <span className="mt-2 flex items-center justify-center gap-1 rounded-[9px] bg-open-bg py-2 text-[10.5px] font-semibold text-open"><CheckCircle2 size={12} /> Submitted</span>}
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="tb-card min-w-0 p-3.5">
      <div className="flex items-center gap-2 text-ink-3"><span className="shrink-0">{icon}</span><span className="text-[9px] font-bold uppercase tracking-[.08em]">{label}</span></div>
      <p className="mt-1.5 truncate text-[18px] font-bold text-ink">{value}</p>
    </div>
  );
}
