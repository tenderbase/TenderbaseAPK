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
import type { ApiCategoriesResponse, ApiProvincesResponse, ApiStats, ApiTender } from '@/types/api';
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
    const detail = e.status ? ` ${e.status}` : '';
    return `The tender service returned an error (${e.code}${detail}). Please try again.`;
  }
  return 'The tender service is unavailable right now. Please try again shortly.';
}

/**
 * Does this list answer claim the whole catalogue is empty?
 *
 * `{"results":[], "total":0, source:"live"}` is the signature of a mid-wake
 * upstream (it answers 200 before its dataset is loaded) or of a Next Data
 * Cache entry captured during one of those windows — never of the real
 * dataset, which holds ~411 tenders. Believing it page-side is what rendered
 * "0 tenders found" on a healthy catalogue, and because the answer claims
 * `live`, the browser-direct fallback (which only runs on non-live sources)
 * never corrected it. Anything answering empty is re-asked with the cache
 * bypassed before it is believed; a genuinely empty dataset answers empty
 * twice and is then shown as it is.
 */
export function isSuspiciouslyEmpty(res: { results?: unknown[]; total?: number }): boolean {
  return (res.results?.length ?? 0) === 0 && (res.total ?? 0) === 0;
}

/**
 * Does this `/stats` answer prove the upstream holds the live dataset?
 *
 * Pure — `getTender` fetches, this judges. A 404 for a tender id is only
 * believed when this says yes: against a wrong or drained service (a stale
 * `TENDERBASE_API_URL` from before the ingestion migration, a mid-wake
 * upstream) every id 404s, and trusting that renders a false "Page not found"
 * for tenders that exist. Anything else — zeros, missing fields, garbage —
 * sends the detail down the error path, where the browser-direct fallback asks
 * the configured public host instead.
 */
export function statsShowLiveDataset(res: unknown): boolean {
  if (!res || typeof res !== 'object') return false;
  const stats = (res as { stats?: unknown }).stats;
  if (!stats || typeof stats !== 'object') return false;
  const total = (stats as { totalTenders?: unknown }).totalTenders;
  return typeof total === 'number' && Number.isFinite(total) && total > 0;
}

/**
 * Asks `/stats` (ISR-cached, usually instant) whether the upstream is serving
 * the live dataset. Never throws: an unreachable or misshapen stats answer is
 * itself the "do not trust this host" signal.
 */
async function upstreamProvesLiveDataset(): Promise<boolean> {
  try {
    return statsShowLiveDataset(await tenderApiServer.stats());
  } catch {
    return false;
  }
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
      let res = await tenderApiServer.list(query);
      // An empty first answer gets one cache-bypassing re-ask (see
      // `isSuspiciouslyEmpty`) — this is the guard that keeps a mid-wake
      // upstream or a poisoned Data Cache entry from rendering as
      // "0 tenders found" with a live badge.
      if (isSuspiciouslyEmpty(res)) {
        const fresh = await tenderApiServer.list(query, { noStore: true });
        if (!isSuspiciouslyEmpty(fresh)) res = fresh;
      }
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
 * 404 -> null (the page calls `notFound()`), but only when `/stats` proves the
 * upstream holds the live dataset — a 404 from a wrong or drained service is
 * distrusted into `{ source: 'error' }` instead of a false 404 page.
 * Upstream unreachable -> the captured fixture if we hold one, otherwise
 * `{ source: 'error' }` — never a bare `null`, because in a dev/preview build
 * a missing fixture means nothing about whether the tender exists. The detail
 * page turns that outcome into a browser-direct attempt (`lib/tender-direct.ts`)
 * before it shows an outage.
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
    if (e instanceof TenderApiError && e.status === 404) {
      // A 404 is "this tender is gone" ONLY when the upstream proves it holds
      // the live dataset. The September 2026 incident: a stale
      // TENDERBASE_API_URL pointed at the retired service, whose numeric-id
      // world 404s every current id — the old code trusted that and 404'd the
      // page, never giving the browser-direct fallback its turn. When the
      // upstream cannot prove itself, answer 'error' so DirectTender resolves
      // the id against the public host instead.
      if (await upstreamProvesLiveDataset()) return null;
      console.error(
        `[tenders] detail 404 for ${id} distrusted — upstream is not serving the live dataset`,
      );
      const local = FIXTURES_ALLOWED ? fromFixtures() : null;
      if (local) return local;
      return { source: 'error', notice: FIXTURES_ALLOWED ? fixtureNotice(e) : errorNotice(e) };
    }
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
      // Two empty vocabularies is the same "not really answered" signature as
      // an empty catalogue — re-ask with the cache bypassed before rendering
      // filter chips that say the dataset has no categories at all.
      const facetCount = (res: ApiCategoriesResponse | ApiProvincesResponse): number =>
        ('categories' in res ? res.categories?.length : res.provinces?.length) ?? 0;
      let freshCats = cats;
      let freshProvs = provs;
      if (facetCount(cats) === 0 && facetCount(provs) === 0) {
        const [retryCats, retryProvs] = await Promise.all([
          tenderApiServer.categories({ noStore: true }),
          tenderApiServer.provinces({ noStore: true }),
        ]);
        if (facetCount(retryCats) > 0 || facetCount(retryProvs) > 0) {
          freshCats = retryCats;
          freshProvs = retryProvs;
        }
      }
      return {
        categories: adaptCategories(freshCats),
        provinces: adaptProvinces(freshProvs),
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
      let stats = (await tenderApiServer.stats()).stats;
      if (!stats || typeof stats.totalTenders !== 'number') {
        // A 200 without a stats object is the mid-wake upstream again — one
        // cache-bypassing re-ask, then report honestly if it is still junk.
        stats = (await tenderApiServer.stats({ noStore: true })).stats;
      }
      if (!stats || typeof stats.totalTenders !== 'number') {
        throw new TenderApiError(502, 'UPSTREAM_ERROR', 'The stats payload was not the expected shape.');
      }
      if (stats.totalTenders === 0) {
        // Zero pipeline totals on a live badge is the lying-empty signature
        // (the real dataset holds ~411 tenders) — same re-ask as listTenders.
        const fresh = (await tenderApiServer.stats({ noStore: true })).stats;
        if (fresh && typeof fresh.totalTenders === 'number' && fresh.totalTenders !== 0) stats = fresh;
      }
      return { ...stats, source: 'live' as DataSource };
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
