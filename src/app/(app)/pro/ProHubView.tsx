'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Crown, Check, Minus, Sparkles, Bell, FileSearch, Zap, TriangleAlert, ReceiptText,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { PlanChip, ProBadge } from '@/components/ui/PlanChip';
import { SubscribeButton } from '@/components/billing/SubscribeButton';
import { useTier } from '@/lib/tier-store';
import { useSavedTenders } from '@/lib/saved-store';
import {
  FEATURE_ACCESS, FEATURE_LABELS, PRO_MONTHLY_ZAR, PRO_TRIAL_DAYS,
  PRO_YEARLY_ZAR, TIER_META, formatZAR, proYearlyMonthlyEquivalent,
  proYearlySavingPct, type FeatureKey, type Tier,
} from '@/types/tier';

const COMPARISON: FeatureKey[] = [
  'browse', 'saved', 'saved-searches', 'profile-full', 'matches-preview',
  'ai-quick', 'ai-deep', 'ask-followup', 'matches-reasons', 'alerts-inapp',
  'push-basic', 'push-full', 'digest-weekly', 'digest-daily', 'news-basic',
  'news-all', 'news-relevant', 'custom-rss', 'export', 'calendar-sync',
  'market-pulse', 'org-watch',
];

const PERKS: { icon: typeof Crown; title: string; body: string }[] = [
  { icon: FileSearch, title: 'Read tenders in seconds', body: 'AI deep summaries surface requirements, eligibility and risk flags — no more 60-page PDFs.' },
  { icon: Zap, title: 'Be first to the right tenders', body: 'Instant push the moment a tender matches your business, with the reasons why.' },
  { icon: Bell, title: 'Never miss a deadline', body: 'Follow any tender and get closing-countdown pushes, addenda alerts and calendar sync.' },
  { icon: Sparkles, title: 'All your news, filtered for you', body: 'Every SA feed that matters, re-ranked against your sectors — plus custom RSS.' },
];

const FAQS: { q: string; a: string }[] = [
  { q: 'How does the 14-day trial work?', a: 'Start the trial and every Pro feature unlocks immediately. You are never charged during the trial and nothing renews by itself — when the 14 days are up the account returns to Basic.' },
  { q: 'How do I pay for Pro?', a: 'By card through PayFast, South Africa\'s payment gateway. It is a recurring subscription you can cancel yourself on the plan screen; you keep Pro until the period you paid for ends.' },
  { q: 'What happens when the trial ends?', a: 'You drop to Basic automatically — your saved tenders, searches and profile stay intact. Nothing you saved is deleted.' },
  { q: 'Can I stay on Basic forever?', a: 'Yes. Basic is a free account with 50 saved tenders, top-3 daily matches and in-app alerts. Pro adds unlimited depth when you need it.' },
  { q: 'Is browsing ever limited?', a: 'No. The full catalogue, documents and details are free for everyone — including guests. Pro is about intelligence, not access.' },
];

function Cell({ tier, value, highlight }: { tier: Tier; value: boolean | string; highlight: boolean }) {
  const yes = value === true;
  const no = value === false;
  return (
    <td
      className={cn(
        'border-t border-line px-3 py-2.5 text-center align-middle',
        tier === 'pro' && highlight ? 'bg-pro-soft/50' : '',
      )}
    >
      {yes ? (
        <Check size={16} strokeWidth={2.6} className="mx-auto text-open" aria-label="Included" />
      ) : no ? (
        <Minus size={15} strokeWidth={2.2} className="mx-auto text-ink-3/60" aria-label="Not included" />
      ) : (
        <span className="text-[11.5px] font-semibold text-ink-2">{value}</span>
      )}
    </td>
  );
}

function cellValue(feature: FeatureKey, tier: Tier): boolean | string {
  const min = FEATURE_ACCESS[feature];
  const order: Record<Tier, number> = { free: 0, basic: 1, pro: 2 };
  if (order[tier] >= order[min]) {
    // Basic-only quotas read as text in the PRO column ("∞" once pro has it).
    if (feature === 'saved' && tier === 'basic') return '50';
    if (feature === 'saved' && tier === 'pro') return '∞';
    if (feature === 'saved-searches' && tier === 'basic') return '3';
    if (feature === 'org-watch' && tier === 'basic') return '1';
    return true;
  }
  if (feature === 'ai-deep' && tier === 'basic') return '1 demo';
  return false;
}

export interface ProBillingInfo {
  /** PayFast credentials configured — card checkout can actually run. */
  payfastReady: boolean;
  /** Service role configured — a payment could actually be recorded. */
  storageReady: boolean;
  sandbox: boolean;
  signedIn: boolean;
  /** The server says this account has not used its one trial and is not subscribed. */
  trialAvailable: boolean;
}

export function ProHubView({ billing }: { billing: ProBillingInfo }) {
  const router = useRouter();
  const { tier, trial, startTrial, endPro, billingEnforced } = useTier();
  const { session } = useSavedTenders();
  const [yearly, setYearly] = useState(true);

  const isPro = tier === 'pro';
  const trialActive = isPro && trial.active;

  return (
    <main className="pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-2">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink"
        >
          <ChevronLeft size={21} strokeWidth={1.75} aria-hidden />
        </button>
        <h1 className="flex-1 truncate text-card-title font-semibold tracking-[-0.02em]">Pro</h1>
        <PlanChip tier={tier} />
      </header>

      <div className="px-5 pt-4">
        {isPro ? (
          <section className="overflow-hidden rounded-[16px] border border-pro-line bg-pro-soft">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-pro text-[#3d3205]">
                <Crown size={20} strokeWidth={2.1} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15.5px] font-bold tracking-[-0.02em] text-ink">You&apos;re on Pro</p>
                <p className="text-[12px] text-ink-2">
                  {trialActive
                    ? `Trial active — ${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'} left${session.signedIn ? '' : ' (sign in to keep your account)'}`
                    : 'All features unlocked'}
                </p>
              </div>
              <ProBadge />
            </div>
            {trialActive && (
              <div className="h-1.5 w-full bg-white">
                <div
                  className="h-full bg-pro transition-[width] duration-700 motion-reduce:transition-none"
                  style={{ width: `${Math.max(0, Math.min(100, (trial.daysLeft / PRO_TRIAL_DAYS) * 100))}%` }}
                />
              </div>
            )}
            <div className="border-t border-pro-line px-4 py-3">
              {trialActive ? (
                <button
                  type="button"
                  onClick={endPro}
                  className="text-[13px] font-semibold text-ink-2 underline decoration-line underline-offset-2"
                >
                  End trial & switch to Basic
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-[12.5px] leading-[1.45] text-ink-2">
                    {billingEnforced
                      ? 'Your subscription is verified on our servers.'
                      : 'Card checkout is not switched on here yet, so plan state lives on this device in the meantime.'}
                  </p>
                  <Link
                    href="/pro/plan"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy"
                  >
                    <ReceiptText size={14} strokeWidth={2.2} aria-hidden />
                    Plan, invoices & cancellation
                  </Link>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="overflow-hidden rounded-[16px] border border-line bg-white shadow-card">
            <div className="relative bg-navy px-4 py-5 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-soft/70">TenderBase Pro</p>
              <h2 className="mt-1 text-[24px] font-bold leading-[1.1] tracking-[-0.03em]">
                Your unfair advantage in every bid
              </h2>
              <p className="mt-2 max-w-[300px] text-[13.5px] leading-[1.5] text-blue-soft/85">
                Deep AI summaries, full matches with reasons, instant push and every news feed — one subscription.
              </p>
              <span className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-[11px] bg-pro text-[#3d3205]">
                <Crown size={18} strokeWidth={2.2} aria-hidden />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 px-4 py-4">
              {PERKS.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-[12px] bg-canvas p-3">
                  <Icon size={18} strokeWidth={2} className="text-navy" aria-hidden />
                  <p className="mt-2 text-[13px] font-semibold leading-[1.25] text-ink">{title}</p>
                  <p className="mt-1 text-[11.5px] leading-[1.45] text-ink-2">{body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pricing toggle */}
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setYearly(false)}
            className={cn('text-[13px] font-semibold', !yearly ? 'text-ink' : 'text-ink-3')}
          >
            Monthly
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Toggle yearly billing"
            onClick={() => setYearly((v) => !v)}
            className={cn(
              'relative h-[26px] w-[46px] rounded-full transition-colors',
              yearly ? 'bg-navy' : 'bg-line',
            )}
          >
            <span
              className={cn(
                'absolute top-[3px] h-5 w-5 rounded-full bg-white shadow-card-sm transition-all',
                yearly ? 'left-[23px]' : 'left-[3px]',
              )}
            />
          </button>
          <button
            type="button"
            onClick={() => setYearly(true)}
            className={cn('text-[13px] font-semibold', yearly ? 'text-ink' : 'text-ink-3')}
          >
            Annual
            <span className="ml-1 rounded-md bg-pro-soft px-1.5 py-0.5 text-[10.5px] font-bold text-[#7a610f]">
              Save {proYearlySavingPct}%
            </span>
          </button>
        </div>

        {/* Price card */}
        <section className="mt-3 overflow-hidden rounded-[16px] border-2 border-pro bg-white shadow-card">
          <div className="px-4 py-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-[13px] font-bold uppercase tracking-wide text-[#7a610f]">Pro</span>
              <ProBadge />
            </div>
            <p className="mt-2 text-[30px] font-bold leading-none tracking-[-0.04em] text-ink">
              {yearly ? formatZAR(PRO_YEARLY_ZAR) : formatZAR(PRO_MONTHLY_ZAR)}
              <span className="text-[14px] font-semibold text-ink-3">/{yearly ? 'yr' : 'mo'}</span>
            </p>
            <p className="mt-1 text-[12px] text-ink-2">
              {yearly
                ? `≈ ${formatZAR(Math.round(proYearlyMonthlyEquivalent))}/month, billed annually`
                : 'Billed monthly · cancel anytime'}
            </p>
            {!isPro && (
              <div className="mt-3.5 space-y-2">
                {billing.payfastReady && billing.storageReady ? (
                  <SubscribeButton
                    plan={yearly ? 'pro-yearly' : 'pro-monthly'}
                    label={`Subscribe — ${yearly ? formatZAR(PRO_YEARLY_ZAR) : formatZAR(PRO_MONTHLY_ZAR)}/${yearly ? 'yr' : 'mo'}`}
                    signingIn={!billing.signedIn}
                    sandbox={billing.sandbox}
                  />
                ) : (
                  <p className="flex items-start justify-center gap-1.5 rounded-[12px] bg-canvas px-3 py-2.5 text-center text-[11.5px] leading-[1.45] text-ink-2">
                    <TriangleAlert size={13} strokeWidth={2.2} className="mt-[1.5px] shrink-0 text-soon" aria-hidden />
                    Card checkout is not switched on for this deployment yet — nothing can be charged here.
                  </p>
                )}
                {billing.trialAvailable && (
                  <button
                    type="button"
                    onClick={startTrial}
                    className="flex h-[50px] w-full items-center justify-center gap-2 rounded-md bg-pro text-[#3d3205] shadow-gold-glow transition-colors active:opacity-90"
                  >
                    <Crown size={18} strokeWidth={2.2} aria-hidden />
                    Start {PRO_TRIAL_DAYS}-day free trial
                  </button>
                )}
              </div>
            )}
            {isPro && (
              <p className="mt-3.5 text-[12.5px] font-medium text-ink-2">
                You&apos;re on Pro — everything below is unlocked.
              </p>
            )}
            <p className="mt-2 text-[11px] text-ink-3">
              Basic stays free forever: 50 saved tenders, top-3 daily matches, in-app alerts.
            </p>
            {billing.signedIn && (
              <Link href="/pro/plan" className="mt-2.5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-navy">
                <ReceiptText size={14} strokeWidth={2.2} aria-hidden />
                Manage plan & invoices
              </Link>
            )}
          </div>
        </section>

        {/* Comparison */}
        <section className="mt-6">
          <h2 className="mb-2 px-0.5 text-section font-semibold tracking-[-0.02em] text-ink">Compare plans</h2>
          <div className="overflow-x-auto rounded-[16px] border border-line bg-white">
            <table className="w-full min-w-[420px] border-collapse text-[12.5px]">
              <thead>
                <tr>
                  <th className="px-3 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-ink-3">Feature</th>
                  {(['free', 'basic', 'pro'] as Tier[]).map((t) => (
                    <th key={t} className={cn('px-2 py-3 text-center', t === 'pro' && 'bg-pro-soft/50')}>
                      <span className="block text-[12.5px] font-bold text-ink">{TIER_META[t].label}</span>
                      <span className="mt-0.5 block text-[10.5px] font-medium text-ink-3">{TIER_META[t].priceLine}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((f) => (
                  <tr key={f}>
                    <td className="border-t border-line px-3 py-2.5 text-[12.5px] font-medium text-ink">
                      {FEATURE_LABELS[f]}
                    </td>
                    {(['free', 'basic', 'pro'] as Tier[]).map((t) => (
                      <Cell key={t} tier={t} value={cellValue(f, t)} highlight={t === 'pro'} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 px-0.5 text-[11.5px] text-ink-3">
            Browsing is always free. Pro adds depth — it never removes access.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-6">
          <h2 className="mb-2 px-0.5 text-section font-semibold tracking-[-0.02em] text-ink">Questions</h2>
          <div className="divide-y divide-line rounded-[16px] border border-line bg-white px-4">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[14px] font-semibold text-ink marker:hidden [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="shrink-0 text-ink-3 transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-1.5 pr-6 text-[13px] leading-[1.5] text-ink-2">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
