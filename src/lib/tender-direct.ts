/**
 * Browser-direct client for the TenderBase ingestion API.
 *
 * Why this exists: the ingestion service is public and keyless, so it can be
 * read straight from the browser. Our own server is normally the only thing
 * that talks to it (see `lib/tender-api.server.ts`) because that gives us ISR
 * caching and one contract for the app. But when the *server's* network cannot
 * reach the upstream — sandboxed/preview hosts with egress allowlists,
 * corporate networks, a Render cold start that outlasts the server timeout —
 * the end user's browser usually can. In that situation the app would
 * otherwise fall back to the captured fixtures (dev) or an outage screen
 * (production) even though live data was one fetch away.
 *
 * So this is a FALLBACK, never the primary path:
 *   - it only runs when the server result is not `live` (`shouldUseDirectFallback`),
 *   - it returns the same app-level shapes as `lib/tenders.ts` (`source: 'live'`
 *     plus `via: 'browser'` so provenance stays visible in the UI),
 *   - a failure is swallowed by the caller, which keeps showing the server's
 *     fixture/outage state and notice.
 *
 * Security: nothing secret is involved — the upstream needs no API key and
 * sends `Access-Control-Allow-Origin: *`. No credentials, no cookies, and the
 * URL is the same public endpoint already documented in `.env.example`.
 */

import { adaptCategories, adaptDetail, adaptProvinces, adaptTenderWithState } from '@/lib/adapt';
import { tenderListPath, type ListOptions } from '@/lib/tender-query';
import type {
  ApiCategoriesResponse,
  ApiProvincesResponse,
  ApiStatsResponse,
  ApiTenderDetailResponse,
  ApiTenderListResponse,
} from '@/types/api';
import type { DataSource, DatasetStats, Facets, TenderPage } from '@/lib/tenders';

/** Same default as the server client — one upstream, two ways to reach it. */
const DEFAULT_DIRECT_API_URL = 'https://tenderbase-api-rqrh.onrender.com';

/**
 * Where the browser sends its retry. Defaults to the same upstream the server
 * uses; `NEXT_PUBLIC_TENDERBASE_API_URL` points it elsewhere. Read at build
 * time — Next inlines `NEXT_PUBLIC_*`.
 */
export const DIRECT_API_URL = (
  process.env.NEXT_PUBLIC_TENDERBASE_API_URL?.trim() || DEFAULT_DIRECT_API_URL
).replace(/\/+$/, '');

/**
 * `NEXT_PUBLIC_TENDERBASE_DIRECT_FALLBACK=false` turns the whole path off — for
 * deployments that must not expose the upstream to the browser, or that are
 * certain their server can always reach it.
 */
export const DIRECT_FALLBACK_ENABLED = process.env.NEXT_PUBLIC_TENDERBASE_DIRECT_FALLBACK !== 'false';

/**
 * Deliberately shorter than the server's 20s: the server attempt has already
 * burned its own timeout by the time this runs, and a two-timeout wait would
 * feel broken. Still long enough for a cold Render instance to answer.
 */
export const DIRECT_TIMEOUT_MS = 15_000;

export type DirectErrorCode = 'NETWORK_ERROR' | 'UPSTREAM_TIMEOUT' | 'HTTP_ERROR';

export class DirectApiError extends Error {
  code: DirectErrorCode;
  status?: number;

  constructor(code: DirectErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'DirectApiError';
    this.code = code;
    this.status = status;
  }
}

/** The fallback applies exactly when the server could not serve live data. */
export function shouldUseDirectFallback(source: DataSource): boolean {
  return DIRECT_FALLBACK_ENABLED && source !== 'live';
}

/**
 * One fetch helper: timeout, JSON parse, error mapping.
 *
 * The base URL is a parameter so tests can point it at a real local HTTP
 * server and exercise the actual timeout and 404 paths, rather than trusting a
 * hand-rolled `Response` stub. Production callers go through `directFetch`.
 */
export async function directFetchFrom<T>(
  baseUrl: string,
  path: string,
  timeoutMs = DIRECT_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      headers: { Accept: 'application/json' },
      // No credentials: the API is anonymous and CORS is `*`, so a cookie-less
      // request is both sufficient and the least revealing.
      credentials: 'omit',
      signal: controller.signal,
    });
  } catch (e) {
    const aborted = e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError');
    throw new DirectApiError(
      aborted ? 'UPSTREAM_TIMEOUT' : 'NETWORK_ERROR',
      aborted ? 'The tender service did not respond in time.' : 'Could not reach the tender service.',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new DirectApiError('HTTP_ERROR', `Tender service returned ${res.status}.`, res.status);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new DirectApiError('HTTP_ERROR', 'The tender service returned a malformed response.', res.status);
  }
}

/** Transport bound to the configured upstream — what every call below uses. */
function directFetch<T>(path: string, timeoutMs = DIRECT_TIMEOUT_MS): Promise<T> {
  return directFetchFrom<T>(DIRECT_API_URL, path, timeoutMs);
}

/** `GET /tenders` — same query the server would have sent. */
export async function directTenderPage(opts: ListOptions = {}): Promise<TenderPage> {
  const path = tenderListPath(opts);
  const res = await directFetch<ApiTenderListResponse>(path);
  return {
    results: (res.results ?? []).map((t) => adaptTenderWithState(t)),
    total: res.total ?? res.results?.length ?? 0,
    page: res.page ?? opts.page ?? 1,
    totalPages: res.totalPages ?? 1,
    source: 'live',
    via: 'browser',
  };
}

export type DirectDetail = {
  tender: ReturnType<typeof adaptDetail>;
  source: 'live';
  via: 'browser';
};

/**
 * `GET /tenders/:id` — `null` only for a real 404, so the caller can tell
 * "this tender is gone" apart from "we could not ask".
 */
export async function directTenderDetail(id: string): Promise<DirectDetail | null> {
  try {
    const res = await directFetch<ApiTenderDetailResponse>(`/tenders/${encodeURIComponent(id)}`);
    if (!res?.tender) return null;
    return { tender: adaptDetail(res.tender), source: 'live', via: 'browser' };
  } catch (e) {
    if (e instanceof DirectApiError && e.status === 404) return null;
    throw e;
  }
}

/** `GET /categories` + `GET /provinces`, the two vocabularies the filter UIs use. */
export async function directFacets(): Promise<Facets> {
  const [cats, provs] = await Promise.all([
    directFetch<ApiCategoriesResponse>('/categories'),
    directFetch<ApiProvincesResponse>('/provinces'),
  ]);
  return {
    categories: adaptCategories(cats),
    provinces: adaptProvinces(provs),
    source: 'live',
    via: 'browser',
  };
}

/** `GET /stats` — pipeline totals for the dashboard counters. */
export async function directStats(): Promise<DatasetStats> {
  const res = await directFetch<ApiStatsResponse>('/stats');
  return { ...res.stats, source: 'live', via: 'browser' };
}
