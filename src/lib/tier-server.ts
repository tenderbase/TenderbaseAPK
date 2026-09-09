import 'server-only';

import { cookies } from 'next/headers';
import { TIER_COOKIE, TRIAL_END_COOKIE } from '@/lib/tier-cookies';
import type { Tier } from '@/types/tier';

const VALID: Tier[] = ['free', 'basic', 'pro'];

function isTier(v: string | undefined): v is Tier {
  return v !== undefined && (VALID as string[]).includes(v);
}

/**
 * Server-side tier resolution — reads the same cookie the client store uses.
 * Until billing (W8) verifies subscriptions server-side, this is the single
 * source of truth for SSR gating. Defaults to 'free' (guest).
 */
export function getServerTier(): { tier: Tier; trialEnd: string | null } {
  const store = cookies();
  const raw = store.get(TIER_COOKIE)?.value;
  const trialEnd = store.get(TRIAL_END_COOKIE)?.value ?? null;
  return { tier: isTier(raw) ? raw : 'free', trialEnd };
}
