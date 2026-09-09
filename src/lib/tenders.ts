import 'server-only';

import {
  adaptCategories,
  adaptDetail,
  adaptProvinces,
  adaptTenderWithState,
} from '@/lib/adapt';
import {
  FIXTURE_CATEGORIES,
  FIXTURE_CAPTURED_AT,
  FIXTURE_PROVINCES,
  FIXTURE_STATS,
  FIXTURE_TENDERS,
} from '@/lib/fixtures/tender-api';
import { API_BASE_URL, FIXTURES_ONLY, TenderApiError, tenderApiServer } from '@/lib/tender-api.server';
import type { ApiSort, ApiStats, ApiTender, ApiTenderQuery } from '@/types/api';
import type { Category, SortOption, TenderWithUserState } from '@/types/tender';

/**
 * The single data source every screen reads from.
 *
 * Talks to the TenderBase Ingestion API (`API_BASE_URL`) and falls back to the
 * real payloads captured in `lib/fixtures` when the service is unreachable, so
 * the app is always demoable. `source` tells the UI which it got — surfaced
 * honestly by `DataSourceNotice` rather than passing captures off as live.
 *
 * The API is public: there is no key to configure, so nothing here is gated on
 * `TENDERBASE_API_KEY` any more.
 */

export type DataSource = 'live' | 'fixture';

export interface TenderPage {
  results: TenderWithUserState[];
  total: number;
  page: number;
  totalPages: number;
  source: DataSource;
  /** Present when we served the captured fixtures instead of the live API. */
  notice?: string;
}

/**
 * App sort -> API sort.
 *
 * `value_desc` cannot be honoured: `valueCents` is null across the whole feed,
 * so there is nothing to order by. It degrades to `latest` instead of sending a
 * value the API would ignore anyway.
 */
const SORT_MAP: Record<SortOption, ApiSort> = {
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

// ---------------------------------------------------------------------------
// Query translation
// ---------------------------------------------------------------------------

/** '7d' -> 7, '24h' -> 1. Unknown or missing -> 7 days. */
function closingWithinDays(val?: string): number {
  if (!val) return 7;
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return 7;
  if (val.trim().toLowerCase().endsWith('h')) return Math.max(1, Math.round(n / 24));
  return Math.max(1, n);
}

function isoDaysFromNow(days: number, from = new Date()): string {
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

// ---------------------------------------------------------------------------
// Fixture fallback
// ---------------------------------------------------------------------------

function fixtureNotice(e?: unknown): string {
  const captured = `Showing ${FIXTURE_TENDERS.results.length} tenders captured from the live API on ${FIXTURE_CAPTURED_AT}.`;
  if (e instanceof TenderApiError) {
    if (e.code === 'UPSTREAM_TIMEOUT') return `The tender service is still waking up. ${captured}`;
    if (e.code === 'NETWORK_ERROR') return `Could not reach the tender service. ${captured}`;
    if (e.code === 'INVALID_QUERY') return `The tender service rejected our query (${e.issues.join('; ')}). ${captured}`;
    return `Tender service error (${e.code}). ${captured}`;
  }
  if (e) return `${captured}`;
  return captured;
}

function matches(t: ApiTender, q: string): boolean {
  const hay = [t.title, t.description, t.organisation, t.tenderNumber, t.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return q.toLowerCase().split(/\s+/).every((term) => hay.includes(term));
}

/**
 * Applies the same filters to the captured fixtures, so search, province and
 * category chips still work when the API is unreachable — an offline preview
 * that ignores its own query string looks broken.
 */
function fixturePage(opts: ListOptions = {}, notice?: string, now = new Date()): TenderPage {
  const limit = opts.limit ?? 20;
  const page = Math.max(1, opts.page ?? 1);

  let rows = [...FIXTURE_TENDERS.results];
  if (opts.query?.trim()) rows = rows.filter((t) => matches(t, opts.query!.trim()));
  if (opts.category) rows = rows.filter((t) => t.category === opts.category);
  if (opts.province) rows = rows.filter((t) => t.province === opts.province);
  if (opts.status) rows = rows.filter((t) => t.status === opts.status);

  if (opts.closingWithin || opts.sort === 'closing_soon') {
    const days = closingWithinDays(opts.closingWithin);
    const until = new Date(now.getTime() + days * 86_400_000).getTime();
    rows = rows.filter((t) => {
      const c = new Date(t.closingDate ?? 0).getTime();
      return c >= now.getTime() && c <= until;
    });
  }

  if (opts.sort === 'closing_soon' || opts.closingWithin) {
    rows.sort((a, b) => new Date(a.closingDate ?? 0).getTime() - new Date(b.closingDate ?? 0).getTime());
  } else {
    rows.sort(
      (a, b) => new Date(b.firstSeenAt ?? 0).getTime() - new Date(a.firstSeenAt ?? 0).getTime(),
    );
  }

  const start = (page - 1) * limit;
  const slice = rows.slice(start, start + limit);
  return {
    results: slice.map((t) => adaptTenderWithState(t)),
    total: rows.length,
    page,
    totalPages: Math.max(1, Math.ceil(rows.length / limit)),
    source: 'fixture',
    notice: notice ?? fixtureNotice(),
  };
}

/** Every entry point funnels failures here, so no screen can throw to the user. */
function withFallback<T>(
  live: () => Promise<T>,
  fallback: (e: unknown) => T,
  label: string,
): Promise<T> {
  return live().catch((e) => {
    console.error(`[tenders] ${label} failed:`, e instanceof Error ? e.message : e);
    return fallback(e);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function listTenders(opts: ListOptions = {}): Promise<TenderPage> {
  if (FIXTURES_ONLY) return fixturePage(opts);

  const query = buildApiQuery(opts);
  return withFallback(
    async () => {
      const res = await tenderApiServer.list(query);
      return {
        results: (res.results ?? []).map((t) => adaptTenderWithState(t)),
        total: res.total ?? res.results?.length ?? 0,
        page: res.page ?? query.page ?? 1,
        totalPages: res.totalPages ?? 1,
        source: 'live' as DataSource,
      };
    },
    (e) => fixturePage(opts, fixtureNotice(e)),
    'list',
  );
}

/**
 * `GET /tenders/:id`. Returns null on a genuine 404 so the page can
 * `notFound()`; any other failure falls back to the captured fixtures.
 */
export async function getTender(id: string) {
  const fromFixtures = () => {
    const t = FIXTURE_TENDERS.results.find((x) => x.id === id);
    return t
      ? {
          tender: adaptDetail({ ...t, amendments: [] }),
          source: 'fixture' as DataSource,
          notice: fixtureNotice(),
        }
      : null;
  };

  if (FIXTURES_ONLY) return fromFixtures();

  try {
    const res = await tenderApiServer.getById(id);
    if (!res?.tender) return fromFixtures();
    return { tender: adaptDetail(res.tender), source: 'live' as DataSource };
  } catch (e) {
    if (e instanceof TenderApiError && e.status === 404) return null;
    console.error('[tenders] detail failed:', e instanceof Error ? e.message : e);
    return fromFixtures();
  }
}

/**
 * Dashboard "closing soon" rail: the next `days` days, soonest first.
 * Built from `sort=closing` + `closingAfter=now` because there is no
 * `/tenders/closing-soon` endpoint on this service.
 */
export async function getClosingSoon(limit = 5, days = 7): Promise<TenderPage> {
  return listTenders({ closingWithin: `${days}d`, sort: 'closing_soon', limit });
}

/** Newest records into the pipeline. `sort=latest` is upstream's own ordering. */
export async function getLatest(limit = 5): Promise<TenderPage> {
  return listTenders({ sort: 'newest', limit });
}

export interface Facets {
  categories: { name: string; count: number; group: Category }[];
  provinces: { name: string; count: number }[];
  source: DataSource;
  notice?: string;
}

/** Filter vocabularies for the search UI, with live counts. */
export async function getFacets(): Promise<Facets> {
  const fixtureFacets = (notice?: string): Facets => ({
    categories: adaptCategories(FIXTURE_CATEGORIES),
    provinces: adaptProvinces(FIXTURE_PROVINCES),
    source: 'fixture',
    notice: notice ?? fixtureNotice(),
  });

  if (FIXTURES_ONLY) return fixtureFacets();

  return withFallback(
    async () => {
      const [cats, provs] = await Promise.all([
        tenderApiServer.categories(),
        tenderApiServer.provinces(),
      ]);
      return {
        categories: adaptCategories(cats),
        provinces: adaptProvinces(provs),
        source: 'live' as DataSource,
      };
    },
    (e) => fixtureFacets(fixtureNotice(e)),
    'facets',
  );
}

export interface DatasetStats extends ApiStats {
  source: DataSource;
  notice?: string;
}

/** Pipeline totals for the dashboard counters. */
export async function getStats(): Promise<DatasetStats> {
  if (FIXTURES_ONLY) {
    return { ...FIXTURE_STATS.stats, source: 'fixture', notice: fixtureNotice() };
  }
  return withFallback(
    async () => {
      const res = await tenderApiServer.stats();
      return { ...res.stats, source: 'live' as DataSource };
    },
    (e) => ({ ...FIXTURE_STATS.stats, source: 'fixture' as DataSource, notice: fixtureNotice(e) }),
    'stats',
  );
}

/** Where the data came from — surfaced in the UI footer and error notices. */
export const UPSTREAM_BASE_URL = API_BASE_URL;
