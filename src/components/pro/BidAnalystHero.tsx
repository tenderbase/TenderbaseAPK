'use client';

import Link from 'next/link';
import { ArrowRight, BrainCircuit, ShieldCheck, Target } from 'lucide-react';

export function BidAnalystHero() {
  return (
    <section className="mb-5 overflow-hidden rounded-[20px] border border-pro-line bg-pro-soft">
      <div className="relative px-4 py-5 sm:px-5">
        <div className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-pro/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-pro text-[#3d3205]">
              <BrainCircuit size={18} strokeWidth={2.1} aria-hidden />
            </span>
            <span className="rounded-md border border-pro-line bg-white/70 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#7a610f]">
              Pro intelligence
            </span>
          </div>
          <h2 className="mt-3 max-w-[520px] text-[22px] font-bold leading-[1.12] tracking-[-0.03em] text-ink">
            Stop searching for tenders. Start deciding which ones to bid.
          </h2>
          <p className="mt-2 max-w-[600px] text-[13px] leading-[1.55] text-ink-2">
            TenderBase Pro is becoming your bid analyst: rank opportunities against your business,
            surface the signals that matter, then move the right tenders into your bid pipeline.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/pro/analyst" className="inline-flex h-10 items-center gap-1.5 rounded-[11px] bg-navy px-4 text-[12.5px] font-semibold text-white shadow-[0_7px_18px_rgba(9,27,49,.15)]">
              Open Bid Analyst <ArrowRight size={14} strokeWidth={2.2} aria-hidden />
            </Link>
            <span className="inline-flex h-10 items-center gap-1.5 rounded-[11px] border border-pro-line bg-white/70 px-3 text-[11.5px] font-medium text-ink-2">
              <Target size={13} aria-hidden /> Fit-first workflow
            </span>
            <span className="inline-flex h-10 items-center gap-1.5 rounded-[11px] border border-pro-line bg-white/70 px-3 text-[11.5px] font-medium text-ink-2">
              <ShieldCheck size={13} aria-hidden /> Explainable signals
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
