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

function isTier(v: string | undefined): v is Tier {
  return v !== undefined && (VALID as string[]).includes(v);
}

export interface ServerTier {
  tier: Tier;
  trialEnd: string | null;
  /**
   * 'verified' — the tier came from this account's billing row.
   * 'guest'    — configured deployment, nobody signed in: free, and the
   *              browser gets no say. Entitlement actions route to sign-in.
   * 'cookie'   — no account store exists (preview deployment) or a dev auth
   *              bypass is on, so the cookie is the whole mechanism.
   *
   * Anything other than 'cookie' means the browser cannot grant itself a
   * tier, which is what the client store checks before letting a control
   * write one.
   */
  source: 'verified' | 'guest' | 'cookie';
}

/**
 * Server-side tier resolution.
 *
 * With Supabase configured AND a signed-in user, the account's verified
 * subscription decides (see entitlement.ts) — the cookie is ignored, so a
 * cleared or hand-edited cookie can never grant Pro.
 *
 * With Supabase configured and nobody signed in the answer is 'guest': free.
 * The cookie is only consulted where there is no account store at all (or a
 * dev bypass says so) — otherwise `tb_tier=pro` typed into devtools would
 * unlock paid features, which is precisely the hole billing exists to close.
 *
 * A failed lookup on a configured deployment also fails closed to 'guest'.
 * Browsing is unaffected (the catalogue is free by design); only entitlements
 * are withheld until we can prove otherwise.
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
