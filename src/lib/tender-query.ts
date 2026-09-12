/**
 * Query translation for the ingestion API — shared, pure, client-safe.
 *
 * Both data paths use this module: the server data layer (`lib/tenders.ts`,
 * which owns fixtures and ISR) and the browser-direct fallback
 * (`lib/tender-direct.ts`, used when our own server cannot reach the upstream).
 * A fallback that filtered differently from the primary path would show
 * different results for the same search, so the URL building lives here and
 * nowhere else.
 */

import type { ApiSort, ApiTenderQuery } from '@/types/api';
import type { SortOption } from '@/types/tender';

export const MAX_LIMIT = 100;

export const SORT_MAP: Record<SortOption, ApiSort> = {
  closing_soon: 'closing',
  newest: 'latest',
  value_desc: 'latest',
};

export interface ListOptions {
  query?: string;
  category?: string;
  province?: string;
  status?: string;
  municipality?: string;
  municipalityCode?: string;
  procurementType?: string;
  closingWithin?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export type MunicipalityApiQuery = ApiTenderQuery & {
  municipality?: string;
  municipalityCode?: string;
  procurementType?: string;
};

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

export function buildApiQuery(opts: ListOptions, now = new Date()): MunicipalityApiQuery {
  const query: MunicipalityApiQuery = {
    page: Math.max(1, opts.page ?? 1),
    limit: opts.limit ?? 20,
    q: opts.query?.trim() || undefined,
    category: opts.category || undefined,
    province: opts.province || undefined,
    status: opts.status || undefined,
    municipality: opts.municipality || undefined,
    municipalityCode: opts.municipalityCode || undefined,
    procurementType: opts.procurementType?.toUpperCase() || undefined,
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

export function buildQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function tenderListPath(opts: ListOptions = {}, now = new Date()): string {
  const query = buildApiQuery(opts, now);
  const limit = Math.min(query.limit ?? 20, MAX_LIMIT);
  return `/tenders${buildQuery({ ...query, limit })}`;
}
