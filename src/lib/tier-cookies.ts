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
