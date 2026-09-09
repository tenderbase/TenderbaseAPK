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

export const tenderApi = {
  list(params: TenderListParams = {}) {
    return request<TenderPage>(`/tenders${toQuery(params)}`);
  },

  getById(id: string) {
    return request<{ tender: TenderWithUserState; source: string; notice?: string }>(
      `/tenders/${encodeURIComponent(id)}`,
    );
  },

  /** Category and province vocabularies with live counts, for filter UIs. */
  facets() {
    return request<Facets>('/facets');
  },

  /** Pipeline totals: 411 indexed, 396 active, 101 expiring soon, etc. */
  stats() {
    return request<DatasetStats>('/stats');
  },
};
