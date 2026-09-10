import 'server-only';

import { cookies } from 'next/headers';
import { TIER_COOKIE, TRIAL_END_COOKIE, previewGrantAllowed } from '@/lib/tier-cookies';
import { entitlementFromSubscription, type SubscriptionSnapshot } from '@/lib/entitlement';
import { fetchSubscription } from '@/lib/billing.server';
import { getUser } from '@/lib/supabase-server';
import { createClient } from '@/lib/supabase-server';
import { isAuthBypassed, isSupabaseConfigured } from '@/lib/supabase-config';
import type { Tier } from '@/types/tier';

const VALID: Tier[] = ['free', 'basic', 'pro'];

/**
 * Explicit testing override for the live/staging deployment.
 *
 * Set TENDERBASE_TEST_PRO=true on the Render web service while testing, and
 * remove/disable it before real billing goes live. When enabled, every
 * visitor/account resolves to Pro regardless of the stored billing tier.
 */
const testProEnabled = process.env.TENDERBASE_TEST_PRO === 'true';

function isTier(v: string | undefined): v is Tier {
  return v !== undefined && (VALID as string[]).includes(v);
}

export interface ServerTier {
  tier: Tier;
  trialEnd: string | null;
  /**
   * 'verified' — the tier came from this account's billing row.
   * 'guest'    — configured deployment, nobody signed in: free, and the
   *              browser gets no say.
   * 'cookie'   — no account store exists (preview deployment) or a dev auth
   *              bypass is on, so the cookie is the whole mechanism.
   */
  source: 'verified' | 'guest' | 'cookie';
}

/** Server-side tier resolution. */
export async function getServerTier(): Promise<ServerTier> {
  // Testing override intentionally runs before auth/billing resolution so the
  // live app can exercise the complete Pro UI while the product is being built.
  if (testProEnabled) {
    return { tier: 'pro', trialEnd: null, source: 'cookie' };
  }

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
    // Unreachable auth on a preview deployment falls through to the cookie;
    // a configured one fails closed to 'guest' just below.
  }

  if (!previewGrantAllowed({ supabaseConfigured: isSupabaseConfigured, authBypassed: isAuthBypassed })) {
    return { tier: 'free', trialEnd: null, source: 'guest' };
  }

  const store = cookies();
  const raw = store.get(TIER_COOKIE)?.value;
  const trialEnd = store.get(TRIAL_END_COOKIE)?.value ?? null;
  return { tier: isTier(raw) ? raw : 'free', trialEnd, source: 'cookie' };
}
