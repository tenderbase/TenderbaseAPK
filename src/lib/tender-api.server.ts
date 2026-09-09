import 'server-only';

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
 * Escape hatch for CI, tests and sandboxes with no egress to the API: skip the
 * network entirely and serve the captured fixtures in `lib/fixtures`. The UI
 * still reports this honestly through `DataSourceNotice`.
 */
export const FIXTURES_ONLY =
  process.env.TENDERBASE_FIXTURES_ONLY === 'true' || process.env.NODE_ENV === 'test';

/**
 * Upstream does not publish a `limit` ceiling and `/docs/json` has empty
 * `paths`, so the cap cannot be read from a spec. 100 is a safe bound: the
 * largest page any screen needs is 20, and a huge page on a cold free-tier
 * instance is how you get a 504.
 */
export const MAX_LIMIT = 100;

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

/** Drops undefined/null/'' so optional filters never reach the wire as "undefined". */
function buildQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

interface FetchOpts {
  /** ISR window in seconds. Tender data changes on a sync cadence, not per request. */
  revalidate?: number;
  signal?: AbortSignal;
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

async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (API_KEY) headers['X-API-Key'] = API_KEY;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers,
      next: { revalidate: opts.revalidate ?? 300 },
      signal: opts.signal ?? AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const aborted = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    throw new TenderApiError(
      504,
      aborted ? 'UPSTREAM_TIMEOUT' : 'NETWORK_ERROR',
      aborted
        ? 'The tender service did not respond in time (it may be cold-starting).'
        : 'Could not reach the tender service.',
    );
  }

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = undefined; // non-JSON error body
    }
    throw describeError(res.status, body);
  }

  return res.json() as Promise<T>;
}

export const tenderApiServer = {
  /**
   * `GET /tenders` — the only list endpoint. There is no `/tenders/search`,
   * `/tenders/latest` or `/tenders/closing-soon` on this service; full-text
   * search is the `q` param and "closing soon" is `closingAfter` + `sort=closing`.
   */
  list(query: ApiTenderQuery = {}, opts?: FetchOpts) {
    const limit = Math.min(query.limit ?? 20, MAX_LIMIT);
    return apiFetch<ApiTenderListResponse>(`/tenders${buildQuery({ ...query, limit })}`, opts);
  },

  /** `GET /tenders/:id` — note the `{ tender }` envelope, not a bare object. */
  getById(id: string, opts?: FetchOpts) {
    return apiFetch<ApiTenderDetailResponse>(`/tenders/${encodeURIComponent(id)}`, opts);
  },

  /** `GET /categories` — `{ category, count }[]`, 62 entries, count-descending. */
  categories(opts?: FetchOpts) {
    return apiFetch<ApiCategoriesResponse>('/categories', { revalidate: 86_400, ...opts });
  },

  /** `GET /provinces` — `{ province, count }[]`, 10 entries. */
  provinces(opts?: FetchOpts) {
    return apiFetch<ApiProvincesResponse>('/provinces', { revalidate: 86_400, ...opts });
  },

  /** `GET /stats` — pipeline health and dataset counts. */
  stats(opts?: FetchOpts) {
    return apiFetch<ApiStatsResponse>('/stats', { revalidate: 300, ...opts });
  },

  /** `GET /health` — liveness probe. Shape is not documented, so it is opaque. */
  health(opts?: FetchOpts) {
    return apiFetch<Record<string, unknown>>('/health', { revalidate: 0, ...opts });
  },
};
