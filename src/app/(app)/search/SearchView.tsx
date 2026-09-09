'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, ArrowUpDown, SearchX, Loader2 } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { TenderCard } from '@/components/tender/TenderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { DataSourceNotice } from '@/components/ui/DataSourceNotice';
import { MenuButton } from '@/components/nav/MenuButton';
import type { DataSource } from '@/lib/tenders';
import type { SortOption, TenderWithUserState } from '@/types/tender';

/**
 * Quick filters map onto real API parameters — none are decorative.
 *
 * `category` and `province` values are the upstream's VERBATIM display names
 * from `/categories` and `/provinces`, not slugs. The API matches these exactly
 * and silently ignores unknown params, so the old slug values ('construction',
 * 'information-technology', 'kwazulu-natal') did not error — they quietly
 * returned the entire unfiltered dataset while the chip showed as selected.
 *
 * `closingWithin` is our own URL param, translated server-side into the
 * `closingAfter` / `closingBefore` bracket the API actually validates.
 */
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
}: SearchViewProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialQuery);
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  // Debounced server round-trip: the query runs against all tenders upstream,
  // not just the page currently in memory.
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

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      v ? next.set(k, v) : next.delete(k);
    }
    if (!('page' in patch)) {
      next.delete('page');
    }
    startTransition(() => router.replace(`/search?${next}`, { scroll: false }));
  };

  const activeQuick = (f: (typeof QUICK_FILTERS)[number]) => {
    const entries = Object.entries(f.params);
    if (entries.length === 0) {
      return (
        !params.get('category') &&
        !params.get('province') &&
        !params.get('closingWithin') &&
        !params.get('status')
      );
    }
    return entries.every(([k, v]) => params.get(k) === v);
  };

  const toggleQuick = (f: (typeof QUICK_FILTERS)[number]) => {
    if (Object.keys(f.params).length === 0) {
      update({ category: undefined, province: undefined, closingWithin: undefined, status: undefined });
      return;
    }
    const on = activeQuick(f);
    update(
      Object.fromEntries(
        Object.entries(f.params).map(([k, v]) => [k, on ? undefined : String(v)]),
      ),
    );
  };

  const toggleSave = (id: string) => setSaved((p) => ({ ...p, [id]: !p[id] }));

  return (
    <main>
      <header className="sticky top-0 z-30 border-b border-line bg-white px-5 pb-3.5 pt-2">
        <div className="mb-3 flex items-center gap-2.5">
          <MenuButton className="md:hidden" />
          <h1 className="text-h2">Find tenders</h1>
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          onClear={() => setQuery('')}
          onSubmit={(q) => {
            const next = new URLSearchParams(params.toString());
            q ? next.set('q', q) : next.delete('q');
            next.delete('page');
            startTransition(() => router.replace(`/search?${next}`, { scroll: false }));
          }}
          placeholder="Search by keyword, organisation or tender number"
        />

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => update({ sort: activeSort === 'closing_soon' ? 'newest' : 'closing_soon' })}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-white text-meta font-medium text-ink"
          >
            <ArrowUpDown size={15} strokeWidth={2} aria-hidden />
            {activeSort === 'closing_soon' ? 'Closing soon' : 'Newest'}
          </button>
          {/*
            Was a `hasDocuments` toggle. The ingestion API has no documents
            filter and drops the param silently, so the button used to look
            active while changing nothing. `status=active` is a real filter
            (verified: 411 -> 396 rows) and is what "hide closed" should do.
          */}
          <button
            type="button"
            onClick={() => update({ status: params.get('status') === 'active' ? undefined : 'active' })}
            aria-pressed={params.get('status') === 'active'}
            className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-line bg-white text-meta font-medium text-ink"
          >
            <SlidersHorizontal size={15} strokeWidth={2} aria-hidden />
            {params.get('status') === 'active' ? 'Open only' : 'Any status'}
          </button>
        </div>

        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-0.5">
          {QUICK_FILTERS.map((f) => (
            <Chip
              key={f.label}
              label={f.label}
              selected={activeQuick(f)}
              onClick={() => toggleQuick(f)}
            />
          ))}
        </div>
      </header>

      <div className="px-5 pt-3.5">
        <DataSourceNotice source={source} notice={notice} />

        <div className="mb-3 flex items-center justify-between">
          <p className="text-meta text-ink-2">
            {pending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" aria-hidden /> Searching…
              </span>
            ) : (
              <>
                <span className="font-semibold text-ink">{total.toLocaleString('en-ZA')}</span>{' '}
                {total === 1 ? 'tender' : 'tenders'} found
              </>
            )}
          </p>
          {totalPages > 1 && (
            <span className="text-caption text-ink-3">
              Page {page} of {totalPages}
            </span>
          )}
        </div>

        {results.length === 0 && !pending ? (
          <EmptyState
            icon={SearchX}
            title="No tenders match your search"
            description="Try a broader keyword, or clear the category, province and status filters."
            actionLabel="Clear filters"
            onAction={() => router.replace('/search')}
          />
        ) : (
          <div
            className={`space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0 ${pending ? 'opacity-60' : ''}`}
          >
            {results.map((t) => (
              <TenderCard
                key={t.id}
                tender={{ ...t, isSaved: saved[t.id] ?? t.isSaved }}
                onToggleSave={toggleSave}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-2.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
              className="h-10 rounded-[10px] border border-line bg-white px-4 text-meta font-medium text-ink disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => update({ page: String(page + 1) })}
              className="h-10 rounded-[10px] border border-line bg-white px-4 text-meta font-medium text-ink disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
