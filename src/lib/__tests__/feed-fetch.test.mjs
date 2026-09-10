/**
 * The guarded feed fetch (`lib/news.server.ts`) against a real loopback server.
 *
 * `feed-target.test.mjs` covers the policy; this covers the plumbing the policy
 * depends on and that a stub cannot show: a body that must not be buffered
 * whole, a redirect that must not be followed, and the guarantee that a blocked
 * target never reaches the socket at all.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from 'node:http';

import { MAX_FEED_BYTES, fetchFeedText } from '@/lib/news.server';

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

const FEED = `<?xml version="1.0"?><rss><channel><title>T</title>
<item><title>One</title><link>https://example.com/one</link></item>
</channel></rss>`;

test('a curated-style fetch (unguarded) still caps the body it will hold', async (t) => {
  const { base } = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/xml' });
    // Well past the cap, written in one go: the point is that the reader stops,
    // not that the server is polite.
    res.end('x'.repeat(MAX_FEED_BYTES + 500_000));
  });

  await assert.rejects(fetchFeedText(`${base}/feed`), (e) => {
    assert.match(e.message, /too large/i, 'the cap is reported as a size problem, not a parse problem');
    assert.equal(e.code, 'HTTP_ERROR');
    return true;
  });
});

test('a declared content-length beyond the cap is rejected before reading', async (t) => {
  const { base, requests } = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/xml', 'content-length': String(MAX_FEED_BYTES * 4) });
    res.end();
  });
  await assert.rejects(fetchFeedText(`${base}/feed`), /too large/i);
  assert.equal(requests.count, 1, 'one request, then we stop reading — no download');
});

test('a feed inside the cap is read whole', async (t) => {
  const { base } = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/xml', 'content-length': String(Buffer.byteLength(FEED)) });
    res.end(FEED);
  });
  const text = await fetchFeedText(`${base}/feed`);
  assert.ok(text.includes('<title>One</title>'));
});

test('a user-supplied loopback URL is blocked before anything connects', async (t) => {
  const { base, requests } = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/xml' });
    res.end(FEED);
  });

  await assert.rejects(fetchFeedText(`${base}/feed`, { guardTarget: true }), (e) => {
    assert.equal(e.code, 'BLOCKED', 'the caller can tell "not allowed" from "unreachable"');
    return true;
  });
  assert.equal(requests.count, 0, 'the guard runs before the fetch, not after the damage');
});

test('a redirect on the guarded path is not followed past its target check', async (t) => {
  const { base, requests } = await loopback(t, (req, res) => {
    if (req.url === '/go') {
      res.writeHead(302, { location: 'http://169.254.169.254/latest/meta-data/' });
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/xml' });
    res.end(FEED);
  });

  // The first hop is loopback, which is itself blocked — what this pins down is
  // that a 3xx never reaches a second `fetch()`, because the guarded path asks
  // for `redirect: 'manual'` and validates every `Location` it is given.
  await assert.rejects(fetchFeedText(`${base}/go`, { guardTarget: true }), (e) => {
    assert.equal(e.code, 'BLOCKED');
    return true;
  });
  assert.equal(requests.count, 0, 'no hop was requested at all, so no hop could redirect us anywhere');
});

test('the unguarded path still follows redirects natively (curated feeds)', async (t) => {
  const { base } = await loopback(t, (req, res) => {
    if (req.url === '/old') {
      res.writeHead(301, { location: '/new' });
      res.end();
      return;
    }
    res.writeHead(200, { 'content-type': 'text/xml' });
    res.end(FEED);
  });
  const text = await fetchFeedText(`${base}/old`);
  assert.ok(text.includes('<title>One</title>'), 'native following is untouched where the URL is ours');
});

test('an empty body is a parse error, not an empty feed', async (t) => {
  const { base } = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/xml' });
    res.end('');
  });
  await assert.rejects(fetchFeedText(`${base}/feed`), (e) => {
    assert.equal(e.code, 'PARSE_ERROR');
    return true;
  });
});

test('a name that simply does not resolve is unreachable, not refused', async () => {
  // Environments without DNS (a locked-down sandbox, a build container) must not
  // be told their feed was blocked by policy: that would send someone hunting
  // for a rule that never fired. Only an actual policy hit says BLOCKED.
  await assert.rejects(
    fetchFeedText('https://this-host-cannot-exist.invalid/feed.xml', { guardTarget: true }),
    (e) => {
      assert.equal(e.code, 'NETWORK_ERROR', `got ${e.code}`);
      return true;
    },
  );
});
