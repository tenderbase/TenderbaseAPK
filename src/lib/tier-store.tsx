'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ALLOWANCES,
  FEATURE_ACCESS,
  LIMITS,
  PRO_TRIAL_DAYS,
  type FeatureKey,
  type Tier,
} from '@/types/tier';
import { TIER_COOKIE, TRIAL_END_COOKIE } from '@/lib/tier-cookies';

/**
 * Client entitlement store.
 *
 * State is seeded from the server (which reads the same cookies), so the
 * first render and SSR agree. Changing tier writes the cookie + state, which
 * is the mechanism the whole app previews with until billing (W8) replaces
 * the cookie with a verified subscription.
 */

function daysUntilTrialEnd(endIso: string | null): number {
  if (!endIso) return 0;
  const end = new Date(endIso).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export interface TrialInfo {
  active: boolean;
  daysLeft: number;
  endsAtIso: string | null;
}

export interface EntitlementValue {
  tier: Tier;
  /** True while a trial is active (only meaningful on pro). */
  trial: TrialInfo;
  isPro: boolean;
  isBasic: boolean;
  can: (feature: FeatureKey) => boolean;
  /** undefined = unlimited/not applicable */
  limit: (feature: FeatureKey) => number | undefined;
  /** One-off allowances below the access tier (e.g. Basic's 1 deep demo). */
  allowance: (feature: FeatureKey) => number | undefined;
  setTier: (tier: Tier) => void;
  startTrial: () => void;
  endPro: () => void;
}

const EntitlementContext = createContext<EntitlementValue | null>(null);

export function TierProvider({
  children,
  initialTier,
  initialTrialEnd,
}: {
  children: ReactNode;
  initialTier: Tier;
  initialTrialEnd: string | null;
}) {
  const [tier, setTierState] = useState<Tier>(initialTier);
  const [trialEnd, setTrialEnd] = useState<string | null>(initialTrialEnd);

  const setTier = useCallback((next: Tier) => {
    setTierState(next);
    try {
      document.cookie = `${TIER_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* cookie unavailable (SSR) — state still updates for this session */
    }
    if (next !== 'pro') setTrialEnd(null);
  }, []);

  const startTrial = useCallback(() => {
    const end = new Date(Date.now() + PRO_TRIAL_DAYS * 86_400_000).toISOString();
    setTrialEnd(end);
    try {
      document.cookie = `${TRIAL_END_COOKIE}=${end}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* ignore */
    }
    setTier('pro');
  }, [setTier]);

  const endPro = useCallback(() => {
    setTier('basic');
  }, [setTier]);

  const value = useMemo<EntitlementValue>(() => {
    const daysLeft = daysUntilTrialEnd(trialEnd);
    return {
      tier,
      trial: {
        active: tier === 'pro' && daysLeft > 0,
        daysLeft,
        endsAtIso: trialEnd,
      },
      isPro: tier === 'pro',
      isBasic: tier === 'basic',
      can: (f) => {
        const min = FEATURE_ACCESS[f];
        return TIER_ORDER[tier] >= TIER_ORDER[min];
      },
      limit: (f) => LIMITS[tier][f],
      allowance: (f) => ALLOWANCES[f]?.[tier],
      setTier,
      startTrial,
      endPro,
    };
  }, [tier, trialEnd, setTier, startTrial, endPro]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

const TIER_ORDER: Record<Tier, number> = { free: 0, basic: 1, pro: 2 };

export function useTier(): EntitlementValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useTier must be used inside <TierProvider>');
  return ctx;
}
