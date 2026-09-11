'use client';

import { AlertTriangle, CheckCircle2, FileText, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getCommercialAnalysis } from '@/lib/opportunities/score';
import type { TenderWithUserState } from '@/types/tender';

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('rounded-[16px] border border-line bg-white p-4', className)}>{children}</div>;
}

export function ProAnalystPanel({ tender }: { tender: TenderWithUserState }) {
  const commercial = getCommercialAnalysis(tender);
  const score = typeof tender.matchScore === 'number' ? tender.matchScore : null;
  const documentCount = tender.documents.length;

  return (
    <section className="space-y-3" aria-label="TenderBase Pro Bid Analyst">
      <div className="flex items-center gap-2 px-1">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-blue-soft text-blue"><Sparkles size={16} /></span>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-ink-3">Pro Bid Analyst</p>
          <h2 className="text-[18px] font-semibold tracking-[-.025em] text-ink">Should you pursue this tender?</h2>
        </div>
      </div>

      <Card className="border-blue/15 bg-[linear-gradient(180deg,#fff,#fbfdff)]">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-[6px] border-blue-soft bg-white">
            <span className="text-[26px] font-bold tracking-[-.05em] text-navy">{score ?? '—'}</span>
            <span className="text-[9px] font-semibold uppercase tracking-[.1em] text-ink-3">Fit score</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-semibold text-success">Explainable score</span>
              <span className="text-[11px] text-ink-3">No value penalty</span>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-ink-2">
              The Fit Score is based on company/tender fit signals. An undisclosed tender amount never lowers the score.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2"><CheckCircle2 size={17} className="text-success" /><h3 className="text-[14px] font-semibold text-ink">What we know</h3></div>
          <ul className="mt-3 space-y-2">
            <li className="text-[12px] text-ink-2">Tender record is available for analysis.</li>
            <li className="text-[12px] text-ink-2">{documentCount ? `${documentCount} document${documentCount === 1 ? '' : 's'} available for review.` : 'No tender documents are attached yet.'}</li>
            {tender.cidbGrade != null && <li className="text-[12px] text-ink-2">CIDB Grade {tender.cidbGrade} is recorded on the tender.</li>}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center gap-2"><ShieldCheck size={17} className="text-blue" /><h3 className="text-[14px] font-semibold text-ink">Qualification watch</h3></div>
          <ul className="mt-3 space-y-2">
            <li className="text-[12px] text-ink-2">CIDB, B-BBEE, tax and mandatory documents still require document-level verification.</li>
            <li className="text-[12px] text-ink-2">A high Fit Score is not a bid recommendation by itself.</li>
          </ul>
        </Card>
      </div>

      <Card className="border-line">
        <div className="flex items-center gap-2"><WalletCards size={17} className="text-ink-2" /><h3 className="text-[14px] font-semibold text-ink">Commercial intelligence</h3></div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-[12px] bg-canvas p-3"><p className="text-[9px] font-semibold uppercase tracking-[.1em] text-ink-3">Tender value</p><p className="mt-1 text-[12.5px] font-semibold text-ink">{commercial.valueStatus === 'published' ? 'Published' : 'Not disclosed'}</p></div>
          <div className="rounded-[12px] bg-canvas p-3"><p className="text-[9px] font-semibold uppercase tracking-[.1em] text-ink-3">Commercial confidence</p><p className="mt-1 text-[12.5px] font-semibold text-ink">{commercial.confidence === 'not_available' ? 'Not available yet' : commercial.confidence}</p></div>
          <div className="rounded-[12px] bg-canvas p-3"><p className="text-[9px] font-semibold uppercase tracking-[.1em] text-ink-3">Attractiveness</p><p className="mt-1 text-[12.5px] font-semibold text-ink">{commercial.attractiveness === 'not_assessable' ? 'Awaiting document evidence' : commercial.attractiveness}</p></div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-ink-3"><FileText size={14} className="mt-0.5 shrink-0" />Future document intelligence will extract BOQs, quantities, pricing schedules, contract duration and budget references when they appear in the tender pack.</p>
      </Card>

      <Card className="border-warning/20 bg-warning/5">
        <div className="flex gap-2.5"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-warning" /><div><h3 className="text-[13px] font-semibold text-ink">Analyst status</h3><p className="mt-1 text-[11.5px] leading-5 text-ink-2">This is the Phase 1 analyst foundation. It deliberately reports only verified tender-record facts. AI document extraction and cited recommendations come next.</p></div></div>
      </Card>
    </section>
  );
}
