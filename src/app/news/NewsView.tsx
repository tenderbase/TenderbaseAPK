'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle, ArrowRight, Bookmark, Check, Crown, Database, ExternalLink,
  Lock, Newspaper, Plus, Rss, Sparkles, WifiOff, X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { MenuButton } from '@/components/nav/MenuButton';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { NewsBookmarkButton } from '@/components/news/NewsBookmarkButton';
import { useNewsBookmarks } from '@/lib/news-bookmarks';
import { useMatchContext } from '@/lib/use-match-context';
import { useSavedTenders } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { formatRelative } from '@/lib/format';
import { NEWS_RAILS, NEWS_SOURCES, railDef, railIndex, sourceDef } from '@/lib/news-sources';
import { pickCrossLink, rankNewsFeed, type FacetEntry, type RelevantNewsItem } from '@/lib/news-relevance';
import type { NewsFeedStatus, NewsItem, NewsRailEnvelope, NewsRailId } from '@/types/news';

interface CustomFeed {
  id: string;
  url: string;
  host: string;
  title: string;
  rail: NewsRailId;
}

const EMPTY_CTX = { profile: null, preferences: null };

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * News — the flagship feed surface (blueprint §5.7).
 *
 * Rails are gated by the entitlement model (guests 2 rails, Basic 3,
 * Pro all + custom feeds + relevance). Content is live RSS when the
 * deployment has network; otherwise the captured fixtures render inside an
 * honest amber envelope. The "relevant to me" toggle re-ranks with the v0
 * explainable signals (category/province/company tokens) and shows a real
 * count — nothing invented, no fake freshness.
 */
export function NewsView() {
  const router = useRouter();
  const { session } = useSavedTenders();
  const { tier, can, limit } = useTier();
  const { openUpgrade } = useUpgrade();
  const bookmarks = useNewsBookmarks();
  const signedIn = session.signedIn;

  const unlockedCount = tier === 'pro' ? NEWS_RAILS.length : (limit('news-basic') ?? 2);
  const firstRail = NEWS_RAILS[0].id;

  const [rail, setRail] = useState<NewsRailId>(() =>
    readJson<NewsRailId | null>('tb_news_rail', null) ?? firstRail,
  );
  const [envelope, setEnvelope] = useState<NewsRailEnvelope | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [feedStatus, setFeedStatus] = useState<Record<string, NewsFeedStatus>>({});
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [relevantOn, setRelevantOn] = useState(() => readJson<boolean>('tb_news_relevant', false));
  const [onlySaved, setOnlySaved] = useState(false);
  const [customFeeds, setCustomFeeds] = useState<CustomFeed[]>(() =>
    readJson<CustomFeed[]>('tb_news_custom', []),
  );
  const [customItems, setCustomItems] = useState<NewsItem[]>([]);
  const [facets, setFacets] = useState<FacetEntry[] | null>(null);
  const [tick, setTick] = useState(0);

  const signedInCtx = useMatchContext(signedIn && can('news-relevant'));
  const relevanceCtx =
    can('news-relevant') && signedIn
      ? { profile: signedInCtx.profile, preferences: signedInCtx.preferences }
      : EMPTY_CTX;

  // Persist rail/relevance/filters.
  useEffect(() => {
    try {
      window.localStorage.setItem('tb_news_rail', JSON.stringify(rail));
    } catch { /* private mode */ }
  }, [rail]);
  useEffect(() => {
    try {
      window.localStorage.setItem('tb_news_relevant', JSON.stringify(relevantOn));
    } catch { /* private mode */ }
  }, [relevantOn]);
  useEffect(() => {
    try {
      window.localStorage.setItem('tb_news_custom', JSON.stringify(customFeeds));
    } catch { /* private mode */ }
  }, [customFeeds]);

  // Facet counts (live catalogue) for cross-link cards — fetched once.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/facets')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.categories) setFacets(d.categories as FacetEntry[]);
      })
      .catch(() => { /* cross-links simply don't render */ });
    return () => {
      cancelled = true;
    };
  }, []);

  const railLocked = railIndex(rail) >= unlockedCount;

  const loadRail = useCallback(async () => {
    if (railLocked) return;
    setLoading(true);
    setFailed(false);
    setCustomItems([]);
    try {
      const res = await fetch(`/api/news?rail=${encodeURIComponent(rail)}`);
      if (!res.ok) {
        setFailed(true);
        return;
      }
      const data = (await res.json()) as NewsRailEnvelope;
      setEnvelope(data);
      setFeedStatus((prev) => ({ ...prev, ...Object.fromEntries(data.feeds.map((f) => [f.sourceId, f])) }));

      // Pro custom feeds for this rail — merged in when they load.
      const customs = customFeeds.filter((c) => c.rail === rail);
      if (customs.length > 0) {
        const results = await Promise.allSettled(
          customs.map((c) => fetch(`/api/news/preview?url=${encodeURIComponent(c.url)}`).then((r) => (r.ok ? r.json() : null))),
        );
        const extra: NewsItem[] = [];
        for (const r of results) {
          const v = r.status === 'fulfilled' ? r.value : null;
          if (v?.ok) extra.push(...(v.items as NewsItem[]));
        }
        extra.sort((a, b) => (a.publishedAt && b.publishedAt && a.publishedAt < b.publishedAt ? 1 : -1));
        setCustomItems(extra);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rail, railLocked, customFeeds]);

  useEffect(() => {
    void loadRail();
  }, [loadRail, tick]);

  const pickRail = (id: NewsRailId) => {
    if (railIndex(id) >= unlockedCount) {
      if (tier === 'free') {
        router.push('/login?next=/news');
      } else {
        openUpgrade('news-all', { why: 'Unlock every news category — construction, tax, technology and finance.' });
      }
      return;
    }
    setRail(id);
    setOnlySaved(false);
  };

  // Single pipeline: rank (no-op for non-relevant) gives every item its
  // category + match flags for the chips and cross-links.
  const merged: NewsItem[] = useMemo(() => {
    const base = [...(envelope?.items ?? []), ...customItems];
    const seen = new Set<string>();
    return base.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
  }, [envelope, customItems]);

  const relevantOnAllowed = relevantOn && can('news-relevant') && signedIn;
  const ranked = useMemo(
    () => rankNewsFeed(merged, relevantOnAllowed && !signedInCtx.loading ? relevanceCtx : EMPTY_CTX),
    [merged, relevantOnAllowed, signedInCtx.loading, relevanceCtx],
  );

  const display: RelevantNewsItem[] = useMemo(() => {
    if (!onlySaved) return ranked.items;
    return ranked.items.filter((it) => bookmarks.has(it.id));
  }, [ranked, onlySaved, bookmarks]);

  const source = envelope?.source ?? 'live';
  const notice = envelope?.notice;

  return (
    <main className="pb-24">
      <header className="border-b border-line bg-white px-5 pb-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="flex items-center gap-2 text-h2">
              <Newspaper size={22} strokeWidth={1.9} className="text-navy" aria-hidden />
              News
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {bookmarks.count > 0 && (
              <button
                type="button"
                onClick={() => setOnlySaved((v) => !v)}
                aria-pressed={onlySaved}
                className={cn(
                  'flex h-9 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition-colors',
                  onlySaved
                    ? 'border-navy bg-navy text-white'
                    : 'border-line bg-white text-ink-2',
                )}
              >
                <Bookmark size={13} strokeWidth={2.1} fill={onlySaved ? 'currentColor' : 'none'} aria-hidden />
                Saved {bookmarks.count}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSourcesOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3 text-[12.5px] font-semibold text-ink"
            >
              <Rss size={13} strokeWidth={2.1} className="text-open" aria-hidden />
              Sources
            </button>
          </div>
        </div>

        {/* Category rail */}
        <div
          role="tablist"
          aria-label="News categories"
          className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1"
        >
          {NEWS_RAILS.map((r) => {
            const idx = railIndex(r.id);
            const unlocked = idx < unlockedCount;
            const active = rail === r.id;
            if (active && !unlocked) return null; // guard: never sit on a locked rail
            return (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => pickRail(r.id)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] transition-colors',
                  active
                    ? 'border-navy bg-navy font-semibold text-white'
                    : unlocked
                      ? 'border-line bg-white font-medium text-ink-2'
                      : tier === 'free'
                        ? 'border-line bg-canvas font-medium text-ink-3'
                        : 'border-pro-line bg-pro-soft font-semibold text-[#7a610f]',
                )}
              >
                {r.label}
                {!unlocked && (
                  tier === 'free' ? (
                    <Lock size={11} strokeWidth={2.3} aria-hidden />
                  ) : (
                    <Crown size={11} strokeWidth={2.3} aria-hidden />
                  )
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-5 pt-3.5">
        {/* Relevant-to-me control (Pro) — honest count from the v0 signals */}
        {signedIn && (
          <div className="mb-1 rounded-[12px] border border-line bg-white px-3.5 py-2">
            {can('news-relevant') ? (
              <label className="flex cursor-pointer items-center gap-3">
                <Sparkles size={15} strokeWidth={1.9} className="shrink-0 text-ai" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-ink">Relevant to me</span>
                  {relevantOnAllowed ? (
                    <span className="block text-[11.5px] text-ink-3">
                      {signedInCtx.loading
                        ? 'Reading your profile…'
                        : `${ranked.matchedTotal} of ${ranked.total} stories here touch what your business does`}
                    </span>
                  ) : (
                    <span className="block text-[11.5px] text-ink-3">Rank by your profile &amp; preferences</span>
                  )}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={relevantOn}
                  aria-label="Relevant to me"
                  onClick={() => setRelevantOn((v) => !v)}
                  className={cn(
                    'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                    relevantOn ? 'bg-ai' : 'bg-line',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
                      relevantOn ? 'left-[22px]' : 'left-0.5',
                    )}
                  />
                </button>
              </label>
            ) : (
              <button
                type="button"
                onClick={() =>
                  openUpgrade('news-relevant', { why: 'Rank the feed by what your business actually does — categories, provinces and more.' })
                }
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="flex items-center gap-3">
                  <Sparkles size={15} strokeWidth={1.9} className="shrink-0 text-ink-3" aria-hidden />
                  <span>
                    <span className="block text-[13.5px] font-semibold text-ink">Relevant to me</span>
                    <span className="block text-[11.5px] text-ink-3">Pro — re-rank stories for your business</span>
                  </span>
                </span>
                <Crown size={15} strokeWidth={2.2} className="shrink-0 text-[#7a610f]" aria-hidden />
              </button>
            )}
          </div>
        )}

        {/* Honest provenance / outage envelope */}
        {(source === 'error' || source === 'fixture' || failed) && (
          <div
            role="status"
            className={cn(
              'mb-3 flex items-start gap-2.5 rounded-[12px] border px-3 py-2.5',
              source === 'error' ? 'border-urgent/25 bg-urgent-bg' : 'border-soon/25 bg-soon-bg',
            )}
          >
            {source === 'error' ? (
              <WifiOff size={15} strokeWidth={2.1} className="mt-px shrink-0 text-urgent" aria-hidden />
            ) : (
              <AlertTriangle size={15} strokeWidth={2.1} className="mt-px shrink-0 text-soon" aria-hidden />
            )}
            <p className={cn('flex-1 text-[11.5px] leading-[1.45]', source === 'error' ? 'text-ink' : 'text-ink-2')}>
              {failed
                ? 'News is unreachable right now. Check back in a moment.'
                : (notice ?? 'Showing captured stories — live feeds are unreachable right now.')}
            </p>
            <button
              type="button"
              onClick={() => setTick((t) => t + 1)}
              className="shrink-0 text-[11.5px] font-bold text-blue"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !envelope && (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-[14px] border border-line bg-white p-4">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="mt-3 h-4 w-4/5" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Feed */}
        {!loading && display.length === 0 && (
          <EmptyState
            icon={Newspaper}
            title={onlySaved ? 'No saved stories yet' : rail === 'SARS_Tax' ? 'No feed connected yet' : 'No stories right now'}
            description={
              onlySaved
                ? 'Tap the bookmark on any story and it will wait for you here — saved on this device until account sync ships.'
                : rail === 'SARS_Tax'
                  ? "SARS doesn't publish a stable RSS feed yet. With Pro you can connect one as a custom feed."
                  : (notice ?? 'This category is quiet right now — check back soon.')
            }
            actionLabel={rail === 'SARS_Tax' && can('custom-rss') ? 'Open sources' : undefined}
            onAction={rail === 'SARS_Tax' ? () => setAddOpen(true) : undefined}
          />
        )}

        {/* Story cards */}
        {display.length > 0 && (
          <ul className="space-y-3">
            {display.map((item) => (
              <li key={item.id}>
                <NewsCard item={item} facets={facets} />
              </li>
            ))}
          </ul>
        )}

        {source === 'live' && envelope && envelope.feeds.length > 0 && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-3">
            <Database size={12} strokeWidth={2} aria-hidden />
            Live from {envelope.feeds.filter((f) => f.ok).length} SA {envelope.feeds.filter((f) => f.ok).length === 1 ? 'feed' : 'feeds'}
          </p>
        )}

        {/* Guest upsell — honest, below the feed */}
        {!signedIn && !loading && display.length > 0 && (
          <Link
            href="/login?next=/news"
            className="mt-5 flex items-center justify-between rounded-[14px] border border-blue-line bg-blue-soft px-4 py-3.5"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-navy text-white">
                <Bookmark size={16} strokeWidth={1.9} aria-hidden />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-ink">Sign in free</span>
                <span className="block text-[11.5px] text-ink-2">
                  A third news category, bookmarks and alerts for matches
                </span>
              </span>
            </span>
            <ArrowRight size={17} strokeWidth={2.1} className="shrink-0 text-navy" aria-hidden />
          </Link>
        )}
      </div>

      <SourcesSheet
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        onAdd={() => {
          setSourcesOpen(false);
          setAddOpen(true);
        }}
        feedStatus={feedStatus}
        customFeeds={customFeeds}
        onRemoveCustom={(id) => setCustomFeeds((prev) => prev.filter((c) => c.id !== id))}
        rail={rail}
      />

      {addOpen && (
        <AddFeedSheet
          open={addOpen}
          onClose={() => setAddOpen(false)}
          onSave={(feed) => setCustomFeeds((prev) => [...prev, feed])}
          initialRail={rail}
        />
      )}
    </main>
  );
}

/* ---------------- Story card ---------------- */

function NewsCard({ item, facets }: { item: RelevantNewsItem; facets: FacetEntry[] | null }) {
  const cross = item.category ? pickCrossLink(item.category, facets ?? []) : null;
  const def = sourceDef(item.sourceId.split(':')[0]);
  const sourceName = def?.name ?? (item.sourceId.startsWith('custom:') ? item.sourceId.slice(7) : 'Feed');
  return (
    <article className="rounded-[14px] border border-line bg-white px-3.5 py-3">
      <div className="flex items-start gap-3">
        <Link href={`/news/${encodeURIComponent(item.id)}`} className="min-w-0 flex-1">
          <span className="flex items-center gap-2 text-[11px] text-ink-3">
            <span className="font-semibold text-ink-2">{sourceName}</span>
            <span aria-hidden>·</span>
            {item.publishedAt ? formatRelative(item.publishedAt) : 'date not published'}
          </span>
          <h3 className="mt-1.5 text-[15px] font-semibold leading-[20px] tracking-[-0.015em] text-ink">
            {item.title}
          </h3>
          {item.dek && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-[18px] text-ink-2">{item.dek}</p>
          )}
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            {item.matched && (
              <span className="inline-flex items-center gap-1 rounded-[6px] bg-open-bg px-1.5 py-0.5 text-[10.5px] font-bold text-open">
                <Sparkles size={10} strokeWidth={2.4} aria-hidden />
                Matches your profile
              </span>
            )}
          </span>
        </Link>
        <NewsBookmarkButton id={item.id} />
      </div>
      {cross && (
        <Link
          href={`/search?category=${encodeURIComponent(cross.linkName)}`}
          className="mt-2 flex items-center justify-between gap-2 rounded-[10px] bg-blue-soft px-3 py-2"
        >
          <span className="text-[12.5px] font-semibold text-blue">
            {cross.count} open tenders · {item.category}
          </span>
          <ArrowRight size={13} strokeWidth={2.4} className="shrink-0 text-blue" aria-hidden />
        </Link>
      )}
    </article>
  );
}

/* ---------------- Sources sheet ---------------- */

function SourcesSheet({
  open,
  onClose,
  onAdd,
  feedStatus,
  customFeeds,
  onRemoveCustom,
  rail,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: () => void;
  feedStatus: Record<string, NewsFeedStatus>;
  customFeeds: CustomFeed[];
  onRemoveCustom: (id: string) => void;
  rail: NewsRailId;
}) {
  const { can, tier } = useTier();
  const { openUpgrade } = useUpgrade();
  const canCustom = can('custom-rss');

  return (
    <BottomSheet open={open} onClose={onClose} title="Sources">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Curated feeds</h3>
      <ul className="mt-2 divide-y divide-line rounded-[12px] border border-line bg-white px-3.5">
        {NEWS_SOURCES.map((s) => {
          const st = feedStatus[s.id];
          return (
            <li key={s.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  'h-2 w-2 shrink-0 rounded-full',
                  st?.mode === 'live' ? 'bg-open' : st?.mode === 'fixture' ? 'bg-soon' : 'bg-ink-3',
                )}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">{s.name}</span>
                <span className="block truncate text-[11.5px] text-ink-3">{s.note}</span>
              </span>
              <span
                className={cn(
                  'shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold',
                  s.rail === rail ? 'bg-blue-soft text-blue' : 'bg-canvas text-ink-3',
                )}
              >
                {s.rail}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-canvas px-3 py-2.5">
        <Rss size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
        <p className="text-[11.5px] leading-[16px] text-ink-2">
          Feeds marked with an amber dot are showing captured stories — the live feed was
          unreachable at the last check. Custom feeds stay on this device until account sync ships.
        </p>
      </div>

      <div className="mt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Your feeds</h3>
        {customFeeds.length > 0 ? (
          <ul className="mt-2 divide-y divide-line rounded-[12px] border border-line bg-white px-3.5">
            {customFeeds.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{c.title || c.host}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {c.url} · {railDef(c.rail).label}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveCustom(c.id)}
                  aria-label={`Remove ${c.title || c.host}`}
                  className="flex h-8 w-8 items-center justify-center rounded-[8px] text-ink-3 hover:bg-urgent-bg hover:text-urgent"
                >
                  <X size={15} strokeWidth={2.1} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[12px] text-ink-3">No custom feeds yet.</p>
        )}

        {canCustom ? (
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-pro-line bg-pro-soft py-2.5 text-[13px] font-semibold text-[#7a610f]"
          >
            <Plus size={15} strokeWidth={2.2} aria-hidden />
            Add your own RSS feed
          </button>
        ) : (
          <button
            type="button"
            onClick={() => openUpgrade('custom-rss', { why: 'Add any RSS feed — SARS, a municipality, your industry association — straight into the rail.' })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-pro-line bg-pro-soft py-2.5 text-[13px] font-semibold text-[#7a610f]"
          >
            <Crown size={14} strokeWidth={2.2} aria-hidden />
            Custom feeds are Pro
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

/* ---------------- Add-feed sheet (Pro) ---------------- */

function AddFeedSheet({
  open,
  onClose,
  onSave,
  initialRail,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (feed: CustomFeed) => void;
  initialRail: NewsRailId;
}) {
  const { can } = useTier();
  const [url, setUrl] = useState('');
  const [rail, setRail] = useState<NewsRailId>(initialRail);
  const [state, setState] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle');
  const [feedTitle, setFeedTitle] = useState<string | null>(null);
  const [preview, setPreview] = useState<NewsItem[]>([]);
  const [error, setError] = useState('');

  if (!can('custom-rss')) return null;

  const test = async () => {
    if (!url.trim()) return;
    setState('testing');
    setError('');
    try {
      const res = await fetch(`/api/news/preview?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setState('error');
        setError(data.error ?? 'Could not read that feed.');
        return;
      }
      setFeedTitle(data.feedTitle);
      setPreview((data.items as NewsItem[]) ?? []);
      setState('ok');
    } catch {
      setState('error');
      setError('Could not reach that feed from the server.');
    }
  };

  const save = () => {
    let host = '';
    try {
      host = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      host = url;
    }
    onSave({
      id: `cf_${Date.now().toString(36)}`,
      url: url.trim(),
      host,
      title: feedTitle ?? host,
      rail,
    });
    onClose();
    setUrl('');
    setPreview([]);
    setState('idle');
    setRail(initialRail);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Add your own feed">
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Feed URL</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.org/feed.xml"
          className="mt-1.5 h-11 w-full rounded-[12px] border border-line bg-white px-3.5 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-navy"
        />
      </label>

      <div className="mt-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">Show under</span>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {NEWS_RAILS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRail(r.id)}
              className={cn(
                'h-8 rounded-full border px-3 text-[12.5px] font-medium',
                rail === r.id ? 'border-navy bg-navy text-white' : 'border-line bg-white text-ink-2',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {state === 'idle' && (
        <button
          type="button"
          onClick={() => void test()}
          className="mt-4 flex h-[50px] w-full items-center justify-center rounded-md bg-navy text-[15px] font-semibold text-white"
        >
          Test feed
        </button>
      )}

      {state === 'testing' && (
        <p className="mt-4 flex items-center gap-2 text-[13px] text-ink-2">
          <Skeleton className="h-4 w-4 rounded-full" /> Reading the feed…
        </p>
      )}

      {state === 'error' && (
        <div className="mt-4 rounded-[12px] border border-urgent/25 bg-urgent-bg px-3 py-2.5">
          <p className="text-[12.5px] leading-[17px] text-ink">{error}</p>
        </div>
      )}

      {state === 'ok' && (
        <div className="mt-4">
          <div className="flex items-center gap-2 text-open">
            <Check size={15} strokeWidth={2.6} aria-hidden />
            <p className="text-[13px] font-semibold">
              {feedTitle ?? 'Feed works'} — {preview.length} latest {preview.length === 1 ? 'story' : 'stories'}
            </p>
          </div>
          <ul className="mt-2 space-y-2 rounded-[12px] border border-line bg-white px-3 py-2.5">
            {preview.slice(0, 3).map((it) => (
              <li key={it.id} className="flex items-start gap-2 text-[12px] leading-[16px] text-ink-2">
                <ExternalLink size={12} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                <span className="line-clamp-2">{it.title}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={save}
            className="mt-3 flex h-[50px] w-full items-center justify-center rounded-md bg-pro text-[15px] font-bold text-[#3d3205]"
          >
            Add to my feeds
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-3">
            Lives on this device until account sync ships.
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
