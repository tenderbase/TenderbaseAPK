'use client';

import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Target } from 'lucide-react';
import type { TenderWithUserState } from '@/types/tender';

const PIPELINE_KEY = 'tenderbase-pipeline-stages-v2';

type PipelineStage = 'New match' | 'Review' | 'Bid planning' | 'Preparing' | 'Ready to submit' | 'Submitted' | 'Clarification / negotiation' | 'Award pending' | 'Won' | 'Lost';

export function TenderDecisionStrip({ tender }: { tender: TenderWithUserState }) {
  const fit = tender.matchScore == null ? null : Math.max(0, Math.min(100, Math.round(tender.matchScore)));
  const days = daysUntil(tender.closingDate);
  const urgency = days !== null && days <= 3;
  const recommendation = fit === null ? 'Review' : fit >= 75 && (days === null || days >= 3) ? 'Pursue' : fit < 45 || (days !== null && days < 1) ? 'Skip' : 'Review';
  const tone = recommendation === 'Pursue' ? 'border-emerald-200 bg-emerald-50' : recommendation === 'Skip' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50';
  const icon = recommendation === 'Pursue' ? <CheckCircle2 size={18}/> : recommendation === 'Skip' ? <AlertTriangle size={18}/> : <Target size={18}/>;

  function setStage(stage: PipelineStage) {
    try {
      const raw = window.localStorage.getItem(PIPELINE_KEY);
      const stages = raw ? JSON.parse(raw) as Record<string, PipelineStage> : {};
      stages[tender.id] = stage;
      window.localStorage.setItem(PIPELINE_KEY, JSON.stringify(stages));
      window.localStorage.setItem(`tenderbase-stage-${tender.id}`, legacyStage(stage));
      window.location.reload();
    } catch {}
  }

  return (
    <section className={`mx-auto mb-3 mt-3 flex w-full max-w-6xl flex-col gap-3 rounded-[18px] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${tone}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/80 text-navy">{icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-ink-3">Decision snapshot</span>
            <strong className="text-[14px] text-ink">{recommendation}</strong>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-5 text-ink-2">
            {fit === null ? 'Set your business profile to calculate a personalised fit score.' : `${fit}% fit based on your tender profile.`}
            {days !== null ? ` ${days < 0 ? 'Closed.' : days === 0 ? 'Closes today.' : `${days} day${days === 1 ? '' : 's'} left.`}` : ' Deadline not verified.'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {urgency && <span className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2.5 py-1.5 text-[10px] font-semibold text-ink-2"><Clock3 size={12}/> Deadline risk</span>}
        {recommendation !== 'Skip' && <button type="button" onClick={() => setStage('Review')} className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-navy px-3 text-[11.5px] font-semibold text-white">Move to review <ArrowRight size={13}/></button>}
      </div>
    </section>
  );
}

function legacyStage(stage: PipelineStage) {
  if (stage === 'Review' || stage === 'New match') return 'Qualifying';
  if (stage === 'Bid planning') return 'Pursuing';
  if (stage === 'Preparing' || stage === 'Ready to submit') return 'Preparing';
  return 'Submitted';
}

function daysUntil(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.ceil((time - Date.now()) / 86400000);
}
