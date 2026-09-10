/**
 * Onboarding — the first-run Basic/Pro decision.
 *
 * Pure rules, so the screen, the OAuth callback and the tests all agree on
 * what a choice means and what we are allowed to offer.
 */

export type OnboardingChoice = 'basic' | 'pro';

export const ONBOARDING_CHOICES: readonly OnboardingChoice[] = ['basic', 'pro'] as const;

export function isOnboardingChoice(value: unknown): value is OnboardingChoice {
  return value === 'basic' || value === 'pro';
}

/**
 * Where a `next` parameter is allowed to point.
 *
 * Only same-site absolute paths. `//evil.com` and `https://evil.com` are
 * protocol-relative/absolute redirects — on a page the user reaches straight
 * after authenticating, that is a phishing vector, so they collapse to the
 * fallback.
 */
export function safeNext(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  return raw;
}

/** Adds `next` onto /welcome, keeping one canonical spelling. */
export function welcomeHref(next: string | null | undefined): string {
  const target = safeNext(next);
  return target === '/' ? '/welcome' : `/welcome?next=${encodeURIComponent(target)}`;
}

/**
 * What the Pro card can honestly offer this account.
 *
 *   active      — already subscribed; nothing to sell, just continue
 *   trial       — the one-per-account trial is genuinely available
 *   subscribe   — trial used (or not offered); card checkout can run
 *   unavailable — neither: we say so rather than showing a dead button
 */
export type ProOffer = 'active' | 'trial' | 'subscribe' | 'unavailable';

export function proOffer(input: {
  /** A paid subscription is active (or cancelling at period end). */
  subscribed: boolean;
  /** Server says the trial is available AND could actually be recorded. */
  trialReady: boolean;
  /** PayFast + storage are configured, so a card payment could really run. */
  checkoutReady: boolean;
}): ProOffer {
  if (input.subscribed) return 'active';
  if (input.trialReady) return 'trial';
  if (input.checkoutReady) return 'subscribe';
  return 'unavailable';
}

/** Bullets that are true of the free account, used on the Basic card. */
export const BASIC_POINTS: readonly string[] = [
  'Browse the full tender catalogue — nothing hidden',
  '50 saved tenders and 3 saved searches',
  'Top-3 daily matches and in-app deadline alerts',
];

/** Bullets that are true of Pro, used on the Pro card. */
export const PRO_POINTS: readonly string[] = [
  'Unlimited saved tenders, searches and deep AI summaries',
  'Every match, with the reasons why it fits your business',
  'Instant-match push, daily digest and all news categories',
];
