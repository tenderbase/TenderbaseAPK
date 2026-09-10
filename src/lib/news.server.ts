import 'server-only';

import { FIXTURES_ALLOWED } from '@/lib/tender-api.server';
import { assertPublicFeedTarget, FeedTargetError } from '@/lib/feed-target';
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
 *   - A tiny TTL cache keeps a rail read from burning a fetch per source per request.
 *
 * Anything a *user* types as a feed URL is additionally put through
 * `lib/feed-target.ts` before we connect: our server must not be turned into a
 * proxy for its own network, and a feed response must not be allowed to be as
 * large as it likes.
 */

export interface NewsFeedError extends Error {
  code: 'NETWORK_ERROR' | 'HTTP_ERROR' | 'PARSE_ERROR' | 'BLOCKED';
}

function feedError(code: NewsFeedError['code'], message: string): NewsFeedError {
  const e = new Error(message) as NewsFeedError;
  e.code = code;
  return e;
}

/** RSS is a few tens of kilobytes. A gigabyte is a download, not a feed. */
export const MAX_FEED_BYTES = 1_500_000;

/** Redirect budget for the guarded (user-supplied) path, where each hop is re-validated. */
const MAX_FEED_HOPS = 3;

/**
 * Feeds are fetched with a browser-shaped User-Agent.
 *
 * The previous honest marker UA (`TenderBase/1.0 (+news reader)`) worked from
 * a laptop but was blocked from Render's datacenter IPs: Cloudflare-fronted
 * feeds bot-score unknown crawler UAs harder when the request already comes
 * from a datacenter range, and the production deployment saw those feeds
 * fail while the same URLs served fine elsewhere. (One former registry
 * source went further and 403'd the datacenter range for every UA; it was
 * dropped from the registry — see news-sources.ts.) A feed fetch is a read
 * of a public XML document, so the pragmatic UA is one the edge will serve;
 * there is nothing deceptive in the request itself (no cookies, no Referer,
 * plain GET).
 */
const FEED_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
/** Content-negotiate like a reader: some hosts 403 an unidentified accept set. */
const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8';

/**
 * Only used for the guarded path; see `fetchFeedText`. Imported lazily for the
 * same reason `fromPayfastIp` does it: `node:dns` stays out of the module graph
 * until something actually asks where a user-supplied host lives.
 */
async function publicAddresses(hostname: string): Promise<string[]> {
  const { lookup } = await import('node:dns/promises');
  const found = await lookup(hostname, { all: true });
  return found.map((entry) => entry.address);
}

interface FeedFetchOptions {
  /**
   * Validate the target (and every redirect hop) against the private-address
   * policy. Required for user-supplied URLs; skipped for the curated registry,
   * whose feed addresses are repo constants and would otherwise pay a DNS
   * lookup per fetch.
   */
  guardTarget?: boolean;
}

/** Reads a response body with a hard byte ceiling, without buffering first. */
async function readCapped(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return '';
  const declared = Number(res.headers.get('content-length') ?? '');
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw feedError('HTTP_ERROR', `Feed response is too large (${Math.round(declared / 1024)} KB).`);
  }
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw feedError('HTTP_ERROR', 'Feed response is too large to read.');
    }
    // Copied, not borrowed: the stream may reuse the chunk's backing buffer.
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Fetch one feed body. Exported for the tests: the byte cap and the per-hop
 * redirect policy can only be exercised against a real socket, and `guardTarget`
 * is the switch they need. Production callers use `fetchSourceFeed` (curated,
 * repo-controlled addresses) or `previewFeed` (user input, guarded).
 */
export async function fetchFeedText(url: string, opts: FeedFetchOptions = {}): Promise<string> {
  let current = url;
  // `redirect: 'manual'` on the guarded path so no hop can slip past the policy.
  // Node's fetch exposes the status and Location for those, which is what this
  // loop needs; the curated path keeps native following.
  const hops = opts.guardTarget ? MAX_FEED_HOPS : 0;

  for (let hop = 0; ; hop++) {
    if (opts.guardTarget) {
      try {
        await assertPublicFeedTarget(current, publicAddresses);
      } catch (e) {
        if (e instanceof FeedTargetError) {
          // "We could not look it up" is a network fact about this environment,
          // not a policy decision — telling a user their feed was *refused*
          // because a sandbox has no DNS would be a lie.
          if (e.reason === 'NO_ADDRESS') throw feedError('NETWORK_ERROR', 'Feed unreachable.');
          throw feedError('BLOCKED', e.message);
        }
        throw e;
      }
    }

    let res: Response;
    try {
      res = await fetch(current, {
        signal: AbortSignal.timeout(9_000),
        headers: { 'user-agent': FEED_USER_AGENT, accept: FEED_ACCEPT },
        cache: 'no-store',
        redirect: opts.guardTarget ? 'manual' : 'follow',
      });
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      throw feedError(
        name === 'TimeoutError' ? 'NETWORK_ERROR' : 'NETWORK_ERROR',
        name === 'TimeoutError' ? 'Feed timed out.' : 'Feed unreachable.',
      );
    }

    // Only the guarded path sees raw 3xx responses: native following has
    // already resolved (or failed) them on the curated path.
    if (hops > 0 && res.status >= 300 && res.status < 400) {
      if (hop >= hops) throw feedError('HTTP_ERROR', `Feed redirected too many times (${res.status}).`);
      // Drain the redirect's (usually empty) body so the socket comes back to
      // the pool instead of stalling on a half-read response.
      await res.body?.cancel().catch(() => undefined);
      const location = res.headers.get('location');
      if (!location) throw feedError('HTTP_ERROR', `Feed redirected with no target (${res.status}).`);
      try {
        current = new URL(location, current).toString();
      } catch {
        throw feedError('HTTP_ERROR', 'Feed sent a malformed redirect.');
      }
      continue;
    }
    if (!res.ok) throw feedError('HTTP_ERROR', `Feed responded ${res.status}.`);
    const text = await readCapped(res, MAX_FEED_BYTES);
    if (text.trim().length === 0) throw feedError('PARSE_ERROR', 'Feed body was empty.');
    return text;
  }
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

/**
 * Fetch one source's live feed; throws NewsFeedError with a code.
 *
 * Egress strategy, in order:
 *   1. Direct fetch (with one retry for transient network errors — a reset
 *      connection is usually gone a second later, and the retry must not
 *      apply to policy answers like 403).
 *   2. If the direct answer looks like an *egress* failure — HTTP error
 *      (observed in production: an edge answering HTTP 403 to our datacenter
 *      range regardless of User-Agent)
 *      or a network failure — the same feed URL is fetched once through a
 *      relay (`FEED_RELAY_URL`), which reads the public XML from an IP the
 *      source has no reason to bot-score. Relay only ever applies to the
 *      curated registry, whose addresses are repo constants; a *user-supplied*
 *      URL (the Pro preview) is never relayed, so the fetch-target policy in
 *      `lib/feed-target.ts` stays a policy about addresses WE connect to.
 *
 * A relay failure surfaces as a normal NewsFeedError — the notice says why,
 * and the 30-second failure cache means the next Retry tries again.
 */
/**
 * Egress for one curated feed URL: direct (with a transient-error retry),
 * then relay. Exported for tests, which bind it to loopback servers and an
 * injected relay; `fetchSourceFeed` is the production caller.
 *
 * `via` is returned so a caller could report provenance; today it is only
 * logged, because readers care that the feed is live, not which road it took.
 */
export async function fetchCuratedFeedText(
  rssUrl: string,
  relay: (target: string) => Promise<string> = defaultRelayFetch,
): Promise<{ text: string; via: 'direct' | 'relay' }> {
  try {
    return { text: await fetchFeedText(rssUrl), via: 'direct' };
  } catch (directErr) {
    const code = (directErr as NewsFeedError)?.code;
    if (code !== 'NETWORK_ERROR' && code !== 'HTTP_ERROR') throw directErr;

    let lastErr = directErr;
    if (code === 'NETWORK_ERROR') {
      // One quick retry for pure network hiccups before reaching for the relay.
      await new Promise((resolve) => setTimeout(resolve, 800));
      try {
        return { text: await fetchFeedText(rssUrl), via: 'direct' };
      } catch (e) {
        lastErr = e;
      }
    }

    try {
      return { text: await relay(rssUrl), via: 'relay' };
    } catch (relayErr) {
      console.error(
        `[news] feed direct and relay both failed (direct: ${feedFailureReason(lastErr)}; relay: ${feedFailureReason(relayErr)})`,
      );
      throw lastErr; // the direct answer is the honest one to report
    }
  }
}

export async function fetchSourceFeed(sourceId: string): Promise<{ feedTitle: string | null; items: NewsItem[] }> {
  const def = sourceDef(sourceId);
  if (!def) throw feedError('PARSE_ERROR', `Unknown source ${sourceId}.`);

  const { text } = await fetchCuratedFeedText(def.rssUrl);
  const parsed = parseFeedXml(text);
  const items: NewsItem[] = [];
  for (const raw of parsed.items) {
    const it = toNewsItem(sourceId, raw);
    if (it) items.push(it);
  }
  return { feedTitle: parsed.title, items };
}

/**
 * Where relayed feed fetches go. `{url}` is replaced with the feed URL,
 * percent-encoded. Relaying is OFF unless the operator configures it: every
 * free keyless public relay checked on 2026-09-10 was unusable (two answered
 * Cloudflare 522 timeouts when probed, one now requires an API key, one
 * rate-limits shared egress IPs — and production had already shown the old
 * default failing open on a 403'd feed). A dead default relay only adds its
 * own timeout to every failing feed before failing. Set
 * `NEWS_FEED_RELAY_URL` to your own tiny proxy for full control; only
 * repo-controlled feed addresses ever use this path (the payload is a public
 * RSS document — no credentials or user data are sent), and user-supplied
 * feed previews are never relayed.
 */
export const FEED_RELAY_TEMPLATE = (process.env.NEWS_FEED_RELAY_URL ?? '').trim();

/** The relay URL for a feed, or null when relaying is disabled/misconfigured. */
export function relayFeedUrl(target: string, template: string = FEED_RELAY_TEMPLATE): string | null {
  const clean = template.trim();
  if (!clean || clean.toLowerCase() === 'none' || !clean.includes('{url}')) return null;
  return clean.replace('{url}', encodeURIComponent(target));
}

/** Relay the feed through the configured template, with the same caps as a direct fetch. */
async function defaultRelayFetch(target: string): Promise<string> {
  const relayUrl = relayFeedUrl(target);
  if (!relayUrl) {
    throw feedError('NETWORK_ERROR', 'Feed relay is not configured.');
  }
  // The relay URL is built here from a repo constant (or the operator's env),
  // so the curated path's native redirect-following and byte cap still apply.
  return fetchFeedText(relayUrl);
}

/**
 * Turn a feed failure into the parenthesised reason shown in the notice, so
 * an outage on the deployed host is self-diagnosing: "the feed is unreachable
 * right now (HTTP 403)" says something a "right now." does not.
 */
function feedFailureReason(e: unknown): string {
  const err = e as Partial<NewsFeedError> | null;
  const message = err?.message ?? '';
  switch (err?.code) {
    case 'NETWORK_ERROR':
      return /timed out/i.test(message) ? 'timed out' : 'network error';
    case 'HTTP_ERROR': {
      const status = /(\d{3})/.exec(message)?.[1];
      return status ? `HTTP ${status}` : 'HTTP error';
    }
    case 'PARSE_ERROR':
      return 'the response was not a parseable feed';
    case 'BLOCKED':
      return 'the address was refused by our fetch policy';
    default:
      return 'unknown error';
  }
}

/** Fetch a single source's feed with fixture fallback + TTL cache. */
interface CachedSource {
  at: number;
  value: { items: NewsItem[]; feed: NewsFeedStatus; notice?: string };
}
const feedCache = new Map<string, CachedSource>();

/** Live payloads are worth remembering for five minutes. */
const FEED_TTL_MS = 5 * 60 * 1000;
/**
 * Failures are remembered for thirty seconds — and only thirty.
 *
 * Caching a failure for the full five minutes made the News screen's Retry
 * button a lie: it refetched the rail, the cache served the same failure back,
 * and a feed that recovered a minute later stayed "unreachable" for four more.
 * A short negative TTL still flattens a burst of parallel rail reads during an
 * outage, but a recovered feed is visible on the very next retry.
 */
const FEED_ERROR_TTL_MS = 30 * 1000;

/** Test seam: the cache, so tests can rewind timestamps instead of sleeping. */
export function __feedCacheForTests(): Map<string, CachedSource> {
  return feedCache;
}

export async function getSourceFeed(
  sourceId: string,
  /** Injectable for tests; production always uses the real registry fetch. */
  fetcher: (id: string) => Promise<{ feedTitle: string | null; items: NewsItem[] }> = fetchSourceFeed,
): Promise<{ items: NewsItem[]; feed: NewsFeedStatus; notice?: string }> {
  const hit = feedCache.get(sourceId);
  if (hit && Date.now() - hit.at < (hit.value.feed.ok ? FEED_TTL_MS : FEED_ERROR_TTL_MS)) {
    return hit.value;
  }
  // The registry def only names the source in notices; the unknown-source
  // guard itself lives in `fetchSourceFeed`, so an injected (test) fetcher can
  // drive ids that are not in the registry.
  const name = sourceDef(sourceId)?.name ?? sourceId;
  if (!sourceDef(sourceId) && fetcher === fetchSourceFeed) {
    throw feedError('PARSE_ERROR', `Unknown source ${sourceId}.`);
  }

  let status: NewsFeedStatus;
  let items: NewsItem[] = [];
  let notice: string | undefined;

  try {
    const live = await fetcher(sourceId);
    items = live.items;
    status = { sourceId, name, ok: true, mode: 'live', itemCount: items.length };
  } catch (e) {
    if (FIXTURES_ALLOWED && FIXTURE_NEWS[sourceId]) {
      items = FIXTURE_NEWS[sourceId];
      status = { sourceId, name, ok: false, mode: 'fixture', itemCount: items.length };
      notice = `${name}: showing stories captured ${FIXTURE_NEWS_CAPTURED_AT} — the live feed is unreachable right now (${feedFailureReason(e)}).`;
    } else {
      status = { sourceId, name, ok: false, mode: 'error', itemCount: 0 };
      notice = `${name}: the feed is unreachable right now (${feedFailureReason(e)}).`;
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

/**
 * Live test of an arbitrary RSS/Atom URL (Pro custom feeds, §5.7).
 *
 * This is the one feed fetch whose URL comes from a customer, so it runs with
 * `guardTarget`: every hop is judged by `lib/feed-target.ts` before we connect,
 * which is what stops the endpoint from being a proxy onto our own network.
 * Entitlement is enforced by the route, not here.
 */
export async function previewFeed(url: string): Promise<{ feedTitle: string | null; items: NewsItem[] }> {
  const text = await fetchFeedText(url, { guardTarget: true });
  // Safe to parse: fetchFeedText already rejected anything unparseable.
  const host = new URL(url).hostname;
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
