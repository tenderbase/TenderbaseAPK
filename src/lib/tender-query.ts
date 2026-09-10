/**
 * Query translation for the ingestion API — shared, pure, client-safe.
 *
 * Both data paths use this module: the server data layer (`lib/tenders.ts`,
 * which owns fixtures and ISR) and the browser-direct fallback
 * (`lib/tender-direct.ts`, used when our own server cannot reach the upstream).
 * A fallback that filtered differently from the primary path would show
 * different results for the same search, so the URL building lives here and
 * nowhere else.
 *
 * No `server-only`, no `fetch`, no fixtures — importing this from a Client
 * Component is safe.
 */

import type { ApiSort, ApiTenderQuery } from '@/types/api';
import type { SortOption } from '@/types/tender';

/** The API rejects (or silently truncates) anything larger. */
export const MAX_LIMIT = 100;

/**
 * App sort -> API sort.
 *
 * `value_desc` cannot be honoured: `valueCents` is null across the whole feed,
 * so there is nothing to order by. It degrades to `latest` instead of sending a
 * value the API would ignore anyway.
 */
export const SORT_MAP: Record<SortOption, ApiSort> = {
  closing_soon: 'closing',
  newest: 'latest',
  value_desc: 'latest',
};

export interface ListOptions {
  query?: string;
  /** Verbatim upstream category, e.g. 'Supplies: Computer Equipment'. */
  category?: string;
  /** Verbatim upstream province, e.g. 'KwaZulu-Natal'. */
  province?: string;
  /** 'active' | 'complete' | 'cancelled'. */
  status?: string;
  /** App-level window ('24h', '7d', '30d') — translated to closingAfter/Before. */
  closingWithin?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

/** '7d' -> 7, '24h' -> 1. Unknown or missing -> 7 days. */
export function closingWithinDays(val?: string): number {
  if (!val) return 7;
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return 7;
  if (val.trim().toLowerCase().endsWith('h')) return Math.max(1, Math.round(n / 24));
  return Math.max(1, n);
}

export function isoDaysFromNow(days: number, from = new Date()): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

/**
 * Builds the upstream query.
 *
 * Two translations matter:
 *  - `closingWithin` does not exist upstream (verified ignored), so it becomes a
 *    `closingAfter`/`closingBefore` bracket around now.
 *  - `sort=closing` is ascending over ALL tenders including long-closed ones,
 *    so a closing-soon request must also push `closingAfter=now` or the first
 *    page is nothing but expired records.
 */
export function buildApiQuery(opts: ListOptions, now = new Date()): ApiTenderQuery {
  const query: ApiTenderQuery = {
    page: Math.max(1, opts.page ?? 1),
    limit: opts.limit ?? 20,
    q: opts.query?.trim() || undefined,
    category: opts.category || undefined,
    province: opts.province || undefined,
    status: opts.status || undefined,
    sort: SORT_MAP[opts.sort ?? 'newest'],
  };

  if (opts.closingWithin || opts.sort === 'closing_soon') {
    const days = closingWithinDays(opts.closingWithin);
    query.closingAfter = now.toISOString();
    query.closingBefore = isoDaysFromNow(days, now);
    query.sort = 'closing';
  }

  return query;
}

/** Drops undefined/null/'' so optional filters never reach the wire as "undefined". */
export function buildQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

/**
 * `GET /tenders` path for a set of app-level list options.
 *
 * One function so the server client and the browser-direct client cannot drift:
 * both produce the same path, including the `limit` clamp.
 */
export function tenderListPath(opts: ListOptions = {}, now = new Date()): string {
  const query = buildApiQuery(opts, now);
  const limit = Math.min(query.limit ?? 20, MAX_LIMIT);
  return `/tenders${buildQuery({ ...query, limit })}`;
}
