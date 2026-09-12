import type { TenderListParams } from '@/lib/api';

/** Saved searches include the full Discover filter state, including municipal procurement filters. */
export type SavedSearchParams = Partial<Pick<TenderListParams, 'q' | 'category' | 'province' | 'status' | 'closingWithin'>> & {
  municipality?: string;
  municipalityCode?: string;
  procurementType?: string;
};

export interface SavedSearchDef {
  id: string;
  name: string;
  params: SavedSearchParams;
  createdAt: string;
}

const ORDER = ['q', 'category', 'province', 'status', 'closingWithin', 'municipality', 'municipalityCode', 'procurementType'] as const;

export function paramsFromUrl(sp: URLSearchParams): SavedSearchParams {
  const out: SavedSearchParams = {};
  for (const key of ORDER) {
    const v = sp.get(key)?.trim();
    if (v) (out as Record<string, string>)[key] = v;
  }
  return out;
}

export function hasAny(p: SavedSearchParams): boolean {
  return Object.keys(p).length > 0;
}

export function paramsKey(p: SavedSearchParams): string {
  return ORDER.filter((k) => p[k]).map((k) => `${k}=${p[k]}`).join('&');
}

export function searchUrlFor(p: SavedSearchParams): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, String(v));
  const s = sp.toString();
  return s ? `/search?${s}` : '/search';
}

export interface SearchSummaryChip {
  label: string;
  kind: 'query' | 'category' | 'province' | 'window' | 'status' | 'municipality' | 'procurement';
}

export function summarize(p: SavedSearchParams): SearchSummaryChip[] {
  const chips: SearchSummaryChip[] = [];
  if (p.q) chips.push({ label: `“${p.q}”`, kind: 'query' });
  if (p.category) chips.push({ label: p.category, kind: 'category' });
  if (p.province) chips.push({ label: p.province, kind: 'province' });
  if (p.municipalityCode || p.municipality) chips.push({ label: p.municipalityCode ?? p.municipality ?? 'Municipality', kind: 'municipality' });
  if (p.procurementType) chips.push({ label: p.procurementType, kind: 'procurement' });
  if (p.closingWithin) chips.push({ label: 'Closing soon', kind: 'window' });
  if (p.status === 'active') chips.push({ label: 'Open only', kind: 'status' });
  return chips;
}

export function defaultName(p: SavedSearchParams): string {
  if (p.q) return p.q;
  if (p.municipalityCode || p.municipality) return `${p.municipalityCode ?? p.municipality}${p.procurementType ? ` ${p.procurementType}` : ''}`;
  if (p.procurementType) return `${p.procurementType} tenders`;
  if (p.category) return p.category;
  if (p.province) return p.province;
  if (p.closingWithin) return 'Closing soon';
  if (p.status === 'active') return 'Open tenders';
  return 'All tenders';
}

export function toListParams(p: SavedSearchParams): TenderListParams & SavedSearchParams {
  return {
    q: p.q,
    category: p.category,
    province: p.province,
    status: p.status,
    closingWithin: p.closingWithin,
    municipality: p.municipality,
    municipalityCode: p.municipalityCode,
    procurementType: p.procurementType,
    sort: 'newest',
    limit: 1,
  };
}
