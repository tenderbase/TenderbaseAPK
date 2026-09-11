import 'server-only';

import { adaptCategories, adaptDetail, adaptProvinces, adaptTenderWithState } from '@/lib/adapt';
import { API_BASE_URL, TenderApiError, tenderApiServer } from '@/lib/tender-api.server';
import { buildApiQuery, closingWithinDays, type ListOptions } from '@/lib/tender-query';
import type { ApiCategoriesResponse, ApiProvincesResponse, ApiStats, ApiTender } from '@/types/api';
import type { Category, TenderWithUserState } from '@/types/tender';

export { buildApiQuery, SORT_MAP } from '@/lib/tender-query';
export type { ListOptions } from '@/lib/tender-query';

/** One source of truth: the live TenderBase ingestion API. No demo catalogue is used. */
export type DataSource = 'live' | 'error';

export interface TenderPage {
  results: TenderWithUserState[];
  total: number;
  page: number;
  totalPages: number;
  source: DataSource;
  notice?: string;
  via?: 'server' | 'browser';
}

function errorNotice(e?: unknown): string {
  if (e instanceof TenderApiError) {
    if (e.code === 'UPSTREAM_TIMEOUT') return 'The tender service is still waking up. Please try again in a moment.';
    if (e.code === 'NETWORK_ERROR') return 'Could not reach the tender service. Please try again shortly.';
    if (e.code === 'INVALID_QUERY') return 'The tender service rejected the query. Please refresh and try again.';
    const detail = e.status ? ` ${e.status}` : '';
    return `The tender service returned an error (${e.code}${detail}). Please try again.`;
  }
  return 'The tender service is unavailable right now. Please try again shortly.';
}

export function isSuspiciouslyEmpty(res: { results?: unknown[]; total?: number }): boolean {
  return (res.results?.length ?? 0) === 0 && (res.total ?? 0) === 0;
}

export function statsShowLiveDataset(res: unknown): boolean {
  if (!res || typeof res !== 'object') return false;
  const stats = (res as { stats?: unknown }).stats;
  if (!stats || typeof stats !== 'object') return false;
  const total = (stats as { totalTenders?: unknown }).totalTenders;
  return typeof total === 'number' && Number.isFinite(total) && total > 0;
}

async function upstreamProvesLiveDataset(): Promise<boolean> {
  try { return statsShowLiveDataset(await tenderApiServer.stats({ noStore: true })); }
  catch { return false; }
}

function errorPage(opts: ListOptions = {}, e?: unknown): TenderPage {
  return {
    results: [], total: 0, page: Math.max(1, opts.page ?? 1), totalPages: 1,
    source: 'error', notice: errorNotice(e),
  };
}

async function withLiveFallback<T>(live: () => Promise<T>, fallback: (e: unknown) => T, label: string): Promise<T> {
  try { return await live(); }
  catch (e) {
    console.error(`[tenders] ${label} failed:`, e instanceof Error ? e.message : e);
    return fallback(e);
  }
}

export async function listTenders(opts: ListOptions = {}): Promise<TenderPage> {
  const query = buildApiQuery(opts);
  return withLiveFallback(
    async () => {
      let res = await tenderApiServer.list(query);
      if (isSuspiciouslyEmpty(res)) {
        const fresh = await tenderApiServer.list(query, { noStore: true });
        if (!isSuspiciouslyEmpty(fresh)) res = fresh;
      }
      return {
        results: (res.results ?? []).map(adaptTenderWithState),
        total: res.total ?? res.results?.length ?? 0,
        page: res.page ?? query.page ?? 1,
        totalPages: res.totalPages ?? 1,
        source: 'live' as DataSource,
        via: 'server' as const,
      };
    },
    (e) => errorPage(opts, e),
    'list',
  );
}

export type DetailOutcome =
  | { tender: ReturnType<typeof adaptDetail>; source: 'live'; via?: 'server' | 'browser'; }
  | { source: 'error'; notice: string }
  | null;

export async function getTender(id: string): Promise<DetailOutcome> {
  try {
    const res = await tenderApiServer.getById(id);
    if (!res?.tender) return { source: 'error', notice: 'The tender service returned an incomplete tender record.' };
    return { tender: adaptDetail(res.tender), source: 'live', via: 'server' };
  } catch (e) {
    if (e instanceof TenderApiError && e.status === 404) {
      if (await upstreamProvesLiveDataset()) return null;
      return { source: 'error', notice: errorNotice(e) };
    }
    return { source: 'error', notice: errorNotice(e) };
  }
}

export async function getClosingSoon(limit = 5, days = 7): Promise<TenderPage> {
  return listTenders({ closingWithin: `${days}d`, sort: 'closing_soon', limit });
}

export async function getLatest(limit = 5): Promise<TenderPage> {
  return listTenders({ sort: 'newest', limit });
}

export interface Facets {
  categories: { name: string; count: number; group: Category }[];
  provinces: { name: string; count: number }[];
  source: DataSource;
  notice?: string;
  via?: 'server' | 'browser';
}

export async function getFacets(): Promise<Facets> {
  return withLiveFallback(
    async () => {
      const [cats, provs] = await Promise.all([
        tenderApiServer.categories(),
        tenderApiServer.provinces(),
      ]);
      return { categories: adaptCategories(cats), provinces: adaptProvinces(provs), source: 'live' as DataSource };
    },
    (e) => ({ categories: [], provinces: [], source: 'error' as DataSource, notice: errorNotice(e) }),
    'facets',
  );
}

export interface DatasetStats extends ApiStats {
  source: DataSource;
  notice?: string;
  via?: 'server' | 'browser';
}

export async function getStats(): Promise<DatasetStats> {
  return withLiveFallback(
    async () => {
      let stats = (await tenderApiServer.stats()).stats;
      if (!stats || typeof stats.totalTenders !== 'number') {
        stats = (await tenderApiServer.stats({ noStore: true })).stats;
      }
      if (!stats || typeof stats.totalTenders !== 'number') {
        throw new TenderApiError(502, 'UPSTREAM_ERROR', 'The stats payload was not the expected shape.');
      }
      if (stats.totalTenders === 0) {
        const fresh = (await tenderApiServer.stats({ noStore: true })).stats;
        if (fresh && typeof fresh.totalTenders === 'number') stats = fresh;
      }
      return { ...stats, source: 'live' as DataSource };
    },
    (e) => ({
      totalTenders: 0, activeTenders: 0, completedTenders: 0, cancelledTenders: 0,
      expiringSoonTenders: 0, categoriesCount: 0, provincesCount: 0,
      latestPublishedDate: null, uptimeSeconds: 0, source: 'error' as DataSource,
      notice: errorNotice(e),
    }),
    'stats',
  );
}

export const UPSTREAM_BASE_URL = API_BASE_URL;
