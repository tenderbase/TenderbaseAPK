/**
 * The curated-feed egress ladder: direct first, relay when the source's edge
 * refuses our datacenter IP.
 *
 * Production incident this locks in: BusinessTech's edge answers Render's
 * egress IP with 403 no matter what User-Agent the request carries, so the
 * direct fetch is dead on arrival from the deployed host. The relay reads the
 * same public XML from a neutral IP. Relaying is deliberately limited to
 * curated registry feeds (repo-controlled addresses); the guarded
 * user-supplied path never relays, so the fetch-target policy keeps meaning
 * "addresses WE connect to".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from 'node:http';

import { fetchCuratedFeedText, relayFeedUrl } from '@/lib/news.server';

const FEED = `<?xml version="1.0"?><rss><channel><title>T</title>
<item><title>One</title><link>https://example.com/one</link></item>
</channel></rss>`;

async function loopback(t, handler) {
  const requests = { count: 0 };
  const server = createServer((req, res) => {
    requests.count += 1;
    handler(req, res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { base: `http://127.0.0.1:${port}`, requests };
}

test('relayFeedUrl percent-encodes the target into the template', () => {
  const url = relayFeedUrl('https://businesstech.co.za/news/feed/?a=1&b=2', 'https://relay.example/raw?url={url}');
  assert.equal(url, 'https://relay.example/raw?url=https%3A%2F%2Fbusinesstech.co.za%2Fnews%2Ffeed%2F%3Fa%3D1%26b%3D2');
});

test("'none' or a template without {url} disables the relay", () => {
  assert.equal(relayFeedUrl('https://x/feed', 'none'), null);
  assert.equal(relayFeedUrl('https://x/feed', 'NONE'), null);
  assert.equal(relayFeedUrl('https://x/feed', 'https://relay.example/no-placeholder'), null);
  assert.equal(relayFeedUrl('https://x/feed', ''), null);
});

test('a 403 edge falls through to the relay and the feed still parses', async (t) => {
  const { base, requests } = await loopback(t, (_req, res) => {
    res.writeHead(403, { 'content-type': 'text/html' });
    res.end('<html>blocked</html>');
  });

  const relayedTo = [];
  const { text, via } = await fetchCuratedFeedText(`${base}/feed`, async (target) => {
    relayedTo.push(target);
    return FEED;
  });

  assert.equal(via, 'relay');
  assert.equal(text, FEED);
  assert.deepEqual(relayedTo, [`${base}/feed`], 'the relay gets the ORIGINAL feed URL, not the blocked host');
  assert.equal(requests.count, 1, 'an HTTP answer is not retried direct — it goes straight to the relay');
});

test('a transient network error retries direct before trying the relay', async (t) => {
  let state = 0;
  const { base, requests } = await loopback(t, (_req, res) => {
    state += 1;
    if (state === 1) {
      res.socket?.destroy();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/xml' });
    res.end(FEED);
  });

  let relayCalls = 0;
  const { via } = await fetchCuratedFeedText(`${base}/feed`, async () => {
    relayCalls += 1;
    return FEED;
  });

  assert.equal(via, 'direct', 'the retry recovered — the relay never needed to fire');
  assert.equal(relayCalls, 0);
  assert.ok(requests.count >= 2);
});

test('when direct and relay both fail, the DIRECT error is the one reported', async (t) => {
  const { base } = await loopback(t, (_req, res) => {
    res.writeHead(403, { 'content-type': 'text/html' });
    res.end('<html>blocked</html>');
  });

  await assert.rejects(
    fetchCuratedFeedText(`${base}/feed`, async () => {
      const e = new Error('Feed responded 502.');
      e.code = 'HTTP_ERROR';
      throw e;
    }),
    (e) => {
      assert.match(e.message, /403/, 'the direct 403 is surfaced, not the relay-side noise');
      assert.equal(e.code, 'HTTP_ERROR');
      return true;
    },
  );
});

test('a PARSE_ERROR (empty 200 body) does not waste a relay round-trip', async (t) => {
  const { base, requests } = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/xml' });
    res.end(''); // the same junk through a relay would still be junk
  });

  let relayCalls = 0;
  await assert.rejects(
    fetchCuratedFeedText(`${base}/feed`, async () => {
      relayCalls += 1;
      return FEED;
    }),
    (e) => {
      assert.equal(e.code, 'PARSE_ERROR');
      return true;
    },
  );
  assert.equal(relayCalls, 0, 'only egress failures (network/HTTP) earn a relay attempt');
  assert.equal(requests.count, 1);
});
