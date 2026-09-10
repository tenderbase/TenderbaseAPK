import {
  directFacets,
  directStats,
  directTenderDetail,
  directTenderPage,
  shouldUseDirectFallback,
} from '@/lib/tender-direct';
import type { ListOptions } from '@/lib/tender-query';
import type { DatasetStats, Facets, TenderPage } from '@/lib/tenders';
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
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { Accept: 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`TenderBase API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
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

  async getById(
    id: string,
  ): Promise<{ tender: TenderWithUserState; source: string; notice?: string }> {
    const res = await request<{ tender: TenderWithUserState; source: string; notice?: string }>(
      `/tenders/${encodeURIComponent(id)}`,
    );
    if (!shouldUseDirectFallback(res.source as TenderPage['source'])) return res;
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
