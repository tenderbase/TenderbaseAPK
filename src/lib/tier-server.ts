import 'server-only';

import { cookies } from 'next/headers';
import { TIER_COOKIE, TRIAL_END_COOKIE } from '@/lib/tier-cookies';
import { entitlementFromSubscription, type SubscriptionSnapshot } from '@/lib/entitlement';
import { fetchSubscription } from '@/lib/billing.server';
import { getUser } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-server';
import type { Tier } from '@/types/tier';

const VALID: Tier[] = ['free', 'basic', 'pro'];

function isTier(v: string | undefined): v is Tier {
  return v !== undefined && (VALID as string[]).includes(v);
}

export interface ServerTier {
  tier: Tier;
  trialEnd: string | null;
  /**
   * 'verified' — the tier came from this account's billing row.
   * 'cookie'   — Supabase is unconfigured (sandbox/dev preview) or nobody is
   *              signed in, so the cookie remains the source of truth.
   *
   * The client uses this to decide whether entitlement actions are real
   * (server-verified billing) or preview-only (dev tier switcher).
   */
  source: 'verified' | 'cookie';
}

/**
 * Server-side tier resolution.
 *
 * With Supabase configured AND a signed-in user, the account's verified
 * subscription decides (see entitlement.ts) — the cookie is ignored, so a
 * cleared or hand-edited cookie can never grant Pro.
 *
 * Otherwise (sandbox preview, signed-out browsing, or a missing migration)
 * it falls back to the cookie the client store writes, which is how the
 * whole app is previewed without credentials.
 */
export async function getServerTier(): Promise<ServerTier> {
  try {
    const user = await getUser();
    if (user) {
      const sub = await fetchSubscription(createClient());
      const snapshot: SubscriptionSnapshot | null = sub
        ? {
            plan: sub.plan,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            trialEndsAt: sub.trialEndsAt,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          }
        : null;
      const ent = entitlementFromSubscription(snapshot);
      return { tier: ent.tier, trialEnd: ent.trialEnd, source: 'verified' };
    }
  } catch {
    // Unconfigured or unreachable auth — fall through to the cookie so the
    // app keeps working rather than silently downgrading everyone.
  }

  const store = cookies();
  const raw = store.get(TIER_COOKIE)?.value;
  const trialEnd = store.get(TRIAL_END_COOKIE)?.value ?? null;
  return { tier: isTier(raw) ? raw : 'free', trialEnd, source: 'cookie' };
}
