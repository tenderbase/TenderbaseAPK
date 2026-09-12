'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ArrowUpDown, SearchX, Loader2, CloudOff, BookmarkPlus, Check, Target, MapPin, FileText } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { TenderCard } from '@/components/tender/TenderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataSourceNotice } from '@/components/ui/DataSourceNotice';
import { MenuButton } from '@/components/nav/MenuButton';
import { DIRECT_FALLBACK_ENABLED, directTenderPage, shouldUseDirectFallback } from '@/lib/tender-direct';
import { useSavedTenders } from '@/lib/saved-store';
import { useSavedSearches } from '@/lib/saved-searches-store';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { paramsFromUrl, hasAny } from '@/lib/saved-searches';
import { loadProfile } from '@/lib/company';
import { loadPreferences } from '@/lib/preferences';
import { scoreTender } from '@/lib/matches';
import type { DataSource } from '@/lib/tenders';
import type { SortOption, TenderWithUserState } from '@/types/tender';
import type { CompanyProfile } from '@/types/company';
import type { TenderPreferences } from '@/types/preferences';

type MunicipalityFacet = { code: string; name: string; province: string; tenderCount: number };
type ProcurementTypeFacet = { procurementType: string; count: number };

const QUICK_FILTERS = [
  { label: 'All', params: {} },
  { label: 'Closing soon', params: { closingWithin: '7d' } },
  { label: 'Newest', params: { sort: 'newest' } },
  { label: 'Construction', params: { category: 'Construction' } },
  { label: 'IT & comms', params: { category: 'Information and communication' } },
  { label: 'Security', params: { category: 'Security and investigation activities' } },
  { label: 'KwaZulu-Natal', params: { province: 'KwaZulu-Natal' } },
  { label: 'Gauteng', params: { province: 'Gauteng' } },
] as const;

export interface SearchViewProps {
  results: TenderWithUserState[];
  total: number;
  page: number;
  totalPages: number;
  source: DataSource;
  notice?: string;
  initialQuery: string;
  activeSort: SortOption;
  municipalities: MunicipalityFacet[];
  procurementTypes: ProcurementTypeFacet[];
}

export function SearchView({
  results,
  total,
  page,
  totalPages,
  source,
  notice,
  initialQuery,
  activeSort,
  municipalities,
  procurementTypes,
}: SearchViewProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [bestFit, setBestFit] = useState(false);
  const [profile] = useState<CompanyProfile>(() => loadProfile());
  const [preferences] = useState<TenderPreferences>(() => loadPreferences());
  const [direct, setDirect] = useState<{ results: TenderWithUserState[]; total: number; page: number; totalPages: number } | null>(null);
  const { session, isSaved, toggleSaved } = useSavedTenders();
  const searches = useSavedSearches();
  const { limit } = useTier();
  const { openUpgrade } = useUpgrade();
  const currentSearch = paramsFromUrl(params);
  const thisSearchSaved = searches.isSaved(currentSearch);
  const searchCap = limit('saved-searches') ?? 3;

  const clearAll = () => { setQuery(''); startTransition(() => router.replace('/search', { scroll: false })); };

  useEffect(() => {
    if (query === initialQuery) return;
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      query ? next.set('q', query) : next.delete('q');
      next.delete('page');
      startTransition(() => router.replace(`/search?${next}`, { scroll: false }));
    }, 350);
    return () => clearTimeout(id);
  }, [query, initialQuery, params, router]);

  useEffect(() => {
    const hasFilters = ['q', 'category', 'province', 'status', 'closingWithin', 'municipality', 'municipalityCode', 'procurementType'].some((k) => params.get(k));
    const suspiciousEmpty = source === 'live' && total === 0 && !hasFilters && Number(params.get('page') ?? 1) === 1 && DIRECT_FALLBACK_ENABLED;
    if (!shouldUseDirectFallback(source) && !suspiciousEmpty) { setDirect(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const pageData = await directTenderPage({
          query: params.get('q') ?? undefined,
          category: params.get('category') ?? undefined,
          province: params.get('province') ?? undefined,
          status: params.get('status') ?? undefined,
          municipality: params.get('municipality') ?? undefined,
          municipalityCode: params.get('municipalityCode') ?? undefined,
          procurementType: params.get('procurementType') ?? undefined,
          closingWithin: params.get('closingWithin') ?? undefined,
          sort: (params.get('sort') as SortOption) || 'newest',
          page: Number(params.get('page') ?? 1) || 1,
          limit: 20,
        });
        if (cancelled) return;
        setDirect({ results: pageData.results, total: pageData.total, page: pageData.page, totalPages: pageData.totalPages });
      } catch (e) {
        if (!cancelled) console.warn('[search] browser-direct tender fallback failed:', e instanceof Error ? e.message : e);
      }
    })();
    return () => { cancelled = true; };
  }, [source, total, params]);

  const shownResults = direct?.results ?? results;
  const shownTotal = direct?.total ?? total;
  const shownPage = direct?.page ?? page;
  const shownTotalPages = direct?.totalPages ?? totalPages;
  const shownSource: DataSource = direct ? 'live' : source;
  const shownNotice = direct ? undefined : notice;
  const scored = useMemo(() => new Map(shownResults.map((t) => [t.id, scoreTender(t, { profile, preferences }).score])), [shownResults, profile, preferences]);
  const rankedResults = useMemo(() => {
    const rows = shownResults.map((t) => { const score = scored.get(t.id) ?? 0; return score > 0 ? { ...t, matchScore: score } : t; });
    if (!bestFit) return rows;
    return [...rows].sort((a, b) => { const sa = a.matchScore ?? -1; const sb = b.matchScore ?? -1; if (sb !== sa) return sb - sa; return new Date(a.closingDate || 0).getTime() - new Date(b.closingDate || 0).getTime(); });
  }, [shownResults, scored, bestFit]);
  const strongMatches = rankedResults.filter((t) => (t.matchScore ?? 0) >= 45).length;

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) v ? next.set(k, v) : next.delete(k);
    if (!('page' in patch)) next.delete('page');
    startTransition(() => router.replace(`/search?${next}`, { scroll: false }));
  };

  const activeQuick = (f: (typeof QUICK_FILTERS)[number]) => {
    const entries = Object.entries(f.params);
    if (entries.length === 0) return !params.get('category') && !params.get('province') && !params.get('closingWithin') && !params.get('status') && !params.get('municipality') && !params.get('municipalityCode') && !params.get('procurementType');
    return entries.every(([k, v]) => params.get(k) === v);
  };

  const toggleQuick = (f: (typeof QUICK_FILTERS)[number]) => {
    if (Object.keys(f.params).length === 0) { update({ category: undefined, province: undefined, closingWithin: undefined, status: undefined, municipality: undefined, municipalityCode: undefined, procurementType: undefined }); return; }
    const on = activeQuick(f);
    update(Object.fromEntries(Object.entries(f.params).map(([k, v]) => [k, on ? undefined : String(v)])));
  };

  return (
    <main className="pb-24">
      <header className="sticky top-0 z-30 border-b border-line bg-white px-5 pb-3.5 pt-2">
        <div className="mb-3 flex items-center gap-2.5"><MenuButton className="md:hidden" /><h1 className="text-h2">Find tenders</h1></div>
        <SearchBar value={query} onChange={setQuery} onClear={() => setQuery('')} onSubmit={(q) => { const next = new URLSearchParams(params.toString()); q ? next.set('q', q) : next.delete('q'); next.delete('page'); startTransition(() => router.replace(`/search?${next}`, { scroll: false })); }} placeholder="Search by keyword, organisation or tender number" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-[10px] border border-line bg-white px-3">
            <MapPin size={15} className="shrink-0 text-navy" aria-hidden />
            <select aria-label="Filter by municipality" value={params.get('municipalityCode') ?? params.get('municipality') ?? ''} onChange={(e) => update({ municipalityCode: e.target.value || undefined, municipality: undefined })} className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-ink outline-none">
              <option value="">All municipalities</option>
              {municipalities.map((m) => <option key={m.code} value={m.code}>{m.name} · {m.province}</option>)}
            </select>
          </label>
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-[10px] border border-line bg-white px-3">
            <FileText size={15} className="shrink-0 text-navy" aria-hidden />
            <select aria-label="Filter by procurement type" value={params.get('procurementType') ?? ''} onChange={(e) => update({ procurementType: e.target.value || undefined })} className="min-w-0 flex-1 bg-transparent text-[12px] font-semibold text-ink outline-none">
              <option value="">All procurement types</option>
              {procurementTypes.map((p) => <option key={p.procurementType} value={p.procurementType}>{p.procurementType} · {p.count}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setBestFit((v) => !v)} aria-pressed={bestFit} className={`flex h-10 items-center justify-center gap-1.5 rounded-[10px] border px-2 text-meta font-semibold ${bestFit ? 'border-ai-line bg-ai-bg text-ai' : 'border-line bg-white text-ink'}`}><Target size={15} strokeWidth={2} aria-hidden /> Best fit</button>
          <button type="button" onClick={() => { setBestFit(false); update({ sort: activeSort === 'closing_soon' ? 'newest' : 'closing_soon' }); }} className="flex h-10 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-white text-meta font-medium text-ink"><ArrowUpDown size={15} strokeWidth={2} aria-hidden /> {activeSort === 'closing_soon' ? 'Closing soon' : 'Newest'}</button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => update({ status: params.get('status') === 'active' ? undefined : 'active' })} aria-pressed={params.get('status') === 'active'} className="flex h-9 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-white text-meta font-medium text-ink"><SlidersHorizontal size={15} strokeWidth={2} aria-hidden /> {params.get('status') === 'active' ? 'Open only' : 'Any status'}</button>
          <button type="button" onClick={() => update({ municipality: undefined, municipalityCode: undefined, procurementType: undefined })} className="flex h-9 items-center justify-center rounded-[10px] border border-line bg-white text-meta font-medium text-ink">Clear municipal filters</button>
        </div>
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5">{QUICK_FILTERS.map((f) => <Chip key={f.label} label={f.label} selected={activeQuick(f)} onClick={() => toggleQuick(f)} />)}</div>
      </header>
      <div className="px-5 pt-3.5">
        <DataSourceNotice source={shownSource} notice={shownNotice} via={direct ? 'browser' : undefined} />
        {(params.get('municipalityCode') || params.get('municipality')) && <div className="mb-3 flex items-center gap-2 rounded-[12px] border border-blue-line bg-blue-soft px-3.5 py-2.5"><MapPin size={15} className="shrink-0 text-blue" aria-hidden /><p className="text-[12px] text-ink-2"><span className="font-semibold text-ink">Municipality filter active.</span> Results are restricted to the selected local authority.</p></div>}
        {params.get('procurementType') && <div className="mb-3 flex items-center gap-2 rounded-[12px] border border-pro-line bg-pro-soft px-3.5 py-2.5"><FileText size={15} className="shrink-0 text-[#7a610f]" aria-hidden /><p className="text-[12px] text-ink-2"><span className="font-semibold text-ink">{params.get('procurementType')} filter active.</span> The API is applying this procurement class before results reach the UI.</p></div>}
        {strongMatches > 0 && <div className="mb-3 flex items-center gap-2 rounded-[12px] border border-ai-line bg-ai-bg px-3.5 py-2.5"><Target size={15} className="shrink-0 text-ai" aria-hidden /><p className="text-[12px] text-ink-2"><span className="font-semibold text-ink">{strongMatches} strong matches on this page.</span> Ranked from your company profile and tender preferences.</p></div>}
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-meta text-ink-2">{pending ? <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" aria-hidden /> Searching…</span> : shownSource === 'error' && shownTotal === 0 ? 'Service unavailable' : <><span className="font-semibold text-ink">{shownTotal.toLocaleString('en-ZA')}</span> {shownTotal === 1 ? 'tender' : 'tenders'} found</>}</p>
          <span className="flex shrink-0 items-center gap-2">
            {shownTotalPages > 1 && <span className="hidden text-caption text-ink-3 sm:inline">Page {shownPage} of {shownTotalPages}</span>}
            {session.signedIn && hasAny(currentSearch) && (thisSearchSaved ? <button type="button" onClick={() => router.push('/saved?tab=searches')} className="flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[12px] font-semibold text-navy"><Check size={13} strokeWidth={2.6} aria-hidden /> Saved — open</button> : <button type="button" onClick={() => { if (searches.count >= searchCap) { openUpgrade('saved-searches', { why: 'Basic saves up to 3 searches — Pro keeps every filter set you run, ready to re-run.' }); return; } searches.add('', currentSearch); }} className="flex h-8 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[12px] font-semibold text-ink-2 transition-colors hover:border-navy hover:text-navy"><BookmarkPlus size={13} strokeWidth={2.1} aria-hidden /> Save search</button>)}
          </span>
        </div>
        {shownSource === 'error' && rankedResults.length === 0 && !pending ? <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-8 text-center"><div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-urgent-bg text-urgent"><CloudOff size={24} strokeWidth={1.7} aria-hidden /></div><h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">Tenders are unavailable right now</h3><p className="mt-1.5 max-w-[260px] text-meta text-ink-2">{notice}</p><button type="button" onClick={() => router.refresh()} className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-navy px-4 text-[14px] font-semibold text-white">Try again</button></div> : rankedResults.length === 0 && !pending ? <EmptyState icon={SearchX} title="No tenders match your search" description="Try a broader keyword, or clear the category, municipality, procurement type, province and status filters." actionLabel="Clear search" onAction={clearAll} /> : <div className={`space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 ${pending ? 'opacity-60' : ''}`}>{rankedResults.map((t) => <TenderCard key={t.id} tender={{ ...t, isSaved: isSaved(t.id) }} onToggleSave={() => toggleSaved(t)} />)}</div>}
        {shownTotalPages > 1 && <div className="mt-5 flex items-center justify-center gap-2.5"><button type="button" disabled={shownPage <= 1} onClick={() => update({ page: String(shownPage - 1) })} className="h-10 rounded-[10px] border border-line bg-white px-4 text-meta font-medium text-ink disabled:opacity-40">Previous</button><button type="button" disabled={shownPage >= shownTotalPages} onClick={() => update({ page: String(shownPage + 1) })} className="h-10 rounded-[10px] border border-line bg-white px-4 text-meta font-medium text-ink disabled:opacity-40">Next</button></div>}
      </div>
    </main>
  );
}
