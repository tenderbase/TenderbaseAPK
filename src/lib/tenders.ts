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
  closing_soon: 'newest', // Upstream /tenders endpoint rejects 'closing'; map to 'newest' and handle closing order in app.
  newest: 'newest',
  value_desc: 'newest', // No value field upstream; degrade rather than 400.
};

function parseClosingWithinHours(val?: string): number {
  if (!val) return 168; // Default 7 days
  if (val.endsWith('h')) return parseInt(val, 10) || 168;
  if (val.endsWith('d')) return (parseInt(val, 10) || 7) * 24;
  return 168;
}

function sortByClosingDateAsc(a: TenderWithUserState, b: TenderWithUserState): number {
  if (!a.closingDate) return 1;
  if (!b.closingDate) return -1;
  const timeA = new Date(a.closingDate).getTime();
  const timeB = new Date(b.closingDate).getTime();
  if (isNaN(timeA)) return 1;
  if (isNaN(timeB)) return -1;
  return timeA - timeB;
}

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

  const isClosingFilter = opts.sort === 'closing_soon' || Boolean(opts.closingWithin);
  const hasOtherFilters = Boolean(
    opts.query || opts.category || opts.province || opts.organisation || opts.status,
  );

  // When only closing soon is requested without other search filters, use the dedicated closing-soon endpoint
  if (isClosingFilter && !hasOtherFilters) {
    try {
      const hours = parseClosingWithinHours(opts.closingWithin);
      const res = await tenderApiServer.closingSoon(hours, opts.limit ?? 20);
      let results = res.data.map((t) => adaptTenderWithState(t));
      if (opts.sort === 'closing_soon' || opts.closingWithin) {
        results.sort(sortByClosingDateAsc);
      }
      return {
        results,
        total: res.pagination.total,
        page: res.pagination.page,
        totalPages: res.pagination.total_pages,
        source: 'live',
      };
    } catch (e) {
      console.error('[tenders] closing-soon list failed, falling back to general list:', e);
    }
  }

  const query: ApiTenderQuery = {
    page: opts.page ?? 1,
    limit: opts.limit ?? 20,
    sort: SORT_MAP[opts.sort ?? 'newest'],
    category: opts.category,
    province: opts.province,
    organisation: opts.organisation,
    status: opts.status,
    search: opts.query,
  };

  try {
    const res = await tenderApiServer.list(query);
    let results = res.data.map((t) => adaptTenderWithState(t));

    if (opts.sort === 'closing_soon' || opts.closingWithin) {
      results.sort(sortByClosingDateAsc);
    }

    return {
      results,
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
