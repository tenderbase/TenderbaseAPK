/**
 * Tier & entitlement model — the single source of truth for what each plan
 * can do (blueprint §A1). One module, imported by the client store, the
 * server helper and every screen. NEVER per-screen if/else tiers.
 *
 *   free  → guest browsing (no account)
 *   basic → signed-in free account
 *   pro   → paid (14-day trial in this UI phase; real billing wires later)
 */

export type Tier = 'free' | 'basic' | 'pro';

export type FeatureKey =
  | 'browse'            // full catalogue, details, documents
  | 'saved'             // save tenders (basic: 50, pro: unlimited)
  | 'saved-searches'    // basic: 3, pro: unlimited
  | 'ai-quick'          // quick summaries (free 2/mo, basic 10/mo, pro ∞)
  | 'ai-deep'           // deep analysis: requirements/eligibility/risk
  | 'ask-followup'      // grounded follow-up questions on a tender
  | 'matches-preview'   // Today's Matches top 3 (basic)
  | 'matches-full'      // full ranked matches
  | 'matches-reasons'   // reason chips + trend on matches
  | 'alerts-inapp'      // in-app notifications
  | 'push-basic'        // push: saved/closing only
  | 'push-full'         // push: full rules engine, instant match
  | 'digest-weekly'     // email digest (weekly)
  | 'digest-daily'      // email digest (daily)
  | 'news-basic'        // 3 news categories
  | 'news-all'          // all categories
  | 'news-relevant'     // "relevant to me" re-ranking
  | 'custom-rss'        // custom RSS sources
  | 'export'            // CSV/PDF shortlist, calendar .ics
  | 'calendar-sync'     // deadline calendar sync
  | 'market-pulse'      // volume/value charts
  | 'org-watch'         // track issuers (basic 1, pro 10)
  | 'profile-full';     // company profile + matching

/** Minimum tier that can use each feature. */
export const FEATURE_ACCESS: Record<FeatureKey, Tier> = {
  browse: 'free',
  saved: 'basic',
  'saved-searches': 'basic',
  'ai-quick': 'free',
  'ai-deep': 'pro',
  'ask-followup': 'pro',
  'matches-preview': 'basic',
  'matches-full': 'pro',
  'matches-reasons': 'pro',
  'alerts-inapp': 'basic',
  'push-basic': 'basic',
  'push-full': 'pro',
  'digest-weekly': 'basic',
  'digest-daily': 'pro',
  'news-basic': 'basic',
  'news-all': 'pro',
  'news-relevant': 'pro',
  'custom-rss': 'pro',
  export: 'pro',
  'calendar-sync': 'pro',
  'market-pulse': 'pro',
  'org-watch': 'basic',
  'profile-full': 'basic',
};

/** Numeric limits by tier (undefined = unlimited / not offered). */
export const LIMITS: Record<'free' | 'basic' | 'pro', Partial<Record<FeatureKey, number>>> = {
  // `news-basic` doubles as the news category allowance: guests read the
  // first 2 rails, Basic the first 3 (blueprint §5.7).
  free: { 'ai-quick': 2, saved: 0, 'org-watch': 0, 'news-basic': 2 },
  basic: { 'ai-quick': 10, saved: 50, 'saved-searches': 3, 'org-watch': 1, 'news-basic': 3, 'ai-deep': 1 },
  pro: {},
};

/** One-off allowances handed to lower tiers (e.g. Basic gets 1 deep demo). */
export const ALLOWANCES: Partial<Record<FeatureKey, Partial<Record<Tier, number>>>> = {
  'ai-deep': { basic: 1 },
};

export interface TierMeta {
  label: string;
  blurb: string;
  /** Shown in the Pro Hub comparison header. */
  priceLine: string;
}

export const TIER_META: Record<Tier, TierMeta> = {
  free: { label: 'Free', blurb: 'Browse the full tender catalogue — no account needed.', priceLine: 'R0' },
  basic: { label: 'Basic', blurb: 'Free account — save tenders, get matched, in-app alerts.', priceLine: 'R0' },
  pro: { label: 'Pro', blurb: 'Unlimited AI, full matches with reasons, push & all news feeds.', priceLine: 'From R249/mo' },
};

/** Feature labels used by the comparison table and upgrade copy. */
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  browse: 'Full tender catalogue',
  saved: 'Saved tenders',
  'saved-searches': 'Saved searches',
  'ai-quick': 'AI quick summaries',
  'ai-deep': 'AI deep analysis',
  'ask-followup': 'Ask a follow-up on any tender',
  'matches-preview': "Today's Matches (top 3)",
  'matches-full': "Today's Matches (full, ranked)",
  'matches-reasons': 'Match reasons & trends',
  'alerts-inapp': 'In-app notifications',
  'push-basic': 'Push — saved & closing alerts',
  'push-full': 'Push — instant match + rules engine',
  'digest-weekly': 'Weekly email digest',
  'digest-daily': 'Daily email digest',
  'news-basic': 'News categories (3)',
  'news-all': 'All news categories',
  'news-relevant': '"Relevant to me" news ranking',
  'custom-rss': 'Custom RSS feeds',
  export: 'Export shortlists (CSV/PDF/.ics)',
  'calendar-sync': 'Deadline calendar sync',
  'market-pulse': 'Market pulse (volume & value)',
  'org-watch': 'Organisation watch',
  'profile-full': 'Company profile + AI matching',
};

export const PRO_MONTHLY_ZAR = 249;
export const PRO_YEARLY_ZAR = 1999;
export const PRO_TRIAL_DAYS = 14;

export const proYearlyMonthlyEquivalent = PRO_YEARLY_ZAR / 12;
export const proYearlySavingPct = Math.round(
  (1 - PRO_YEARLY_ZAR / (PRO_MONTHLY_ZAR * 12)) * 100,
);

export function formatZAR(n: number): string {
  return `R${n.toLocaleString('en-ZA')}`;
}
