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
import { writePreviewTier } from '@/lib/tier-cookies';

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

export interface TrialStartResult {
  ok: boolean;
  status?: number;
  message?: string;
}

export interface EntitlementValue {
  tier: Tier;
  trial: TrialInfo;
  isPro: boolean;
  isBasic: boolean;
  can: (feature: FeatureKey) => boolean;
  limit: (feature: FeatureKey) => number | undefined;
  allowance: (feature: FeatureKey) => number | undefined;
  billingEnforced: boolean;
  setTier: (tier: Tier) => void;
  startTrial: () => Promise<TrialStartResult>;
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
  billingEnforced?: boolean;
}) {
  const router = useRouter();
  const [tier, setTierState] = useState<Tier>(initialTier);
  const [trialEnd, setTrialEnd] = useState<string | null>(initialTrialEnd);

  useEffect(() => {
    setTierState(initialTier);
    setTrialEnd(initialTrialEnd);
  }, [initialTier, initialTrialEnd]);

  const setTier = useCallback(
    (next: Tier) => {
      if (billingEnforced) {
        console.warn('[tier] setTier ignored — entitlements are server-verified');
        return;
      }
      setTierState(next);
      if (next !== 'pro') setTrialEnd(null);
      writePreviewTier(next, next === 'pro' ? trialEnd : null);
    },
    [billingEnforced, trialEnd],
  );

  const startTrial = useCallback(async (): Promise<TrialStartResult> => {
    if (billingEnforced) {
      try {
        const res = await fetch('/api/billing/trial', { method: 'POST' });
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };

        if (res.status === 401) {
          router.push('/login?next=/pro');
          return { ok: false, status: 401, message: 'Please sign in to start your free trial.' };
        }

        if (!res.ok) {
          const message = body.message ??
            (body.error === 'already_used'
              ? 'Your free trial has already been used.'
              : body.error === 'already_subscribed'
                ? 'You already have an active Pro subscription.'
                : 'Unable to start the free trial right now. Please try again.');
          console.error('[tier] trial not started:', res.status, body.error ?? body.message ?? 'unknown');
          return { ok: false, status: res.status, message };
        }

        router.refresh();
        return { ok: true };
      } catch (error) {
        console.error('[tier] trial request failed:', error);
        return { ok: false, message: 'Could not reach the billing service. Please try again.' };
      }
    }

    const end = new Date(Date.now() + PRO_TRIAL_DAYS * 86_400_000).toISOString();
    setTrialEnd(end);
    writePreviewTier('pro', end);
    setTierState('pro');
    return { ok: true };
  }, [billingEnforced, router]);

  const endPro = useCallback(() => {
    if (billingEnforced) {
      void fetch('/api/billing/trial', { method: 'DELETE' })
        .then((res) => {
          if (res.ok) router.refresh();
        })
        .catch(() => {
          /* offline — nothing changes */
        });
      return;
    }
    setTierState('basic');
    setTrialEnd(null);
    writePreviewTier('basic', null);
  }, [billingEnforced, router]);

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
