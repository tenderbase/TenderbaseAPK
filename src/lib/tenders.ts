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
import { API_BASE_URL, FIXTURES_ALLOWED, FIXTURES_ONLY, TenderApiError, tenderApiServer } from '@/lib/tender-api.server';
import { buildApiQuery, closingWithinDays, type ListOptions } from '@/lib/tender-query';
import type { ApiStats, ApiTender } from '@/types/api';
import type { Category, TenderWithUserState } from '@/types/tender';

// Re-exported for the existing importers (tests included). The implementation
// lives in `lib/tender-query.ts` so the browser-direct fallback builds the exact
// same upstream URL — see `lib/tender-direct.ts`.
export { buildApiQuery, SORT_MAP } from '@/lib/tender-query';
export type { ListOptions } from '@/lib/tender-query';

/**
 * The single data source every screen reads from.
 *
 * Talks to the TenderBase Ingestion API (`API_BASE_URL`). In development and
 * test builds only (`FIXTURES_ALLOWED`), an unreachable service falls back to
 * the real payloads captured in `lib/fixtures`, so previews stay demoable.
 * In production a failure is reported honestly as `source: 'error'` — a paying
 * user must never be shown a stale 8-tender snapshot pretending to be the
 * catalogue. `source` tells the UI which happened; `DataSourceNotice` renders
 * fixture and error states, and is silent on the live happy path.
 *
 * The API is public: there is no key to configure, so nothing here is gated on
 * `TENDERBASE_API_KEY` any more.
 */

export type DataSource = 'live' | 'fixture' | 'error';

export interface TenderPage {
  results: TenderWithUserState[];
  total: number;
  page: number;
  totalPages: number;
  source: DataSource;
  /** Present when we served the captured fixtures instead of the live API. */
  notice?: string;
  /**
   * Where a `live` page came from: our server (default) or the browser-direct
   * fallback in `lib/tender-direct.ts`. Shown in the UI, never assumed.
   */
  via?: 'server' | 'browser';
}

// ---------------------------------------------------------------------------
// Fixture fallback (development/test only) + production error envelope
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

/** User-facing copy for the production error state. Never mentions fixtures. */
function errorNotice(e?: unknown): string {
  if (e instanceof TenderApiError) {
    if (e.code === 'UPSTREAM_TIMEOUT')
      return 'The tender service is still waking up. Please try again in a moment.';
    if (e.code === 'NETWORK_ERROR')
      return 'Could not reach the tender service. Please try again shortly.';
    if (e.code === 'INVALID_QUERY')
      return 'The tender service rejected our query. Please refresh and try again.';
    return `The tender service returned an error (${e.code}). Please try again.`;
  }
  return 'The tender service is unavailable right now. Please try again shortly.';
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

/**
 * Production failure envelope: empty page + `source: 'error'`. The UI renders a
 * real error state instead of silently showing fixtures or an empty "no
 * results" screen.
 */
function errorPage(opts: ListOptions = {}, e?: unknown): TenderPage {
  return {
    results: [],
    total: 0,
    page: Math.max(1, opts.page ?? 1),
    totalPages: 1,
    source: 'error',
    notice: errorNotice(e),
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
  return withFallback<TenderPage>(
    async () => {
      const res = await tenderApiServer.list(query);
      return {
        results: (res.results ?? []).map((t) => adaptTenderWithState(t)),
        total: res.total ?? res.results?.length ?? 0,
        page: res.page ?? query.page ?? 1,
        totalPages: res.totalPages ?? 1,
        source: 'live',
        via: 'server',
      };
    },
    (e) => (FIXTURES_ALLOWED ? fixturePage(opts, fixtureNotice(e)) : errorPage(opts, e)),
    'list',
  );
}

export type DetailOutcome =
  | {
      tender: ReturnType<typeof adaptDetail>;
      source: 'live' | 'fixture';
      notice?: string;
      via?: 'server' | 'browser';
    }
  | { source: 'error'; notice: string }
  | null;

/**
 * `GET /tenders/:id`.
 *
 * 404 -> null (the page calls `notFound()`). Upstream unreachable -> the
 * captured fixture if we hold one, otherwise `{ source: 'error' }` — never a
 * bare `null`, because in a dev/preview build a missing fixture means nothing
 * about whether the tender exists. The detail page turns that outcome into a
 * browser-direct attempt (`lib/tender-direct.ts`) before it shows an outage.
 */
export async function getTender(id: string): Promise<DetailOutcome> {
  const fromFixtures = (): DetailOutcome => {
    const t = FIXTURE_TENDERS.results.find((x) => x.id === id);
    return t
      ? {
          tender: adaptDetail({ ...t, amendments: [] }),
          source: 'fixture',
          notice: fixtureNotice(),
        }
      : null;
  };

  if (FIXTURES_ONLY) return fromFixtures();

  try {
    const res = await tenderApiServer.getById(id);
    if (!res?.tender) {
      const local = FIXTURES_ALLOWED ? fromFixtures() : null;
      return (
        local ?? {
          source: 'error',
          notice: FIXTURES_ALLOWED ? fixtureNotice() : errorNotice(),
        }
      );
    }
    return { tender: adaptDetail(res.tender), source: 'live', via: 'server' };
  } catch (e) {
    if (e instanceof TenderApiError && e.status === 404) return null;
    console.error('[tenders] detail failed:', e instanceof Error ? e.message : e);
    const local = FIXTURES_ALLOWED ? fromFixtures() : null;
    if (local) return local;
    return { source: 'error', notice: FIXTURES_ALLOWED ? fixtureNotice(e) : errorNotice(e) };
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
  via?: 'server' | 'browser';
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
    (e) => (FIXTURES_ALLOWED ? fixtureFacets(fixtureNotice(e)) : {
      categories: [],
      provinces: [],
      source: 'error' as DataSource,
      notice: errorNotice(e),
    }),
    'facets',
  );
}

export interface DatasetStats extends ApiStats {
  source: DataSource;
  notice?: string;
  via?: 'server' | 'browser';
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
    (e) =>
      FIXTURES_ALLOWED
        ? { ...FIXTURE_STATS.stats, source: 'fixture' as DataSource, notice: fixtureNotice(e) }
        : {
            totalTenders: 0,
            activeTenders: 0,
            completedTenders: 0,
            cancelledTenders: 0,
            expiringSoonTenders: 0,
            categoriesCount: 0,
            provincesCount: 0,
            latestPublishedDate: null,
            uptimeSeconds: 0,
            source: 'error' as DataSource,
            notice: errorNotice(e),
          },
    'stats',
  );
}

/** Where the data came from — surfaced in the UI footer and error notices. */
export const UPSTREAM_BASE_URL = API_BASE_URL;
