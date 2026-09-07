import 'server-only';

import type {
  ApiFacets,
  ApiPaginated,
  ApiTaxonomyItem,
  ApiTender,
  ApiTenderDetail,
  ApiTenderQuery,
} from '@/types/api';

/**
 * Server-only client for the South African Tender API.
 *
 * `server-only` makes importing this from a client component a BUILD error,
 * which is the real guarantee that TENDERBASE_API_KEY never reaches a device.
 * That matters most for the Capacitor build, where the JS bundle ships inside
 * the APK and is trivially unzipped.
 */

const BASE_URL = (
  process.env.TENDERBASE_API_URL ??
  'https://tenderbased-production.up.railway.app/api/v1'
).replace(/\/$/, '');

const API_KEY = process.env.TENDERBASE_API_KEY ?? '';

/** Upstream caps `limit` at 100 — anything higher is a 422. */
export const MAX_LIMIT = 100;

export const isApiConfigured = (): boolean => API_KEY.length > 0;

/**
 * `/tenders/latest` and `/tenders/closing-soon` return a BARE ARRAY, while
 * `/tenders` and `/tenders/search` return `{ data, pagination }`. Callers read
 * `.data` and `.total`, so normalise the array form into the envelope shape.
 * When upstream gives no count, the item count is the only honest total.
 */
function asPaginated<T>(raw: ApiPaginated<T> | T[]): ApiPaginated<T> {
  if (Array.isArray(raw)) {
    return {
      data: raw,
      pagination: {
        page: 1,
        limit: raw.length,
        total: raw.length,
        total_pages: 1,
      },
    };
  }
  return raw;
}

export class TenderApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = 'TenderApiError';
  }
}

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

async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  if (!isApiConfigured()) {
    throw new TenderApiError(500, 'NOT_CONFIGURED', 'TENDERBASE_API_KEY is not set');
  }

  // The upstream is on a free tier that cold-starts; first call can take ~25s.
  const timeout = AbortSignal.timeout(45_000);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'X-API-Key': API_KEY, Accept: 'application/json' },
      next: { revalidate: opts.revalidate ?? 300 },
      signal: opts.signal ?? timeout,
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'TimeoutError';
    throw new TenderApiError(
      504,
      aborted ? 'UPSTREAM_TIMEOUT' : 'NETWORK_ERROR',
      aborted
        ? 'The tender service did not respond in time (it may be waking up).'
        : 'Could not reach the tender service.',
    );
  }

  if (!res.ok) {
    let code = 'UPSTREAM_ERROR';
    let message = `Tender API returned ${res.status}`;
    let requestId: string | undefined;
    try {
      const body = (await res.json()) as { error?: { code: string; message: string; request_id: string } };
      if (body.error) {
        code = body.error.code;
        message = body.error.message;
        requestId = body.error.request_id;
      }
    } catch {
      /* non-JSON error body */
    }
    throw new TenderApiError(res.status, code, message, requestId);
  }

  return res.json() as Promise<T>;
}

export const tenderApiServer = {
  list(query: ApiTenderQuery = {}, opts?: FetchOpts) {
    const limit = Math.min(query.limit ?? 20, MAX_LIMIT);
    return apiFetch<ApiPaginated<ApiTender>>(
      `/tenders${buildQuery({ ...query, limit })}`,
      opts,
    );
  },

  getById(id: string | number, opts?: FetchOpts) {
    return apiFetch<ApiTenderDetail>(`/tenders/${encodeURIComponent(String(id))}`, opts);
  },

  async latest(limit = 20, opts?: FetchOpts) {
    const raw = await apiFetch<ApiPaginated<ApiTender> | ApiTender[]>(
      `/tenders/latest${buildQuery({ limit: Math.min(limit, MAX_LIMIT) })}`,
      opts,
    );
    return asPaginated(raw);
  },

  /** `hours` is the upstream window parameter (e.g. 168 for one week). */
  async closingSoon(hours = 168, limit = 20, opts?: FetchOpts) {
    const raw = await apiFetch<ApiPaginated<ApiTender> | ApiTender[]>(
      `/tenders/closing-soon${buildQuery({ hours, limit: Math.min(limit, MAX_LIMIT) })}`,
      opts,
    );
    return asPaginated(raw);
  },

  search(q: string, extra: Partial<ApiTenderQuery> = {}, opts?: FetchOpts) {
    return apiFetch<ApiPaginated<ApiTender>>(
      `/tenders/search${buildQuery({ q, ...extra, limit: Math.min(extra.limit ?? 20, MAX_LIMIT) })}`,
      opts,
    );
  },

  facets(opts?: FetchOpts) {
    return apiFetch<ApiFacets>('/tenders/facets', { revalidate: 3600, ...opts });
  },

  categories(opts?: FetchOpts) {
    return apiFetch<ApiTaxonomyItem[]>('/categories', { revalidate: 86_400, ...opts });
  },

  provinces(opts?: FetchOpts) {
    return apiFetch<ApiTaxonomyItem[]>('/provinces', { revalidate: 86_400, ...opts });
  },

  health(opts?: FetchOpts) {
    return apiFetch<{ status: string; version: string; uptime_seconds: number }>(
      '/health',
      { revalidate: 0, ...opts },
    );
  },
};
