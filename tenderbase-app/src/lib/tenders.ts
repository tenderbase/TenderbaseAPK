import 'server-only';

import { adaptTenderWithState, adaptDetail } from '@/lib/adapt';
import { isApiConfigured, tenderApiServer, TenderApiError } from '@/lib/tender-api.server';
import { MOCK_TENDERS } from '@/lib/mock-data';
import type { ApiSort, ApiTenderQuery } from '@/types/api';
import type { SortOption, TenderWithUserState } from '@/types/tender';

/**
 * The single data source every screen reads from.
 *
 * Falls back to fixtures when the API key is absent or upstream is down, so the
 * app is always demoable. `source` tells the UI which it got — we surface that
 * honestly rather than passing fixtures off as live data.
 */

export type DataSource = 'live' | 'mock';

export interface TenderPage {
  results: TenderWithUserState[];
  total: number;
  page: number;
  totalPages: number;
  source: DataSource;
  /** Present when we fell back after an upstream failure. */
  notice?: string;
}

const SORT_MAP: Record<SortOption, ApiSort> = {
  closing_soon: 'closing',
  newest: 'newest',
  value_desc: 'newest', // No value field upstream; degrade rather than 400.
  ai_match: 'relevance',
};

function mockPage(notice?: string, limit = 20): TenderPage {
  return {
    results: MOCK_TENDERS.slice(0, limit),
    total: MOCK_TENDERS.length,
    page: 1,
    totalPages: 1,
    source: 'mock',
    notice,
  };
}

function fallbackNotice(e: unknown): string {
  if (e instanceof TenderApiError) {
    if (e.code === 'UPSTREAM_TIMEOUT')
      return 'The tender service is waking up. Showing sample data — refresh shortly.';
    if (e.status === 401 || e.status === 403)
      return 'Tender service rejected the API key. Showing sample data.';
    return `Tender service unavailable (${e.code}). Showing sample data.`;
  }
  return 'Tender service unavailable. Showing sample data.';
}

export interface ListOptions {
  query?: string;
  category?: string;
  province?: string;
  organisation?: string;
  status?: string;
  closingWithin?: string;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export async function listTenders(opts: ListOptions = {}): Promise<TenderPage> {
  if (!isApiConfigured()) {
    return mockPage('TENDERBASE_API_KEY not set — showing sample data.', opts.limit);
  }

  const query: ApiTenderQuery = {
    page: opts.page ?? 1,
    limit: opts.limit ?? 20,
    sort: SORT_MAP[opts.sort ?? 'newest'],
    // Upstream expects a single value per facet, not repeated params.
    category: opts.category,
    province: opts.province,
    organisation: opts.organisation,
    status: opts.status,
    closing_within: opts.closingWithin,
    search: opts.query,
  };

  // 'relevance' only means something alongside a search term.
  if (query.sort === 'relevance' && !query.search) query.sort = 'newest';

  try {
    const res = await tenderApiServer.list(query);
    return {
      results: res.data.map((t) => adaptTenderWithState(t)),
      total: res.pagination.total,
      page: res.pagination.page,
      totalPages: res.pagination.total_pages,
      source: 'live',
    };
  } catch (e) {
    console.error('[tenders] list failed:', e);
    return mockPage(fallbackNotice(e), opts.limit);
  }
}

export async function getTender(id: string) {
  if (!isApiConfigured()) {
    const t = MOCK_TENDERS.find((x) => x.id === id);
    return t ? { tender: { ...t, amendments: [] }, source: 'mock' as DataSource } : null;
  }
  try {
    const res = await tenderApiServer.getById(id);
    return { tender: adaptDetail(res), source: 'live' as DataSource };
  } catch (e) {
    if (e instanceof TenderApiError && e.status === 404) return null;
    console.error('[tenders] detail failed:', e);
    const t = MOCK_TENDERS.find((x) => x.id === id);
    return t ? { tender: { ...t, amendments: [] }, source: 'mock' as DataSource } : null;
  }
}

/** Dashboard "closing soon" strip. Defaults to a 7-day window. */
export async function getClosingSoon(limit = 5): Promise<TenderPage> {
  if (!isApiConfigured()) return mockPage(undefined, limit);
  try {
    const res = await tenderApiServer.closingSoon(168, limit);
    return {
      results: res.data.map((t) => adaptTenderWithState(t)),
      total: res.pagination.total,
      page: 1,
      totalPages: res.pagination.total_pages,
      source: 'live',
    };
  } catch (e) {
    console.error('[tenders] closing-soon failed:', e);
    return mockPage(fallbackNotice(e), limit);
  }
}

export async function getLatest(limit = 5): Promise<TenderPage> {
  if (!isApiConfigured()) return mockPage(undefined, limit);
  try {
    const res = await tenderApiServer.latest(limit);
    return {
      results: res.data.map((t) => adaptTenderWithState(t)),
      total: res.pagination.total,
      page: 1,
      totalPages: res.pagination.total_pages,
      source: 'live',
    };
  } catch (e) {
    console.error('[tenders] latest failed:', e);
    return mockPage(fallbackNotice(e), limit);
  }
}

export async function getFacets() {
  if (!isApiConfigured()) return null;
  try {
    return await tenderApiServer.facets();
  } catch {
    return null;
  }
}
