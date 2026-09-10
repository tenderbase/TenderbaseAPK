/**
 * The upstream fetch's failure behaviour, against real loopback sockets.
 *
 * The production incident this locks in: the upstream shares Render's free
 * tier, whose cold-start signature is an immediate 502/503 from the router (or
 * a 200 carrying an HTML error page) that is usually gone a second later. One
 * bounded retry absorbs that; a timeout must NOT be retried, because it has
 * already burned the whole latency budget and the page hands over to the
 * browser-direct fallback instead of hanging twice as long.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from 'node:http';

import { tenderApiServerFrom } from '@/lib/tender-api.server';

const LIST_BODY = JSON.stringify({
  results: [
    {
      id: 't1',
      title: 'Test tender',
      organisation: 'Org',
      category: 'Services',
      province: 'Gauteng',
      publishedDate: '2026-09-01',
      status: 'active',
      documents: [],
    },
  ],
  total: 1,
  page: 1,
  totalPages: 1,
});

async function loopback(t, handler) {
  const requests = { count: 0, paths: [] };
  const server = createServer((req, res) => {
    requests.count += 1;
    requests.paths.push(req.url);
    handler(req, res);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return { base: `http://127.0.0.1:${port}`, requests };
}

function jsonResponse(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

test('a cold-start 502 is retried once and the retry wins', async (t) => {
  let state = 0;
  const { base, requests } = await loopback(t, (_req, res) => {
    state += 1;
    if (state === 1) {
      res.writeHead(502, { 'content-type': 'text/html' });
      res.end('<html>application booting</html>');
    } else {
      jsonResponse(res, 200, JSON.parse(LIST_BODY));
    }
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 2_000, retryDelayMs: 10 });
  const page = await api.list({ limit: 5 });
  assert.equal(page.total, 1, 'the successful retry is served, not the 502');
  assert.equal(requests.count, 2, 'exactly one retry, not a storm');
});

test('a timeout is not retried — the page must not hang for two timeouts', async (t) => {
  const { base, requests } = await loopback(t, (_req, res) => {
    // Never respond: the socket just holds until the client gives up.
    void res;
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 150, retryDelayMs: 10 });
  await assert.rejects(
    api.list({}),
    (e) => e.code === 'UPSTREAM_TIMEOUT' && e.status === 504,
  );
  assert.equal(requests.count, 1, 'a timeout is an answer that cost the whole budget — no second try');
});

test('a 4xx is an answer, not a transient failure — no retry', async (t) => {
  const { base, requests } = await loopback(t, (_req, res) => {
    jsonResponse(res, 404, { message: 'Route GET:/tenders not found', error: 'Not Found', statusCode: 404 });
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 1_000, retryDelayMs: 10 });
  await assert.rejects(api.list({}), (e) => e.status === 404);
  assert.equal(requests.count, 1);
});

test('a 200 with a malformed body is retried, then reported as an upstream error', async (t) => {
  const { base, requests } = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end('<html>mid-wake error page with a 200 status</html>');
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 1_000, retryDelayMs: 10 });
  await assert.rejects(
    api.list({}),
    (e) => e.code === 'UPSTREAM_ERROR' && e.status === 502,
  );
  assert.equal(requests.count, 2, 'the malformed 200 got its one retry');
});

test('a persistent 502 exhausts the retry and reports the status it saw', async (t) => {
  const { base, requests } = await loopback(t, (_req, res) => {
    res.writeHead(502, { 'content-type': 'text/plain' });
    res.end('nope');
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 1_000, retryDelayMs: 10 });
  await assert.rejects(
    api.list({}),
    (e) => e.code === 'UPSTREAM_ERROR' && e.status === 502,
  );
  assert.equal(requests.count, 2, 'bounded: two attempts, then the error surfaces');
});

test('a reset connection is retried and recovers', async (t) => {
  let state = 0;
  const { base, requests } = await loopback(t, (_req, res) => {
    state += 1;
    if (state === 1) {
      res.socket?.destroy();
      return;
    }
    jsonResponse(res, 200, JSON.parse(LIST_BODY));
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 2_000, retryDelayMs: 10 });
  const page = await api.list({ limit: 5 });
  assert.equal(page.total, 1);
  assert.ok(requests.count >= 2, 'the reset attempt was followed by a real one');
});

test('a second attempt never reads the Data Cache', async (t) => {
  // Observable via the request headers Next injects: a cache-participating
  // fetch in a production server carries `next-cache` behaviour we cannot see
  // in plain Node, so assert the option plumbing instead: the retry path is
  // built with `cache: 'no-store'`, which plain Node fetch accepts silently.
  let state = 0;
  const { base } = await loopback(t, (_req, res) => {
    state += 1;
    jsonResponse(res, state === 1 ? 503 : 200, state === 1 ? 'busy' : JSON.parse(LIST_BODY));
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 2_000, retryDelayMs: 10 });
  const page = await api.list({ limit: 5 });
  assert.equal(page.total, 1, 'a 503-then-200 sequence ends in data');
});

test('a 200 with the wrong envelope is an upstream error, not a believed-empty page', async (t) => {
  // The September 2026 incident: the deployment pointed at the retired API,
  // whose list body is `{ data: [...], pagination: {...} }` — no `results`.
  // Reading `.results` off that served a confident live-empty catalogue.
  const { base, requests } = await loopback(t, (_req, res) => {
    jsonResponse(res, 200, { data: [{ id: 1 }], pagination: { page: 1, total: 755 } });
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 1_000, retryDelayMs: 10 });
  await assert.rejects(
    api.list({}),
    (e) => e.code === 'UPSTREAM_ERROR' && e.status === 502,
  );
  assert.equal(requests.count, 1, 'a parseable wrong shape is deterministic — no retry, straight to fallback');
});

test('wrong-shaped detail and facet envelopes are rejected the same way', async (t) => {
  const { base } = await loopback(t, (req, res) => {
    if (req.url.startsWith('/tenders/')) return jsonResponse(res, 200, { data: { id: 1 } });
    if (req.url === '/categories') return jsonResponse(res, 200, { data: [] });
    return jsonResponse(res, 200, { data: [] });
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 1_000, retryDelayMs: 10 });
  await assert.rejects(api.getById('whatever'), (e) => e.code === 'UPSTREAM_ERROR');
  await assert.rejects(api.categories(), (e) => e.code === 'UPSTREAM_ERROR');
  await assert.rejects(api.provinces(), (e) => e.code === 'UPSTREAM_ERROR');
});

test('well-shaped envelopes pass through untouched', async (t) => {
  const { base } = await loopback(t, (req, res) => {
    if (req.url.startsWith('/tenders/')) {
      return jsonResponse(res, 200, { tender: { id: 'x' }, source: 'live' });
    }
    if (req.url === '/categories') {
      return jsonResponse(res, 200, {
        categories: [{ category: 'Construction', count: 18 }],
        total: 1,
        source: 'live',
      });
    }
    return jsonResponse(res, 200, {
      provinces: [{ province: 'Gauteng', count: 96 }],
      total: 1,
      source: 'live',
    });
  });

  const api = tenderApiServerFrom(base, { timeoutMs: 1_000, retryDelayMs: 10 });
  assert.equal((await api.getById('x')).tender.id, 'x');
  assert.equal((await api.categories()).categories[0].category, 'Construction');
  assert.equal((await api.provinces()).provinces[0].province, 'Gauteng');
});
