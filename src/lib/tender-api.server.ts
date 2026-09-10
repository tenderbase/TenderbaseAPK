import 'server-only';

import { buildQuery, MAX_LIMIT } from '@/lib/tender-query';
import type {
  ApiCategoriesResponse,
  ApiHttpError,
  ApiProvincesResponse,
  ApiStatsResponse,
  ApiTenderDetailResponse,
  ApiTenderListResponse,
  ApiTenderQuery,
  ApiValidationError,
} from '@/types/api';

/**
 * Server-only client for the TenderBase Ingestion API.
 *
 * Base URL: https://tenderbase-api-rqrh.onrender.com
 * Replaces the previous Railway-hosted `/api/v1` service, which is retired —
 * nothing in this repo should reference it any more.
 *
 * `server-only` makes importing this from a client component a BUILD error.
 * The new API needs no key, so the guarantee it used to provide (keeping
 * `TENDERBASE_API_KEY` off the device) matters less than it did; it still
 * matters for `TENDERBASE_ADMIN_SECRET` and for keeping upstream churn behind
 * one module. It also keeps the Capacitor APK free of server concerns.
 */

const DEFAULT_BASE_URL = 'https://tenderbase-api-rqrh.onrender.com';

export const API_BASE_URL = (
  process.env.TENDERBASE_API_URL ?? DEFAULT_BASE_URL
).replace(/\/$/, '');

/**
 * The API is public — every endpoint was verified unauthenticated on
 * 2026-09-08. A key is still sent when one is configured, so that turning on
 * auth upstream later is an env change rather than a code change.
 */
const API_KEY = process.env.TENDERBASE_API_KEY ?? '';

/**
 * Render's free tier cold-starts. 20s is enough to ride a wake-up without
 * making a failed request feel like a hang; ECONNRESET (the common failure in
 * restricted networks) returns immediately anyway.
 */
const TIMEOUT_MS = Number(process.env.TENDERBASE_API_TIMEOUT_MS ?? 20_000);

/**
 * Captured fixtures may only ever appear in non-production builds. A deployed
 * Render instance must never serve the 8 captured tenders to real users, even
 * if someone sets TENDERBASE_FIXTURES_ONLY on the host or the upstream is down.
 */
export const FIXTURES_ALLOWED = process.env.NODE_ENV !== 'production';

/**
 * Escape hatch for CI, tests and sandboxes with no egress to the API: skip the
 * network entirely and serve the captured fixtures in `lib/fixtures`. The UI
 * still reports this honestly through `DataSourceNotice`. Hard-gated on
 * `FIXTURES_ALLOWED`, so production can never read fixtures.
 */
export const FIXTURES_ONLY =
  FIXTURES_ALLOWED &&
  (process.env.TENDERBASE_FIXTURES_ONLY === 'true' || process.env.NODE_ENV === 'test');

/**
 * `MAX_LIMIT` ("Upstream does not publish a `limit` ceiling…") is defined in
 * `lib/tender-query.ts` so the server path and the browser-direct fallback clamp
 * identically; re-exported here for existing importers.
 */
export { MAX_LIMIT };

export class TenderApiError extends Error {
  readonly status: number;
  readonly code: string;
  /** Zod field problems from a 400, e.g. `["page: Expected number…"]`. */
  readonly issues: string[];

  /**
   * Written with explicit field declarations rather than TypeScript parameter
   * properties (`constructor(readonly status: number, …)`). Parameter
   * properties are unsupported by Node's strip-only TypeScript loader, which
   * the test runner uses — and they are the only construct in the repo that
   * blocks importing this module from plain Node.
   */
  constructor(status: number, code: string, message: string, issues: string[] = []) {
    super(message);
    this.name = 'TenderApiError';
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

/**
 * Envelope check: a 200 from the WRONG service is still a failure.
 *
 * The September 2026 production incident: the web deployment's
 * `TENDERBASE_API_URL` still pointed at the retired API, which answers
 * `GET /tenders` with 200 and a `{ data: [...] }` body. The old code read
 * `.results` off it, got `undefined`, and served a confident-looking
 * `{"results":[],"total":0,"source":"live"}` — a lying-empty catalogue — while
 * every detail id 404'd. Any 200 whose envelope is not the documented shape is
 * an upstream error, so the error fallbacks (and the browser-direct retry,
 * which uses its own URL) engage instead of believing it.
 *
 * Deliberately NOT retried: a parseable wrong shape is deterministic, not a
 * transient cold-start — retrying would only delay the fallback.
 */
function unexpectedShape(label: string, field: string): TenderApiError {
  return new TenderApiError(
    502,
    'UPSTREAM_ERROR',
    `The ${label} payload was not the expected shape (${field} missing).`,
  );
}

interface FetchOpts {
  /** ISR window in seconds. Tender data changes on a sync cadence, not per request. */
  revalidate?: number;
  signal?: AbortSignal;
  /**
   * Bypass Next's Data Cache entirely (`cache: 'no-store'`). Used to re-ask
   * the upstream when a cached or mid-wake answer looks like a lie — an empty
   * catalogue must be confirmed against the live service before it is shown.
   */
  noStore?: boolean;
}

/**
 * Upstream uses two different error bodies and neither is the old
 * `{ error: { code, message, request_id } }` envelope:
 *   - 400 validation: `{ error: "Invalid query", issues: string[] }`
 *   - Fastify default: `{ message, error, statusCode }` (e.g. 404 route not found)
 */
function describeError(status: number, body: unknown): TenderApiError {
  if (body && typeof body === 'object') {
    const validation = body as Partial<ApiValidationError>;
    if (Array.isArray(validation.issues)) {
      return new TenderApiError(
        status,
        'INVALID_QUERY',
        `Tender API rejected the query: ${validation.issues.join('; ')}`,
        validation.issues,
      );
    }
    const http = body as Partial<ApiHttpError>;
    if (typeof http.message === 'string') {
      return new TenderApiError(status, String(http.error ?? 'UPSTREAM_ERROR'), http.message);
    }
  }
  return new TenderApiError(status, 'UPSTREAM_ERROR', `Tender API returned ${status}`);
}

// ---------------------------------------------------------------------------
// One fetch, with one bounded retry for *fast* failures
// ---------------------------------------------------------------------------

/**
 * Why a single retry exists: the upstream also lives on Render's free tier,
 * and its cold-start signature is an immediate 502/503 from Render's router,
 * a reset socket, or (worst) a 200 whose body is truncated HTML — all of which
 * are usually gone a second later. A timeout is NOT retried: it has already
 * burned the whole latency budget, and the page must hand over to the
 * browser-direct fallback rather than hang for two timeouts.
 */
const RETRY_DELAY_MS = 1_200;
const MAX_ATTEMPTS = 2;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type AttemptOutcome<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'fail'; error: TenderApiError }
  | { kind: 'retry'; why: string };

async function attempt<T>(
  baseUrl: string,
  apiKey: string,
  timeoutMs: number,
  path: string,
  opts: FetchOpts,
): Promise<AttemptOutcome<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (apiKey) headers['X-API-Key'] = apiKey;

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      headers,
      // The retry never touches the Data Cache; only a first attempt earns ISR.
      ...(opts.noStore
        ? { cache: 'no-store' as const }
        : { next: { revalidate: opts.revalidate ?? 300 } }),
      signal: opts.signal ?? AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const aborted = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    if (aborted) {
      return {
        kind: 'fail',
        error: new TenderApiError(
          504,
          'UPSTREAM_TIMEOUT',
          'The tender service did not respond in time (it may be cold-starting).',
        ),
      };
    }
    return { kind: 'retry', why: 'connection failed' };
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined; // non-JSON error body
    }
    const error = describeError(res.status, body);
    // 5xx and 429 are "not really answered" (cold start, rate limit): worth one
    // more try. A 4xx is an answer — validation, missing route — retrying it
    // would just double the latency before the same failure.
    if (res.status >= 500 || res.status === 429) return { kind: 'retry', why: `HTTP ${res.status}` };
    return { kind: 'fail', error };
  }

  try {
    return { kind: 'ok', value: (await res.json()) as T };
  } catch {
    // A 200 that is not JSON is the mid-wake upstream serving an HTML error
    // page with a success status — treated as a transient failure.
    return { kind: 'retry', why: 'malformed response body' };
  }
}

async function apiFetch<T>(
  baseUrl: string,
  apiKey: string,
  timeoutMs: number,
  retryDelayMs: number,
  path: string,
  opts: FetchOpts = {},
): Promise<T> {
  let lastWhy = '';
  for (let attemptNo = 1; attemptNo <= MAX_ATTEMPTS; attemptNo++) {
    if (attemptNo > 1) await delay(retryDelayMs);
    const outcome = await attempt<T>(baseUrl, apiKey, timeoutMs, path, {
      ...opts,
      noStore: opts.noStore || attemptNo > 1,
    });
    if (outcome.kind === 'ok') return outcome.value;
    if (outcome.kind === 'fail') throw outcome.error;
    lastWhy = outcome.why;
  }
  // Retried and still not answered: keep the network-failure vocabulary the
  // fallback copy keys off (NETWORK_ERROR vs UPSTREAM_ERROR).
  if (lastWhy === 'connection failed') {
    throw new TenderApiError(504, 'NETWORK_ERROR', 'Could not reach the tender service.');
  }
  throw new TenderApiError(502, 'UPSTREAM_ERROR', `The tender service kept failing (${lastWhy}).`);
}

export interface TenderApiOptions {
  /** Per-attempt timeout. Defaults to `TENDERBASE_API_TIMEOUT_MS` / 20s. */
  timeoutMs?: number;
  /** Sent as `X-API-Key` when non-empty. Defaults to `TENDERBASE_API_KEY`. */
  apiKey?: string;
  /** Backoff between attempts; tests shrink it so retries stay fast. */
  retryDelayMs?: number;
}

/**
 * Builds a client bound to one base URL. `tenderApiServer` is the production
 * binding; tests spin up loopback servers and bind their own, which is how the
 * retry and timeout behaviour is exercised against real sockets.
 */
export function tenderApiServerFrom(rawBaseUrl: string, options: TenderApiOptions = {}) {
  const baseUrl = rawBaseUrl.replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? (Number.isFinite(TIMEOUT_MS) && TIMEOUT_MS > 0 ? TIMEOUT_MS : 20_000);
  const apiKey = options.apiKey ?? API_KEY;
  const retryDelayMs = options.retryDelayMs ?? RETRY_DELAY_MS;

  const fetchJson = <T>(path: string, opts?: FetchOpts) =>
    apiFetch<T>(baseUrl, apiKey, timeoutMs, retryDelayMs, path, opts);

  return {
    /**
     * `GET /tenders` — the only list endpoint. There is no `/tenders/search`,
     * `/tenders/latest` or `/tenders/closing-soon` on this service; full-text
     * search is the `q` param and "closing soon" is `closingAfter` + `sort=closing`.
     */
    async list(query: ApiTenderQuery = {}, opts?: FetchOpts) {
      const limit = Math.min(query.limit ?? 20, MAX_LIMIT);
      const res = await fetchJson<ApiTenderListResponse>(
        `/tenders${buildQuery({ ...query, limit })}`,
        opts,
      );
      if (!res || !Array.isArray(res.results)) throw unexpectedShape('tender list', 'results[]');
      return res;
    },

    /**
     * `GET /tenders/:id` — note the `{ tender }` envelope, not a bare object.
     * A 200 without it (the retired service answers numeric ids this way, and
     * 404s everything else) is a failure, never an empty detail.
     */
    async getById(id: string, opts?: FetchOpts) {
      const res = await fetchJson<ApiTenderDetailResponse>(
        `/tenders/${encodeURIComponent(id)}`,
        opts,
      );
      if (!res || typeof res.tender !== 'object' || res.tender === null) {
        throw unexpectedShape('tender detail', 'tender{}');
      }
      return res;
    },

    /** `GET /categories` — `{ category, count }[]`, 62 entries, count-descending. */
    async categories(opts?: FetchOpts) {
      const res = await fetchJson<ApiCategoriesResponse>(
        '/categories',
        { revalidate: 86_400, ...opts },
      );
      if (!res || !Array.isArray(res.categories)) throw unexpectedShape('categories', 'categories[]');
      return res;
    },

    /** `GET /provinces` — `{ province, count }[]`, 10 entries. */
    async provinces(opts?: FetchOpts) {
      const res = await fetchJson<ApiProvincesResponse>(
        '/provinces',
        { revalidate: 86_400, ...opts },
      );
      if (!res || !Array.isArray(res.provinces)) throw unexpectedShape('provinces', 'provinces[]');
      return res;
    },

    /** `GET /stats` — pipeline health and dataset counts. */
    stats(opts?: FetchOpts) {
      return fetchJson<ApiStatsResponse>('/stats', { revalidate: 300, ...opts });
    },

    /** `GET /health` — liveness probe. Shape is not documented, so it is opaque. */
    health(opts?: FetchOpts) {
      return fetchJson<Record<string, unknown>>('/health', { revalidate: 0, ...opts });
    },
  };
}

/** The production client, bound to `API_BASE_URL`. */
export const tenderApiServer = tenderApiServerFrom(API_BASE_URL);
