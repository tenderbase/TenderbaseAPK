import type {
  SearchResponse,
  SortOption,
  TenderFilters,
  TenderWithUserState,
  TenderSummary,
  MatchExplanation,
} from '@/types/tender';

/**
 * TenderBase API client.
 *
 * Every method maps to a real endpoint — nothing in the UI is wired to a
 * placeholder. Calls that need the API key go through Next route handlers
 * (`/api/*`) so the key is never shipped to the device.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    throw new Error(`TenderBase API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function toQuery(filters: TenderFilters, sort: SortOption, page: number): string {
  const p = new URLSearchParams();
  if (filters.query) p.set('q', filters.query);
  filters.categories?.forEach((c) => p.append('category', c));
  filters.provinces?.forEach((v) => p.append('province', v));
  filters.statuses?.forEach((s) => p.append('status', s));
  if (filters.organisation) p.set('organisation', filters.organisation);
  if (filters.minValueCents != null) p.set('minValue', String(filters.minValueCents));
  if (filters.maxValueCents != null) p.set('maxValue', String(filters.maxValueCents));
  if (filters.closingBefore) p.set('closingBefore', filters.closingBefore);
  if (filters.closingAfter) p.set('closingAfter', filters.closingAfter);
  p.set('sort', sort);
  p.set('page', String(page));
  return p.toString();
}

export const tenderApi = {
  search(filters: TenderFilters, sort: SortOption = 'closing_soon', page = 1) {
    return request<SearchResponse>(`/tenders?${toQuery(filters, sort, page)}`);
  },

  getById(id: string) {
    return request<TenderWithUserState>(`/tenders/${id}`);
  },

  recommended() {
    return request<TenderWithUserState[]>('/tenders/recommended');
  },

  saved(filter: 'all' | 'closing_soon' | 'recent' = 'all') {
    return request<TenderWithUserState[]>(`/saved?filter=${filter}`);
  },

  toggleSave(id: string, saved: boolean) {
    return request<{ saved: boolean }>(`/saved/${id}`, {
      method: saved ? 'PUT' : 'DELETE',
    });
  },

  /** Resolves a signed, time-limited document URL from the source system. */
  documentUrl(tenderId: string, documentId: string) {
    return request<{ url: string }>(`/tenders/${tenderId}/documents/${documentId}`);
  },
};

export const aiApi = {
  /** RAG over the tender's own documents. Always returns citations. */
  summarise(tenderId: string) {
    return request<TenderSummary>(`/ai/summary/${tenderId}`);
  },

  /** Transparent rubric scored against the user's company profile. */
  explainMatch(tenderId: string) {
    return request<MatchExplanation>(`/ai/match/${tenderId}`);
  },

  /** Parses plain language into real filters, which the UI shows and lets the user edit. */
  parseQuery(query: string) {
    return request<{ filters: TenderFilters }>('/ai/parse-query', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  },

  feedback(kind: 'summary' | 'match', tenderId: string, helpful: boolean) {
    return request<{ ok: true }>('/ai/feedback', {
      method: 'POST',
      body: JSON.stringify({ kind, tenderId, helpful }),
    });
  },
};
