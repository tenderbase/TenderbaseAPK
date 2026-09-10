/** Cookie names shared by the client tier store and the server tier helper. */
export const TIER_COOKIE = 'tb_tier';
export const TRIAL_END_COOKIE = 'tb_trial_end';

/**
 * May the cookie tier be trusted at all?
 *
 * Only where there is no account store to consult (credentials absent), or in
 * a dev preview that explicitly bypasses auth. On a configured deployment the
 * cookie is a browser-supplied claim: honouring it would let anyone open
 * devtools, set `tb_tier=pro` and unlock Pro — paid entitlement granted by the
 * client, which is exactly what the billing work exists to prevent.
 */
export function previewGrantAllowed(input: {
  supabaseConfigured: boolean;
  authBypassed: boolean;
}): boolean {
  return !input.supabaseConfigured || input.authBypassed;
}

/**
 * May a browser-supplied cookie unlock a feature that makes OUR SERVER issue a
 * request (today: the custom-feed preview in `/api/news/preview`)?
 *
 * A preview grant is fine for reading a few more news categories — the content
 * is public either way, and the worst case is an unlocked UI. It is not fine
 * for a feature that takes a URL from the browser and makes the server connect
 * to it: on a deployment with no account store, `tb_tier=pro` typed into
 * devtools would be the only thing standing between an anonymous visitor and a
 * server-side fetch of an arbitrary address. So the endpoints that fetch on our
 * server's behalf require a *verified* subscription, and honour the cookie only
 * outside production, where there is no real billing to protect and no real
 * network to escape onto.
 *
 * This is deliberately narrower than `previewGrantAllowed`, which governs UI
 * entitlement in general.
 */
export function cookieGrantUnlocksServerAction(input: {
  source: 'verified' | 'guest' | 'cookie';
  isProduction: boolean;
}): boolean {
  return input.source !== 'cookie' || !input.isProduction;
}

/** Cookie lifetime: a year, matching how long a preview grant may last. */
const YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Preview-only tier grant, written by the browser.
 *
 * Used ONLY where no account store exists (credentials absent) — there is no
 * server row to hold a subscription, so the cookie is the whole mechanism and
 * the UI says so. A signed-in account always resolves through the verified
 * billing row and ignores these cookies, so this can never grant Pro on a
 * configured deployment.
 */
export function writePreviewTier(tier: 'free' | 'basic' | 'pro', trialEndIso: string | null): void {
  try {
    document.cookie = `${TIER_COOKIE}=${tier}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
    document.cookie = trialEndIso
      ? `${TRIAL_END_COOKIE}=${trialEndIso}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`
      : `${TRIAL_END_COOKIE}=; path=/; max-age=0; samesite=lax`;
  } catch {
    /* No document (SSR) or cookies blocked — the caller stays put. */
  }
}
