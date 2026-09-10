import type { TenderListParams } from '@/lib/api';

/**
 * Saved searches — v0, honest.
 *
 * A saved search is the URL state of Discover: keyword + category +
 * province + status + closing window. Everything here is a pure, tested
 * function over that state. The client store persists on this device
 * (clearly labelled) until the saved-searches account table ships — same
 * honest pattern as news bookmarks and alert settings.
 */

export type SavedSearchParams = Partial<
  Pick<TenderListParams, 'q' | 'category' | 'province' | 'status' | 'closingWithin'>
>;

export interface SavedSearchDef {
  id: string;
  name: string;
  params: SavedSearchParams;
  createdAt: string;
}

/** Canonical param order — keys not in this list are never saved. */
const ORDER = ['q', 'category', 'province', 'status', 'closingWithin'] as const;

/** Keep only the params Discover actually honours, dropping empties. */
export function paramsFromUrl(sp: URLSearchParams): SavedSearchParams {
  const out: SavedSearchParams = {};
  for (const key of ORDER) {
    const v = sp.get(key)?.trim();
    if (v) (out as Record<string, string>)[key] = v;
  }
  return out;
}

export function hasAny(p: SavedSearchParams): boolean {
  return Object.keys(p).length > 0;
}

/** Stable identity for a set of params (order-insensitive by construction). */
export function paramsKey(p: SavedSearchParams): string {
  return ORDER.filter((k) => p[k])
    .map((k) => `${k}=${p[k]}`)
    .join('&');
}

/** Deep-link used by "Run now" — rebuilds the Discover URL from a saved set. */
export function searchUrlFor(p: SavedSearchParams): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    if (v) sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `/search?${s}` : '/search';
}

export interface SearchSummaryChip {
  label: string;
  kind: 'query' | 'category' | 'province' | 'window' | 'status';
}

/** Chips shown on a saved-search card — all real param values. */
export function summarize(p: SavedSearchParams): SearchSummaryChip[] {
  const chips: SearchSummaryChip[] = [];
  if (p.q) chips.push({ label: `“${p.q}”`, kind: 'query' });
  if (p.category) chips.push({ label: p.category, kind: 'category' });
  if (p.province) chips.push({ label: p.province, kind: 'province' });
  if (p.closingWithin) chips.push({ label: 'Closing soon', kind: 'window' });
  if (p.status === 'active') chips.push({ label: 'Open only', kind: 'status' });
  return chips;
}

/** Human default name; users keep it unless they name it themselves later. */
export function defaultName(p: SavedSearchParams): string {
  if (p.q) return p.q;
  if (p.category) return p.category;
  if (p.province) return p.province;
  if (p.closingWithin) return 'Closing soon';
  if (p.status === 'active') return 'Open tenders';
  return 'All tenders';
}

/** Filters form for live match-count queries (limit handled by caller). */
export function toListParams(p: SavedSearchParams): TenderListParams {
  return {
    q: p.q,
    category: p.category,
    province: p.province,
    status: p.status,
    closingWithin: p.closingWithin,
    sort: 'newest',
    limit: 1,
  };
}

