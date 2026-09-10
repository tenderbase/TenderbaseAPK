'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Crown, Check } from 'lucide-react';
import Link from 'next/link';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTier } from '@/lib/tier-store';
import {
  FEATURE_LABELS,
  PRO_MONTHLY_ZAR,
  PRO_TRIAL_DAYS,
  PRO_YEARLY_ZAR,
  formatZAR,
  type FeatureKey,
} from '@/types/tier';

interface UpgradeCopy {
  title?: string;
  /** Overrides the sheet's headline (default: "<feature> is a Pro feature"). */
  headline?: string;
  /** One line on why it matters — replaces the generic default. */
  why?: string;
  /** Overrides the three perk bullets shown under the copy. */
  bullets?: string[];
}

const FEATURE_WHY: Partial<Record<FeatureKey, string>> = {
  'ai-deep': 'Requirements, eligibility and risk — read like an expert in 20 seconds.',
  'ask-followup': 'Ask anything about the tender and get answers grounded in its documents.',
  'matches-full': "See every tender ranked for your business, not just today's top three.",
  'matches-reasons': 'Know exactly why each tender matches — before you spend hours reading.',
  'push-full': 'Be first: instant push when a tender that fits you is published.',
  'news-all': 'Every category, from SARS to construction — in one feed.',
  'news-relevant': 'Your feed, re-ranked to what your business actually does.',
  export: 'Take your shortlist anywhere — CSV, PDF or straight into your calendar.',
  'calendar-sync': 'Every deadline, in your calendar, automatically.',
  'market-pulse': 'See where tender volume and value are heading in your sectors.',
};

interface UpgradeContextValue {
  /** Opens the upgrade sheet for a feature. */
  openUpgrade: (feature: FeatureKey, copy?: UpgradeCopy) => void;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

/**
 * The universal Pro gate (blueprint §5.12): a labelled lock calls
 * openUpgrade(feature) and the sheet explains, prices and offers the trial.
 * Always dismissible. The trial runs through the server (one per account) and
 * card checkout lives on the plan screen, which is honest about whether
 * payments are switched on for this deployment.
 */
export function UpgradeProvider({ children }: { children: ReactNode }) {
  const { tier, startTrial } = useTier();
  const [state, setState] = useState<{
    feature: FeatureKey;
    copy: UpgradeCopy;
  } | null>(null);

  const openUpgrade = useCallback((feature: FeatureKey, copy: UpgradeCopy = {}) => {
    setState({ feature, copy });
  }, []);
  const close = useCallback(() => setState(null), []);

  const value = useMemo(() => ({ openUpgrade }), [openUpgrade]);

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      {state && (
        <BottomSheet open onClose={close} title={state.copy.title ?? 'Unlock with Pro'}>
          {tier !== 'pro' ? (
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-pro-soft text-[#7a610f]">
                <Crown size={22} strokeWidth={2} aria-hidden />
              </div>
              <h3 className="mt-3 text-[18px] font-bold tracking-[-0.02em] text-ink">
                {state.copy.headline ?? `${FEATURE_LABELS[state.feature]} is a Pro feature`}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-2">
                {state.copy.why ?? FEATURE_WHY[state.feature] ?? FEATURE_LABELS[state.feature]}
              </p>

              <ul className="mt-4 space-y-2">
                {(state.copy.bullets ??
                  [
                    `${FEATURE_LABELS[state.feature]}`,
                    'Unlimited AI deep summaries & follow-ups',
                    "Full Today's Matches with reasons",
                    'Instant-match push notifications',
                  ].slice(0, 3)).map((line) => (
                  <li key={line} className="flex items-start gap-2 text-[13px] text-ink">
                    <Check size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-open" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>

              <div className="mt-5 rounded-[12px] border border-pro-line bg-pro-soft px-3.5 py-3 text-center">
                <p className="text-[13px] font-semibold text-ink">
                  {formatZAR(PRO_MONTHLY_ZAR)}/month · or {formatZAR(PRO_YEARLY_ZAR)}/year
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-2">
                  {PRO_TRIAL_DAYS}-day free trial — no charge today
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  startTrial();
                  close();
                }}
                className="mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-md bg-pro text-[#3d3205] shadow-gold-glow transition-colors active:opacity-90"
              >
                <Crown size={18} strokeWidth={2.2} aria-hidden />
                Start {PRO_TRIAL_DAYS}-day free trial
              </button>
              <Link
                href="/pro/plan"
                onClick={close}
                className="mt-2 flex h-[46px] w-full items-center justify-center rounded-md border border-line bg-white text-[14px] font-semibold text-ink"
              >
                See plans & pay by card
              </Link>
              <button
                type="button"
                onClick={close}
                className="mt-2 flex h-[46px] w-full items-center justify-center rounded-md text-[14px] font-semibold text-ink-2"
              >
                Not now
              </button>
            </div>
          ) : (
            <div className="py-2 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-open-bg text-open">
                <Check size={22} strokeWidth={2.4} aria-hidden />
              </div>
              <h3 className="mt-3 text-[17px] font-bold tracking-[-0.02em] text-ink">
                You&apos;re on Pro
              </h3>
              <p className="mx-auto mt-1.5 max-w-[260px] text-[13.5px] leading-[1.5] text-ink-2">
                {FEATURE_LABELS[state.feature]} is already unlocked on your plan.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-4 h-[46px] w-full rounded-md bg-navy text-[14.5px] font-semibold text-white"
              >
                Done
              </button>
            </div>
          )}
        </BottomSheet>
      )}
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): UpgradeContextValue {
  const ctx = useContext(UpgradeContext);
  if (!ctx) throw new Error('useUpgrade must be used inside <UpgradeProvider>');
  return ctx;
}
