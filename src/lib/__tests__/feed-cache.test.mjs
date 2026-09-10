/**
 * The feed cache's TTL policy — the fix for the "Retry button that lied".
 *
 * Successes were always worth a five-minute cache. Failures were cached for
 * the same five minutes, which meant the News screen's Retry refetched the
 * rail and was handed the *same* failure straight back: a feed that recovered
 * a minute after an outage stayed "unreachable" for four more. Failures now
 * expire in thirty seconds; these tests rewind the cache clock (no sleeping)
 * to prove the asymmetry.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { getSourceFeed, __feedCacheForTests } from '@/lib/news.server';
import { FIXTURE_NEWS } from '@/lib/fixtures/news';

const okItem = (sourceId, n) => ({
  id: `${sourceId}-${n}`,
  sourceId,
  title: `Story ${n}`,
  dek: '',
  url: `https://example.com/${sourceId}/${n}`,
  publishedAt: '2026-09-10T08:00:00Z',
});

test('a successful feed is served from cache on the immediate next read', async () => {
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return { feedTitle: 'Registry', items: [okItem('sanews-cache', 1)] };
  };

  const first = await getSourceFeed('sanews-cache', fetcher);
  const second = await getSourceFeed('sanews-cache', fetcher);

  assert.equal(first.feed.mode, 'live');
  assert.equal(calls, 1, 'the second read within the TTL hits the cache, not the network');
  assert.deepEqual(second.items, first.items);
});

test('a failed feed is NOT sticky — it is refetched after the short error TTL', async (t) => {
  const sourceId = 'businesstech-cachetest';
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    const e = new Error('Feed responded 403.');
    e.code = 'HTTP_ERROR';
    throw e;
  };

  const first = await getSourceFeed(sourceId, fetcher);
  // Under test the registry sources fall back to captured fixtures; a fake
  // sourceId has none, so the honest error branch is what we get.
  assert.equal(first.feed.mode, 'error', 'no fixture exists for a made-up source id');
  assert.match(first.notice ?? '', /HTTP 403/, 'the notice says WHY, not just that it failed');

  // Rewind the cache entry past the *error* TTL (30s). If failures were still
  // cached for five minutes like successes, this read would be served from
  // cache and the call count would stay at 1.
  const cache = __feedCacheForTests();
  const entry = cache.get(sourceId);
  assert.ok(entry, 'the failure was cached (short TTL), not uncached');
  entry.at -= 31_000;

  await getSourceFeed(sourceId, fetcher);
  assert.equal(calls, 2, 'a 30s-old failure is re-fetched — Retry can mean it');
  assert.equal(FIXTURE_NEWS['businesstech'].length > 0, true, 'registry sources do carry fixtures (fixture branch stays distinct)');
});

test('the error notice carries the failure reason for each error class', async () => {
  const cases = [
    [{ code: 'HTTP_ERROR', message: 'Feed responded 403.' }, /HTTP 403/],
    [{ code: 'NETWORK_ERROR', message: 'Feed timed out.' }, /timed out/],
    [{ code: 'NETWORK_ERROR', message: 'Feed unreachable.' }, /network error/],
    [{ code: 'PARSE_ERROR', message: 'not xml' }, /not a parseable feed/],
  ];
  let n = 0;
  for (const [err, pattern] of cases) {
    n += 1;
    const sourceId = `reason-${n}`;
    const result = await getSourceFeed(sourceId, async () => {
      throw Object.assign(new Error(err.message), { code: err.code });
    });
    assert.match(result.notice ?? '', pattern, `reason for ${err.code} shows in the notice`);
  }
});
