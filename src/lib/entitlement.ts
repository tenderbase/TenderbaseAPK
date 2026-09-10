/**
 * Entitlement resolution — pure, no React, no database.
 *
 * Turns a verified billing row into the tier the server grants. This is the
 * single place that decides "does this account have Pro", so the SSR gate,
 * the client store and the plan screen can never disagree.
 *
 * Honesty rules baked in here:
 *   - a trial only counts until its end instant, then the account drops to
 *     Basic (never "still Pro, we'll catch up later");
 *   - a cancelled subscription keeps Pro until the period it already paid
 *     for actually ends;
 *   - a row we cannot date (no period end) is treated as valid, because we
 *     have no evidence it lapsed — PayFast is the one that says otherwise;
 *   - no row at all means Basic: a signed-in free account.
 */

import type { Tier } from '@/types/tier';

export type SubscriptionStatus = 'trialing' | 'active' | 'cancelled' | 'expired';

export interface SubscriptionSnapshot {
  plan: string;
  status: SubscriptionStatus;
  /** End of the current paid or trial period (ISO), when known. */
  currentPeriodEnd: string | null;
  /** Trial end (ISO) — set while status is 'trialing'. */
  trialEndsAt: string | null;
  /** User cancelled: Pro continues to the end of the paid period. */
  cancelAtPeriodEnd: boolean;
}

export type EntitlementReason =
  | 'active_trial'
  | 'trial_ended'
  | 'subscribed'
  | 'cancel_at_period_end'
  | 'subscription_ended'
  | 'no_subscription';

export interface Entitlement {
  tier: Tier;
  /** Set while Pro is granted by an *unexpired* trial. */
  trialEnd: string | null;
  reason: EntitlementReason;
}

function isPast(iso: string | null, now: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false; // undated: no evidence it lapsed
  return t <= now.getTime();
}

export function entitlementFromSubscription(
  sub: SubscriptionSnapshot | null,
  now: Date = new Date(),
): Entitlement {
  if (!sub) return { tier: 'basic', trialEnd: null, reason: 'no_subscription' };

  switch (sub.status) {
    case 'trialing': {
      if (isPast(sub.trialEndsAt ?? sub.currentPeriodEnd, now)) {
        return { tier: 'basic', trialEnd: null, reason: 'trial_ended' };
      }
      return { tier: 'pro', trialEnd: sub.trialEndsAt ?? sub.currentPeriodEnd, reason: 'active_trial' };
    }
    case 'active': {
      if (isPast(sub.currentPeriodEnd, now)) {
        return { tier: 'basic', trialEnd: null, reason: 'subscription_ended' };
      }
      return {
        tier: 'pro',
        trialEnd: null,
        reason: sub.cancelAtPeriodEnd ? 'cancel_at_period_end' : 'subscribed',
      };
    }
    case 'cancelled':
    case 'expired':
      return { tier: 'basic', trialEnd: null, reason: 'subscription_ended' };
  }
}

/** Copy for the plan screen, kept with the resolver so they cannot drift. */
export const REASON_COPY: Record<EntitlementReason, string> = {
  active_trial: 'Trial active',
  trial_ended: 'Your trial has ended — the account is on Basic.',
  subscribed: 'Subscription active',
  cancel_at_period_end: 'Cancelled — Pro runs until the end of the paid period.',
  subscription_ended: 'Subscription ended — the account is on Basic.',
  no_subscription: 'No subscription yet.',
};
