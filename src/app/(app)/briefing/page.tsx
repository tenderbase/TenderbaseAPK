'use client';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Target, Clock, TrendingUp, Building2, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AiBadge } from '@/components/ai/AiBadge';
import { AiDisclaimer } from '@/components/ai/AiDisclaimer';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const ITEMS: { icon: LucideIcon; tone: string; title: string; body: string; action: string }[] = [
  { icon: Target, tone: 'bg-ai-bg text-ai', title: 'Your strongest match this week', body: 'Supply and Delivery of Computer Equipment (eThekwini Municipality) scored 94% — closing 12 September.', action: 'Open tender' },
  { icon: Clock, tone: 'bg-soon-bg text-soon', title: 'Act soon', body: 'Provision of Security Services closes in 2 days and is still on your saved list.', action: 'Review saved' },
  { icon: TrendingUp, tone: 'bg-blue-soft text-blue', title: 'Category trend', body: 'IT & Technology tenders in KZN rose 38% this week. Cleaning contracts stayed flat.', action: 'See all IT tenders' },
  { icon: Building2, tone: 'bg-open-bg text-open', title: 'New organisation for you', body: 'KZN Department of Education published its first tender matching your profile.', action: 'View organisation' },
];

export default function BriefingPage() {
  const router = useRouter();
  return (
    <main className="pb-8">
      <header className="flex items-center gap-3 bg-white px-4 py-2">
        <button onClick={() => router.back()} aria-label="Go back" className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink">
          <ChevronLeft size={21} strokeWidth={1.75} aria-hidden />
        </button>
        <h1 className="text-card-title font-semibold tracking-[-0.02em]">Weekly Briefing</h1>
      </header>

      <div className="px-5 pt-3.5">
        <section className="rounded-lg border border-ai-line bg-white p-4 shadow-card">
          <div className="mb-2.5 flex items-center justify-between">
            <AiBadge label="AI Briefing" />
            <span className="text-micro text-ink-3">Mon 31 Aug – Sun 6 Sep</span>
          </div>
          <p className="text-[14.5px] leading-[22px]">
            <b>18 new tenders</b> matched your profile this week — up from 11 last week, driven mainly by municipal
            IT procurement in KwaZulu-Natal.
          </p>
          <dl className="mt-3.5 flex gap-2.5">
            {[['18', 'New matches', ''], ['4', 'Closing next week', 'text-soon'], ['R31M', 'Combined value', '']].map(
              ([v, l, c]) => (
                <div key={l} className="flex-1 rounded-[11px] bg-canvas p-2.5">
                  <dd className={cn('text-[19px] font-bold leading-none tracking-[-0.04em]', c)}>{v}</dd>
                  <dt className="mt-1 text-micro text-ink-3">{l}</dt>
                </div>
              ),
            )}
          </dl>
        </section>

        <section className="mt-3.5 divide-y divide-line rounded-lg border border-line bg-white px-4">
          {ITEMS.map(({ icon: Icon, tone, title, body, action }) => (
            <div key={title} className="flex gap-3 py-3.5">
              <span className={cn('flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]', tone)}>
                <Icon size={17} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-body font-semibold tracking-[-0.015em]">{title}</h2>
                <p className="mt-0.5 text-[12.5px] leading-[19px] text-ink-2">{body}</p>
                <button className="mt-2 flex items-center gap-1 text-caption font-semibold text-blue">
                  {action}
                  <ChevronRight size={14} strokeWidth={2.3} aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-3.5 rounded-lg border border-line bg-white p-4">
          <h2 className="text-[14.5px] font-semibold tracking-[-0.02em]">Suggested next step</h2>
          <p className="mt-1 text-meta leading-5 text-ink-2">
            Add your <b className="text-ink">CIDB grading</b> to unlock an estimated 6 additional matches per week in
            Construction and Engineering.
          </p>
          <Button variant="secondary" size="sm" className="mt-3">Complete company profile</Button>
        </section>

        <div className="mt-3.5">
          <AiDisclaimer>
            Briefings are generated weekly from tenders published on TenderBase and your saved activity.
          </AiDisclaimer>
        </div>
      </div>
    </main>
  );
}
