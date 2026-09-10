'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
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
 * State is seeded from the server, so the first render and SSR agree. When
 * the server resolved the tier from a verified billing row (`billingEnforced`)
 * this store mirrors it and every entitlement action goes through the billing
 * API — a browser cannot grant itself Pro. Otherwise the cookie is the
 * mechanism, which is how the whole app is previewed without credentials.
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
  /** True when the tier comes from a verified billing row (not a cookie). */
  billingEnforced: boolean;
  setTier: (tier: Tier) => void;
  startTrial: () => void;
  endPro: () => void;
}

const EntitlementContext = createContext<EntitlementValue | null>(null);

export function TierProvider({
  children,
  initialTier,
  initialTrialEnd,
  billingEnforced = false,
}: {
  children: ReactNode;
  initialTier: Tier;
  initialTrialEnd: string | null;
  /**
   * True when the server resolved the tier from this account's verified
   * billing row. Entitlement actions then go through the billing API and the
   * cookie/dev grants are disabled — a browser cannot grant itself Pro.
   */
  billingEnforced?: boolean;
}) {
  const router = useRouter();
  const [tier, setTierState] = useState<Tier>(initialTier);
  const [trialEnd, setTrialEnd] = useState<string | null>(initialTrialEnd);

  // The server is authoritative: when it re-renders with a new entitlement
  // (after a trial starts, a payment clears, or a period lapses), follow it.
  useEffect(() => {
    setTierState(initialTier);
    setTrialEnd(initialTrialEnd);
  }, [initialTier, initialTrialEnd]);

  const setTier = useCallback(
    (next: Tier) => {
      if (billingEnforced) {
        // Preview-only control. In billing mode the tier is a server fact.
        console.warn('[tier] setTier ignored — entitlements are server-verified');
        return;
      }
      setTierState(next);
      try {
        document.cookie = `${TIER_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      } catch {
        /* cookie unavailable (SSR) — state still updates for this session */
      }
      if (next !== 'pro') setTrialEnd(null);
    },
    [billingEnforced],
  );

  const startTrial = useCallback(() => {
    if (billingEnforced) {
      void fetch('/api/billing/trial', { method: 'POST' })
        .then(async (res) => {
          if (res.status === 401) {
            router.push('/login?next=/pro');
            return;
          }
          if (!res.ok) {
            console.error('[tier] trial not started:', res.status);
            return;
          }
          router.refresh(); // server re-resolves the entitlement from the row
        })
        .catch(() => {
          /* offline — the sheet stays open and the user can retry */
        });
      return;
    }
    const end = new Date(Date.now() + PRO_TRIAL_DAYS * 86_400_000).toISOString();
    setTrialEnd(end);
    try {
      document.cookie = `${TRIAL_END_COOKIE}=${end}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    } catch {
      /* ignore */
    }
    setTier('pro');
  }, [billingEnforced, router, setTier]);

  const endPro = useCallback(() => {
    if (billingEnforced) {
      void fetch('/api/billing/trial', { method: 'DELETE' })
        .then((res) => {
          if (res.ok) router.refresh();
        })
        .catch(() => {
          /* offline — nothing changes, which is the honest outcome */
        });
      return;
    }
    setTier('basic');
  }, [billingEnforced, router, setTier]);

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
      billingEnforced,
      setTier,
      startTrial,
      endPro,
    };
  }, [tier, trialEnd, billingEnforced, setTier, startTrial, endPro]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

const TIER_ORDER: Record<Tier, number> = { free: 0, basic: 1, pro: 2 };

export function useTier(): EntitlementValue {
  const ctx = useContext(EntitlementContext);
  if (!ctx) throw new Error('useTier must be used inside <TierProvider>');
  return ctx;
}
