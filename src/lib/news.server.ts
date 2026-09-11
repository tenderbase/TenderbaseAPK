import 'server-only';

import { assertPublicFeedTarget, FeedTargetError } from '@/lib/feed-target';
import { parseFeedXml, newsItemId } from '@/lib/news-rss';
import { NEWS_SOURCES, railSources, sourceDef } from '@/lib/news-sources';
import type { NewsFeedStatus, NewsItem, NewsRailEnvelope, NewsRailId } from '@/types/news';

export interface NewsFeedError extends Error {
  code: 'NETWORK_ERROR' | 'HTTP_ERROR' | 'PARSE_ERROR' | 'BLOCKED';
}

function feedError(code: NewsFeedError['code'], message: string): NewsFeedError {
  const e = new Error(message) as NewsFeedError;
  e.code = code;
  return e;
}

export const MAX_FEED_BYTES = 1_500_000;
const MAX_FEED_HOPS = 3;
const FEED_USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8';

async function publicAddresses(hostname: string): Promise<string[]> {
  const { lookup } = await import('node:dns/promises');
  return (await lookup(hostname, { all: true })).map((entry) => entry.address);
}

interface FeedFetchOptions { guardTarget?: boolean; }

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return '';
  const declared = Number(res.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > maxBytes) throw feedError('HTTP_ERROR', `Feed response is too large (${Math.round(declared / 1024)} KB).`);
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel().catch(() => undefined); throw feedError('HTTP_ERROR', 'Feed response is too large to read.'); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function fetchFeedText(url: string, opts: FeedFetchOptions = {}): Promise<string> {
  let current = url;
  const hops = opts.guardTarget ? MAX_FEED_HOPS : 0;
  for (let hop = 0; ; hop++) {
    if (opts.guardTarget) {
      try { await assertPublicFeedTarget(current, publicAddresses); }
      catch (e) {
        if (e instanceof FeedTargetError) {
          if (e.reason === 'NO_ADDRESS') throw feedError('NETWORK_ERROR', 'Feed unreachable.');
          throw feedError('BLOCKED', e.message);
        }
        throw e;
      }
    }
    let res: Response;
    try {
      res = await fetch(current, { signal: AbortSignal.timeout(9_000), headers: { 'user-agent': FEED_USER_AGENT, accept: FEED_ACCEPT }, cache: 'no-store', redirect: opts.guardTarget ? 'manual' : 'follow' });
    } catch (err) {
      const timeout = err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError');
      throw feedError('NETWORK_ERROR', timeout ? 'Feed timed out.' : 'Feed unreachable.');
    }
    if (hops > 0 && res.status >= 300 && res.status < 400) {
      if (hop >= hops) throw feedError('HTTP_ERROR', `Feed redirected too many times (${res.status}).`);
      await res.body?.cancel().catch(() => undefined);
      const location = res.headers.get('location');
      if (!location) throw feedError('HTTP_ERROR', `Feed redirected with no target (${res.status}).`);
      try { current = new URL(location, current).toString(); } catch { throw feedError('HTTP_ERROR', 'Feed sent a malformed redirect.'); }
      continue;
    }
    if (!res.ok) throw feedError('HTTP_ERROR', `Feed responded ${res.status}.`);
    const text = await readCapped(res, MAX_FEED_BYTES);
    if (!text.trim()) throw feedError('PARSE_ERROR', 'Feed body was empty.');
    return text;
  }
}

function toNewsItem(sourceId: string, raw: { title: string; url: string | null; publishedAt: string | null; dek: string }): NewsItem | null {
  if (!raw.url) return null;
  return { id: newsItemId(sourceId, raw.url), sourceId, title: raw.title.slice(0, 300), dek: raw.dek, url: raw.url, publishedAt: raw.publishedAt };
}

export async function fetchCuratedFeedText(rssUrl: string, relay: (target: string) => Promise<string> = defaultRelayFetch): Promise<{ text: string; via: 'direct' | 'relay' }> {
  try { return { text: await fetchFeedText(rssUrl), via: 'direct' }; }
  catch (directErr) {
    const code = (directErr as NewsFeedError)?.code;
    if (code !== 'NETWORK_ERROR' && code !== 'HTTP_ERROR') throw directErr;
    let lastErr = directErr;
    if (code === 'NETWORK_ERROR') {
      await new Promise((resolve) => setTimeout(resolve, 800));
      try { return { text: await fetchFeedText(rssUrl), via: 'direct' }; } catch (e) { lastErr = e; }
    }
    try { return { text: await relay(rssUrl), via: 'relay' }; }
    catch (relayErr) { console.error(`[news] feed direct and relay both failed (direct: ${feedFailureReason(lastErr)}; relay: ${feedFailureReason(relayErr)})`); throw lastErr; }
  }
}

export async function fetchSourceFeed(sourceId: string): Promise<{ feedTitle: string | null; items: NewsItem[] }> {
  const def = sourceDef(sourceId);
  if (!def) throw feedError('PARSE_ERROR', `Unknown source ${sourceId}.`);
  const { text } = await fetchCuratedFeedText(def.rssUrl);
  const parsed = parseFeedXml(text);
  const items: NewsItem[] = [];
  for (const raw of parsed.items) { const it = toNewsItem(sourceId, raw); if (it) items.push(it); }
  return { feedTitle: parsed.title, items };
}

export const FEED_RELAY_TEMPLATE = (process.env.NEWS_FEED_RELAY_URL ?? '').trim();
export function relayFeedUrl(target: string, template: string = FEED_RELAY_TEMPLATE): string | null {
  const clean = template.trim();
  if (!clean || clean.toLowerCase() === 'none' || !clean.includes('{url}')) return null;
  return clean.replace('{url}', encodeURIComponent(target));
}

async function defaultRelayFetch(target: string): Promise<string> {
  const relayUrl = relayFeedUrl(target);
  if (!relayUrl) throw feedError('NETWORK_ERROR', 'Feed relay is not configured.');
  return fetchFeedText(relayUrl);
}

function feedFailureReason(e: unknown): string {
  const err = e as Partial<NewsFeedError> | null;
  const message = err?.message ?? '';
  switch (err?.code) {
    case 'NETWORK_ERROR': return /timed out/i.test(message) ? 'timed out' : 'network error';
    case 'HTTP_ERROR': { const status = /(\d{3})/.exec(message)?.[1]; return status ? `HTTP ${status}` : 'HTTP error'; }
    case 'PARSE_ERROR': return 'the response was not a parseable feed';
    case 'BLOCKED': return 'the address was refused by our fetch policy';
    default: return 'unknown error';
  }
}

interface CachedSource { at: number; value: { items: NewsItem[]; feed: NewsFeedStatus; notice?: string }; }
const feedCache = new Map<string, CachedSource>();
const FEED_TTL_MS = 5 * 60 * 1000;
const FEED_ERROR_TTL_MS = 30 * 1000;
export function __feedCacheForTests(): Map<string, CachedSource> { return feedCache; }

export async function getSourceFeed(sourceId: string, fetcher: (id: string) => Promise<{ feedTitle: string | null; items: NewsItem[] }> = fetchSourceFeed): Promise<{ items: NewsItem[]; feed: NewsFeedStatus; notice?: string }> {
  const hit = feedCache.get(sourceId);
  if (hit && Date.now() - hit.at < (hit.value.feed.ok ? FEED_TTL_MS : FEED_ERROR_TTL_MS)) return hit.value;
  const def = sourceDef(sourceId);
  const name = def?.name ?? sourceId;
  if (!def && fetcher === fetchSourceFeed) throw feedError('PARSE_ERROR', `Unknown source ${sourceId}.`);
  try {
    const live = await fetcher(sourceId);
    const items = live.items;
    const value = { items, feed: { sourceId, name, ok: true, mode: 'live' as const, itemCount: items.length } };
    feedCache.set(sourceId, { at: Date.now(), value });
    return value;
  } catch (e) {
    const value = { items: [], feed: { sourceId, name, ok: false, mode: 'error' as const, itemCount: 0 }, notice: `${name}: the feed is unreachable right now (${feedFailureReason(e)}).` };
    feedCache.set(sourceId, { at: Date.now(), value });
    return value;
  }
}

export async function getNewsRail(rail: NewsRailId): Promise<NewsRailEnvelope> {
  const settled = await Promise.all(railSources(rail).map((s) => getSourceFeed(s.id)));
  const items: NewsItem[] = [];
  const feeds: NewsFeedStatus[] = [];
  const notes: string[] = [];
  for (const src of settled) { items.push(...src.items); feeds.push(src.feed); if (src.notice) notes.push(src.notice); }
  items.sort((a, b) => { if (a.publishedAt === b.publishedAt) return 0; if (!a.publishedAt) return 1; if (!b.publishedAt) return -1; return a.publishedAt < b.publishedAt ? 1 : -1; });
  const allError = feeds.length > 0 && feeds.every((f) => f.mode === 'error');
  return { rail, items: items.slice(0, 40), total: items.length, source: allError ? 'error' : 'live', notice: notes.length ? notes.join(' ') : undefined, feeds };
}

export async function getNewsItemById(id: string): Promise<{ item: NewsItem; sourceName: string; sourceHomepage: string } | null> {
  const [sourceId] = id.split(':');
  const def = sourceDef(sourceId);
  if (!def) return null;
  const { items } = await getSourceFeed(sourceId);
  const item = items.find((it) => it.id === id);
  return item ? { item, sourceName: def.name, sourceHomepage: def.homepage } : null;
}

export async function previewFeed(url: string): Promise<{ feedTitle: string | null; items: NewsItem[] }> {
  const text = await fetchFeedText(url, { guardTarget: true });
  const host = new URL(url).hostname;
  const parsed = parseFeedXml(text);
  const items: NewsItem[] = [];
  for (const raw of parsed.items.slice(0, 8)) { const it = toNewsItem(`custom:${host}`, raw); if (it) items.push(it); }
  if (!items.length) throw feedError('PARSE_ERROR', 'No stories found — is this an RSS or Atom feed?');
  return { feedTitle: parsed.title, items };
}

export const NEWS_SOURCE_LIST = NEWS_SOURCES;
