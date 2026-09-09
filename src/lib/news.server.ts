import 'server-only';

import { FIXTURES_ALLOWED } from '@/lib/tender-api.server';
import { FIXTURE_NEWS, FIXTURE_NEWS_CAPTURED_AT } from '@/lib/fixtures/news';
import { parseFeedXml, newsItemId } from '@/lib/news-rss';
import { NEWS_SOURCES, railSources, sourceDef } from '@/lib/news-sources';
import type { NewsFeedStatus, NewsItem, NewsRailEnvelope, NewsRailId } from '@/types/news';

/**
 * News feeds, server side. Mirrors the tenders data policy:
 *   - Live fetch of each curated source's RSS/Atom feed (with timeout).
 *   - `FIXTURES_ALLOWED` (dev/test): captured-real fallback per source when
 *     a feed is unreachable, labelled with the capture date.
 *   - Production: a feed outage is a red error envelope — fixtures can
 *     never render there.
 *   - A tiny TTL cache keeps a rail read from burning 5 fetches per request.
 */

export interface NewsFeedError extends Error {
  code: 'NETWORK_ERROR' | 'HTTP_ERROR' | 'PARSE_ERROR';
}

function feedError(code: NewsFeedError['code'], message: string): NewsFeedError {
  const e = new Error(message) as NewsFeedError;
  e.code = code;
  return e;
}

async function fetchFeedText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(9_000),
      headers: { 'user-agent': 'TenderBase/1.0 (+news reader)' },
      cache: 'no-store',
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : '';
    throw feedError(
      name === 'TimeoutError' ? 'NETWORK_ERROR' : 'NETWORK_ERROR',
      name === 'TimeoutError' ? 'Feed timed out.' : 'Feed unreachable.',
    );
  }
  if (!res.ok) throw feedError('HTTP_ERROR', `Feed responded ${res.status}.`);
  const text = await res.text();
  if (text.trim().length === 0) throw feedError('PARSE_ERROR', 'Feed body was empty.');
  return text;
}

function toNewsItem(sourceId: string, raw: { title: string; url: string | null; publishedAt: string | null; dek: string }): NewsItem | null {
  if (!raw.url) return null;
  return {
    id: newsItemId(sourceId, raw.url),
    sourceId,
    title: raw.title.slice(0, 300),
    dek: raw.dek,
    url: raw.url,
    publishedAt: raw.publishedAt,
  };
}

/** Fetch one source's live feed; throws NewsFeedError with a code. */
export async function fetchSourceFeed(sourceId: string): Promise<{ feedTitle: string | null; items: NewsItem[] }> {
  const def = sourceDef(sourceId);
  if (!def) throw feedError('PARSE_ERROR', `Unknown source ${sourceId}.`);
  const text = await fetchFeedText(def.rssUrl);
  const parsed = parseFeedXml(text);
  const items: NewsItem[] = [];
  for (const raw of parsed.items) {
    const it = toNewsItem(sourceId, raw);
    if (it) items.push(it);
  }
  return { feedTitle: parsed.title, items };
}

/** Fetch a single source's feed with fixture fallback + 5-minute cache. */
interface CachedSource {
  at: number;
  value: { items: NewsItem[]; feed: NewsFeedStatus; notice?: string };
}
const feedCache = new Map<string, CachedSource>();
const FEED_TTL_MS = 5 * 60 * 1000;

export async function getSourceFeed(
  sourceId: string,
): Promise<{ items: NewsItem[]; feed: NewsFeedStatus; notice?: string }> {
  const hit = feedCache.get(sourceId);
  if (hit && Date.now() - hit.at < FEED_TTL_MS) return hit.value;
  const def = sourceDef(sourceId);
  if (!def) throw feedError('PARSE_ERROR', `Unknown source ${sourceId}.`);

  let status: NewsFeedStatus;
  let items: NewsItem[] = [];
  let notice: string | undefined;

  try {
    const live = await fetchSourceFeed(sourceId);
    items = live.items;
    status = { sourceId, name: def.name, ok: true, mode: 'live', itemCount: items.length };
  } catch {
    if (FIXTURES_ALLOWED && FIXTURE_NEWS[sourceId]) {
      items = FIXTURE_NEWS[sourceId];
      status = { sourceId, name: def.name, ok: false, mode: 'fixture', itemCount: items.length };
      notice = `${def.name}: showing stories captured ${FIXTURE_NEWS_CAPTURED_AT} — the live feed is unreachable right now.`;
    } else {
      status = { sourceId, name: def.name, ok: false, mode: 'error', itemCount: 0 };
      notice = `${def.name}: the feed is unreachable right now.`;
    }
  }

  const value = { items, feed: status, notice };
  feedCache.set(sourceId, { at: Date.now(), value });
  return value;
}

/** Rail = its sources' items merged newest-first, with an honest envelope. */
export async function getNewsRail(rail: NewsRailId): Promise<NewsRailEnvelope> {
  const sources = railSources(rail);

  const settled = await Promise.all(sources.map((s) => getSourceFeed(s.id)));
  const items: NewsItem[] = [];
  const feeds: NewsFeedStatus[] = [];
  const notes: string[] = [];

  let anyLive = false;
  for (const { items: srcItems, feed, notice } of settled) {
    items.push(...srcItems);
    feeds.push(feed);
    if (feed.mode === 'live') anyLive = true;
    if (notice) notes.push(notice);
  }

  items.sort((a, b) => {
    if (a.publishedAt === b.publishedAt) return 0;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return a.publishedAt < b.publishedAt ? 1 : -1;
  });

  const allError = feeds.length > 0 && feeds.every((f) => f.mode === 'error');
  const allFixture = feeds.length > 0 && feeds.every((f) => f.mode === 'fixture');
  const noFeed = feeds.length === 0;

  return {
    rail,
    items: items.slice(0, 40),
    total: items.length,
    source: allError ? 'error' : allFixture || noFeed ? 'fixture' : 'live',
    notice:
      noFeed
        ? 'No feed is connected to this category yet — Pro can wire one with a custom feed.'
        : notes.length > 0
          ? notes.join(' ')
          : undefined,
    feeds,
  };
}

/** Look up one story by id across every curated feed (for the reader). */
export async function getNewsItemById(id: string): Promise<{ item: NewsItem; sourceName: string; sourceHomepage: string } | null> {
  const [sourceId] = id.split(':');
  if (!sourceDef(sourceId)) return null;
  const { items } = await getSourceFeed(sourceId);
  const item = items.find((it) => it.id === id);
  if (!item) return null;
  const def = sourceDef(sourceId)!;
  return { item, sourceName: def.name, sourceHomepage: def.homepage };
}

/** Live test of an arbitrary RSS/Atom URL (Pro custom feeds, §5.7). */
export async function previewFeed(url: string): Promise<{ feedTitle: string | null; items: NewsItem[] }> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw feedError('PARSE_ERROR', 'That is not a valid URL.');
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw feedError('PARSE_ERROR', 'Only http(s) feeds are supported.');
  }
  const host = parsedUrl.hostname;
  const text = await fetchFeedText(url);
  const parsed = parseFeedXml(text);
  const items: NewsItem[] = [];
  for (const raw of parsed.items.slice(0, 8)) {
    const it = toNewsItem(`custom:${host}`, raw);
    if (it) items.push(it);
  }
  if (items.length === 0) throw feedError('PARSE_ERROR', 'No stories found — is this an RSS or Atom feed?');
  return { feedTitle: parsed.title, items };
}

export const NEWS_SOURCE_LIST = NEWS_SOURCES;
