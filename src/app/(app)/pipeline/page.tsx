'use client';

import { ArrowRight, BriefcaseBusiness, Plus } from 'lucide-react';
import Link from 'next/link';

/**
 * Pipeline is intentionally introduced as a destination before the CRM data
 * model is wired. This keeps the new information architecture stable while
 * we build the experience around the final workflow rather than retrofitting
 * a Kanban UI later.
 */
export default function PipelinePage() {
  return (
    <main className="tb-page">
      <header className="tb-content pt-6 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="tb-eyebrow">Your opportunities</p>
            <h1 className="mt-1.5 text-h1 font-semibold text-navy">Pipeline</h1>
            <p className="mt-2 max-w-md text-body-lg text-ink-2">
              A clear path from first look to submitted bid — without the CRM clutter.
            </p>
          </div>
          <button type="button" aria-label="Add opportunity" className="tb-icon-button">
            <Plus size={20} strokeWidth={1.9} aria-hidden />
          </button>
        </div>
      </header>

      <section className="tb-content mt-7">
        <div className="tb-card overflow-hidden">
          <div className="bg-navy px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-white/10 text-white">
              <BriefcaseBusiness size={21} strokeWidth={1.7} aria-hidden />
            </div>
            <p className="mt-5 text-[11px] font-semibold uppercase tracking-[.1em] text-white/55">The tender journey</p>
            <h2 className="mt-1.5 max-w-lg text-[24px] font-semibold leading-[1.2] tracking-[-.025em] text-white">
              Discover → decide → prepare → submit → win
            </h2>
            <p className="mt-3 max-w-xl text-body text-white/70">
              Your active bids will live here, with one next action keeping the team moving.
            </p>
          </div>
          <div className="divide-y divide-line">
            {['Qualifying', 'Pursuing', 'Preparing', 'Submitted'].map((stage, index) => (
              <div key={stage} className="flex items-center gap-4 px-5 py-4 sm:px-7">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-canvas text-[12px] font-semibold text-ink-2">{index + 1}</span>
                <span className="flex-1 text-body font-medium text-ink">{stage}</span>
                <span className="text-caption text-ink-4">0 opportunities</span>
              </div>
            ))}
          </div>
        </div>

        <Link href="/search" className="mt-4 flex min-h-12 items-center gap-3 rounded-md border border-line bg-white px-4 text-body font-semibold text-navy transition hover:border-blue-line hover:bg-blue-soft">
          <span className="flex-1">Find your next opportunity</span>
          <ArrowRight size={18} strokeWidth={2} aria-hidden />
        </Link>
      </section>
    </main>
  );
}
