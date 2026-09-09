import { CATEGORIES, PROVINCES, type Category, type Province } from './tender';

/**
 * Tender preferences — what the user wants to see in their feed.
 *
 * Every field here maps to a filter the TenderBase API actually supports.
 * Deliberately absent: a tender value range (the feed carries no monetary
 * field, so `valueCents` is always null) and B-BBEE/CIDB qualification
 * matching (tenders don't publish their requirements, so there is nothing to
 * match a company profile against). Both are surfaced in the UI as
 * unavailable rather than silently doing nothing.
 */

/** Minimum days before closing. Below this there isn't time to prepare a bid. */
export const CLOSING_WINDOWS = [0, 3, 7, 14] as const;
export type ClosingWindow = (typeof CLOSING_WINDOWS)[number];

export const CLOSING_WINDOW_LABELS: Record<ClosingWindow, string> = {
  0: 'Show all',
  3: 'At least 3 days',
  7: 'At least 7 days',
  14: 'At least 14 days',
};

export type DigestFrequency = 'off' | 'daily' | 'weekly';

export interface TenderPreferences {
  categories: Category[];
  provinces: Province[];
  /** National tenders aren't province-scoped, so they're opt-in separately. */
  includeNational: boolean;
  /** Hide tenders closing sooner than this many days away. 0 = no filter. */
  minDaysToClose: ClosingWindow;
  /**
   * Only tenders with at least one attached document.
   *
   * Applied client-side: the ingestion API has no documents filter. Every
   * sampled record carries at least one document, so in practice this hides
   * very little — but it must not be presented as a server-side guarantee.
   */
  requireDocuments: boolean;

  // Alerts
  alertOnNewMatch: boolean;
  alertOnClosingSoon: boolean;
  alertOnSavedUpdated: boolean;
  digest: DigestFrequency;
}

export const DEFAULT_PREFERENCES: TenderPreferences = {
  categories: ['IT & Technology', 'Supply & Delivery'],
  provinces: ['KwaZulu-Natal'],
  includeNational: true,
  minDaysToClose: 0,
  requireDocuments: false,
  alertOnNewMatch: true,
  alertOnClosingSoon: true,
  alertOnSavedUpdated: false,
  digest: 'daily',
};

/** Categories a user can pick. 'Other' is an upstream fallback, not a choice. */
export const SELECTABLE_CATEGORIES = CATEGORIES.filter((c) => c !== 'Other');

/** 'National' is a scope, handled by the includeNational toggle. */
export const SELECTABLE_PROVINCES = PROVINCES.filter((p) => p !== 'National');

export function toggleInList<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * An empty category or province list means "no restriction", not "no results".
 * Without this the feed would look broken the moment someone deselects
 * everything.
 */
export function summarise(p: TenderPreferences): string {
  const cats = p.categories.length === 0 ? 'All categories' :
    `${p.categories.length} ${p.categories.length === 1 ? 'category' : 'categories'}`;
  const provs = p.provinces.length === 0 ? 'all provinces' :
    `${p.provinces.length} ${p.provinces.length === 1 ? 'province' : 'provinces'}`;
  return `${cats} · ${provs}`;
}

export function countActiveFilters(p: TenderPreferences): number {
  return (
    (p.categories.length > 0 ? 1 : 0) +
    (p.provinces.length > 0 ? 1 : 0) +
    (p.minDaysToClose > 0 ? 1 : 0) +
    (p.requireDocuments ? 1 : 0) +
    (p.includeNational ? 0 : 1)
  );
}

export function preferencesEqual(a: TenderPreferences, b: TenderPreferences): boolean {
  const sameList = <T>(x: T[], y: T[]) =>
    x.length === y.length && [...x].sort().every((v, i) => v === [...y].sort()[i]);
  return (
    sameList(a.categories, b.categories) &&
    sameList(a.provinces, b.provinces) &&
    a.includeNational === b.includeNational &&
    a.minDaysToClose === b.minDaysToClose &&
    a.requireDocuments === b.requireDocuments &&
    a.alertOnNewMatch === b.alertOnNewMatch &&
    a.alertOnClosingSoon === b.alertOnClosingSoon &&
    a.alertOnSavedUpdated === b.alertOnSavedUpdated &&
    a.digest === b.digest
  );
}

/**
 * Translates preferences into ingestion-API query params.
 *
 * Only what the API genuinely supports is pushed server-side. Sending a param
 * it ignores is worse than not sending it: `/tenders` drops unknown keys
 * silently, so a bogus filter looks like it worked and quietly returns the
 * whole unfiltered dataset.
 *
 *  - `province` — safe. Our `PROVINCES` are the upstream's exact display names
 *    (verified against `/provinces`, all 10 including `National`).
 *  - `closingAfter` — `minDaysToClose` means "leave me N days to prepare", i.e.
 *    closing no sooner than now + N days.
 *  - `category` — NOT pushed. Our 13-value taxonomy is a *grouping* of the
 *    upstream's 62 categories (`deriveCategory` maps e.g. Construction <-
 *    {Construction, Construction of buildings, Specialised construction
 *    activities, Services: Building, Services: Civil}), and `/tenders` accepts
 *    exactly one verbatim name. Sending 'Construction' alone would under-report;
 *    sending 'IT & Technology' matches zero rows. Applied client-side until
 *    preferences store upstream category names directly.
 *  - `requireDocuments` — NOT pushed; no such filter exists upstream.
 */
export function toQueryParams(p: TenderPreferences): Record<string, string> {
  const params: Record<string, string> = {};
  if (p.provinces.length === 1 && !p.includeNational) params.province = p.provinces[0];
  if (p.minDaysToClose > 0) {
    params.closingAfter = new Date(
      Date.now() + p.minDaysToClose * 86_400_000,
    ).toISOString();
  }
  return params;
}
