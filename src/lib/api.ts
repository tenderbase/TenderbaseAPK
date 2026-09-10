import {
  directFacets,
  directStats,
  directTenderDetail,
  directTenderPage,
  shouldUseDirectFallback,
} from '@/lib/tender-direct';
import type { ListOptions } from '@/lib/tender-query';
import type { DataSource, DatasetStats, Facets, TenderPage } from '@/lib/tenders';
import type { SortOption, TenderWithUserState } from '@/types/tender';

/**
 * Client-side TenderBase API wrapper.
 *
 * Calls our own Next route handlers under `/api/*`, never the ingestion service
 * directly. The upstream is public now, so this is no longer about hiding a key
 * — it is about giving the browser one stable contract while the upstream shape
 * is free to change, and about keeping ISR cache headers server-side.
 *
 * Every method below maps to a route that exists in `src/app/api/`. The
 * previous version advertised `/tenders/recommended`, `/saved`, `/saved/:id`
 * and `/tenders/:id/documents/:id`; none of those were ever implemented, so
 * calling them produced a 404 at runtime. They are gone rather than stubbed.
 *
 * BROWSER-DIRECT FALLBACK: when our own route answers with `source: 'fixture'`
 * or `source: 'error'` — the server could not reach the ingestion API — the
 * same request is retried against the upstream from the browser, which is
 * usually on a less restricted network. The upstream is public and CORS-open
 * (`lib/tender-direct.ts`), and the result keeps its provenance (`via`), so a
 * caller can always tell a server-side success from a browser-side one. If the
 * direct attempt also fails, the original server answer is returned unchanged.
 *
 * That fallback is keyed on the *body*, not the status: the detail route marks
 * an outage 503 so no CDN can cache it, and `request` below keeps the envelope
 * instead of throwing on it, so every method here has the same retry available.
 */

/**
 * Which bodies count as an *answer* rather than a failure.
 *
 * `/api/tenders/[id]` answers 503 with its `source: 'error'` envelope on
 * purpose: a 200 carrying `Cache-Control: s-maxage=300` would let a CDN serve
 * an outage for five minutes. But that envelope is precisely what the
 * browser-direct fallback keys off, so treating any non-2xx as a thrown error
 * made the advertised retry for `getById` unreachable — the caller got an
 * exception before `shouldUseDirectFallback` ever saw a `source`.
 *
 * So: an envelope-shaped body is returned like any other response, whatever its
 * status, and the fallback decides what to do with it. Anything that is not an
 * envelope — a crash, an HTML proxy page, a bare 404 — still throws.
 */
const OUTAGE_SOURCES = new Set(['error', 'fixture']);

function isOutageEnvelope(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  return OUTAGE_SOURCES.has((body as { source?: unknown }).source as string);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  const text = await res.text();

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    if (res.ok) throw new Error(`TenderBase API ${res.status}: response was not JSON`);
    throw new Error(`TenderBase API ${res.status}: ${text}`);
  }

  if (!res.ok && !isOutageEnvelope(body)) {
    throw new Error(`TenderBase API ${res.status}: ${text}`);
  }
  return body as T;
}

export interface TenderListParams {
  /** Full-text search; upstream matches description text too. */
  q?: string;
  /** Verbatim upstream category, e.g. 'Supplies: Computer Equipment'. */
  category?: string;
  /** Verbatim upstream province, e.g. 'KwaZulu-Natal'. */
  province?: string;
  /** 'active' | 'complete' | 'cancelled'. */
  status?: string;
  /** App-level window ('24h' | '7d' | '30d'), translated server-side. */
  closingWithin?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

/**
 * What `/api/tenders/[id]` answers with — the client mirror of the server's
 * `DetailOutcome` (`lib/tenders.ts`). `tender` is optional on purpose: when our
 * server could not reach the upstream it holds no copy of that id, and saying so
 * is a real, actionable answer rather than a missing field. That envelope is what
 * lets the browser retry below instead of throwing.
 */
export interface TenderDetailAnswer {
  tender?: TenderWithUserState;
  source: DataSource;
  notice?: string;
  via?: 'server' | 'browser';
}

function toQuery(params: TenderListParams): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

/** The client's param names are the server's option names plus `q` -> `query`. */
function toListOptions(params: TenderListParams): ListOptions {
  const { q, ...rest } = params;
  return { ...rest, query: q };
}

/** Logs and returns the server's own answer when the browser attempt fails. */
async function directOr<T>(original: T, attempt: () => Promise<T>, label: string): Promise<T> {
  try {
    return await attempt();
  } catch (e) {
    console.warn(
      `[api] browser-direct ${label} fallback failed:`,
      e instanceof Error ? e.message : e,
    );
    return original;
  }
}

export const tenderApi = {
  async list(params: TenderListParams = {}): Promise<TenderPage> {
    const page = await request<TenderPage>(`/tenders${toQuery(params)}`);
    if (!shouldUseDirectFallback(page.source)) return page;
    return directOr(page, () => directTenderPage(toListOptions(params)), 'list');
  },

  async getById(id: string): Promise<TenderDetailAnswer> {
    const res = await request<TenderDetailAnswer>(`/tenders/${encodeURIComponent(id)}`);
    if (!shouldUseDirectFallback(res.source)) return res;
    return directOr(
      res,
      async () => (await directTenderDetail(id)) ?? res,
      'detail',
    );
  },

  /** Category and province vocabularies with live counts, for filter UIs. */
  async facets(): Promise<Facets> {
    const facets = await request<Facets>('/facets');
    if (!shouldUseDirectFallback(facets.source)) return facets;
    return directOr(facets, () => directFacets(), 'facets');
  },

  /** Pipeline totals: 411 indexed, 396 active, 101 expiring soon, etc. */
  async stats(): Promise<DatasetStats> {
    const stats = await request<DatasetStats>('/stats');
    if (!shouldUseDirectFallback(stats.source)) return stats;
    return directOr(stats, () => directStats(), 'stats');
  },
};
