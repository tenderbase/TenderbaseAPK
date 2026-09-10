/**
 * Browser-direct fallback tests (`lib/tender-direct.ts` + the wiring in
 * `lib/api.ts`).
 *
 * No network: `globalThis.fetch` is stubbed, so these assert the CONTRACT —
 * which URL is built, how a payload is adapted, how failures are classified,
 * and above all that the fallback only runs when the server could not serve
 * live data. The sandbox these tests run in cannot reach the upstream at all
 * (egress allowlist), which is exactly the situation the fallback exists for;
 * reachability itself is therefore not testable here and is not claimed.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createServer } from 'node:http';

import {
  DIRECT_API_URL,
  DIRECT_FALLBACK_ENABLED,
  DIRECT_TIMEOUT_MS,
  DirectApiError,
  directFacets,
  directStats,
  directTenderDetail,
  directFetchFrom,
  directTenderPage,
  shouldUseDirectFallback,
} from '@/lib/tender-direct';
import { tenderApi } from '@/lib/api';
import { UPSTREAM_BASE_URL, buildApiQuery } from '@/lib/tenders';
import { buildQuery } from '@/lib/tender-query';

const TENDER = {
  id: 'cmtt6lx56000142xs7i6g1dkg',
  tenderNumber: 'RFQ12214',
  title: 'RFQ12214 RE-ISSUE — supply and delivery of laptops',
  description: 'Supply and delivery of laptops for the regional office.',
  organisation: 'Airports Company of South Africa',
  category: 'Supplies: Computer Equipment',
  province: 'KwaZulu-Natal',
  location: 'Durban',
  valueCents: null,
  publishedDate: '2026-09-08T00:00:00.000Z',
  closingDate: '2026-09-21T16:00:00.000Z',
  status: 'active',
  firstSeenAt: '2026-09-08T06:00:00.000Z',
  documents: [],
  isSaved: false,
  matchScore: null,
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

/**
 * Records every URL the code under test requests, and restores the real fetch
 * afterwards. Assigned and restored explicitly: `t.mock.method` on a global
 * leaked into later tests here (real-HTTP tests saw the stub's AbortError).
 */
function stubFetch(t, impl) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return impl(String(url), init);
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return calls;
}

const listPayload = (results = [TENDER]) => ({
  results,
  total: results.length,
  page: 1,
  totalPages: 1,
  source: 'live',
});

// ---------------------------------------------------------------------------
// Same upstream, both paths
// ---------------------------------------------------------------------------

test('the direct client points at the same upstream as the server client', () => {
  assert.equal(DIRECT_API_URL, UPSTREAM_BASE_URL);
  assert.ok(!DIRECT_API_URL.endsWith('/'), 'trailing slash would double up in paths');
  assert.ok(DIRECT_FALLBACK_ENABLED, 'fallback is on unless explicitly disabled');
  assert.ok(
    DIRECT_TIMEOUT_MS < 20_000,
    'the browser attempt must be shorter than the server timeout (20s), not stacked on top of it',
  );
});

test('only a non-live server answer triggers the fallback', () => {
  assert.equal(shouldUseDirectFallback('live'), false, 'live data needs no second fetch');
  assert.equal(shouldUseDirectFallback('fixture'), true);
  assert.equal(shouldUseDirectFallback('error'), true);
});

test('the direct list URL carries exactly the server query translation', async (t) => {
  const calls = stubFetch(t, async () => jsonResponse(listPayload()));
  const opts = { closingWithin: '7d', sort: 'closing_soon', page: 2, limit: 20, query: ' laptops ' };

  await directTenderPage(opts);

  const sent = new URL(calls[0].url);
  const serverQuery = buildApiQuery(opts);
  const serverParams = new URLSearchParams(buildQuery({ ...serverQuery, limit: 20 }));

  // Same keys as the server would send (closingAfter/Before are "now"-relative,
  // so their values differ by milliseconds between the two calls).
  assert.deepEqual(
    [...sent.searchParams.keys()].sort(),
    [...serverParams.keys()].sort(),
    'direct and server queries must be identical in shape',
  );
  assert.equal(sent.pathname, '/tenders');
  assert.equal(sent.searchParams.get('q'), 'laptops', 'query is trimmed, like the server path');
  assert.equal(sent.searchParams.get('sort'), 'closing');
  assert.equal(sent.searchParams.get('page'), '2');
  assert.equal(sent.searchParams.get('limit'), '20');
  // Both calls compute "now + 7 days" independently, so allow a ms-scale drift.
  const drift =
    Math.abs(
      new Date(sent.searchParams.get('closingBefore')).getTime() -
        new Date(serverQuery.closingBefore).getTime(),
    );
  assert.ok(drift < 5_000, `closing window agrees with the server path (drift ${drift}ms)`);
  assert.equal(sent.searchParams.get('closingWithin'), null, 'upstream ignores this param');
});

// ---------------------------------------------------------------------------
// Adaptation + provenance
// ---------------------------------------------------------------------------

test('a direct page is adapted like a server page but marked via browser', async (t) => {
  stubFetch(t, async () => jsonResponse(listPayload()));

  const page = await directTenderPage({ sort: 'newest', limit: 8 });

  assert.equal(page.source, 'live');
  assert.equal(page.via, 'browser', 'provenance must be visible to the UI');
  assert.equal(page.total, 1);
  assert.equal(page.results[0].id, TENDER.id);
  assert.equal(page.results[0].province, 'KwaZulu-Natal');
  assert.equal(page.results[0].categoryRaw, 'Supplies: Computer Equipment');
  assert.equal(page.results[0].isSaved, false, 'no fabricated user state');
});

test('detail: a real upstream 404 is null, not an outage', async (t) => {
  stubFetch(t, async () => jsonResponse({ detail: 'Not found' }, 404));
  assert.equal(await directTenderDetail('missing-id'), null);
});

test('detail: a live record keeps its amendments array and provenance', async (t) => {
  stubFetch(t, async () =>
    jsonResponse({ tender: { ...TENDER, amendments: [] }, source: 'live' }),
  );
  const detail = await directTenderDetail(TENDER.id);
  assert.equal(detail.source, 'live');
  assert.equal(detail.via, 'browser');
  assert.deepEqual(detail.tender.amendments, []);
  assert.ok(detail.tender.title.length > 0, 'the title is derived, never empty');
});

test('facets and stats map to the same app shapes the server returns', async (t) => {
  stubFetch(t, async (url) => {
    if (url.endsWith('/categories')) {
      return jsonResponse({
        categories: [{ category: 'Construction', count: 120 }],
        total: 1,
        source: 'live',
      });
    }
    if (url.endsWith('/provinces')) {
      return jsonResponse({
        provinces: [{ province: 'Gauteng', count: 90 }, { province: 'Atlantis', count: 1 }],
        total: 2,
        source: 'live',
      });
    }
    return jsonResponse({
      stats: {
        totalTenders: 411,
        activeTenders: 396,
        completedTenders: 12,
        cancelledTenders: 3,
        expiringSoonTenders: 101,
        categoriesCount: 62,
        provincesCount: 10,
        latestPublishedDate: '2026-09-08',
        uptimeSeconds: 100,
      },
      source: 'live',
    });
  });

  const facets = await directFacets();
  assert.equal(facets.source, 'live');
  assert.equal(facets.categories[0].name, 'Construction');
  assert.equal(facets.categories[0].group, 'Construction', 'group derives like the server path');
  assert.deepEqual(
    facets.provinces.map((p) => p.name),
    ['Gauteng'],
    'unknown province names are dropped, not mangled',
  );

  const stats = await directStats();
  assert.equal(stats.activeTenders, 396);
  assert.equal(stats.via, 'browser');
});

// ---------------------------------------------------------------------------
// Failure classification (the caller keeps the server's answer on any of these)
// ---------------------------------------------------------------------------

test('an aborted request reports a timeout, a plain network failure reports NETWORK_ERROR', async (t) => {
  let mode = 'abort';
  stubFetch(t, async () => {
    if (mode === 'abort') {
      throw Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' });
    }
    throw new TypeError('Failed to fetch');
  });

  await assert.rejects(directTenderPage(), (e) => {
    assert.ok(e instanceof DirectApiError);
    assert.equal(e.code, 'UPSTREAM_TIMEOUT');
    return true;
  });

  mode = 'network';
  await assert.rejects(directTenderPage(), (e) => {
    assert.ok(e instanceof DirectApiError);
    assert.equal(e.code, 'NETWORK_ERROR');
    return true;
  });
});

test('a non-JSON body is an error, never a half-rendered page', async (t) => {
  stubFetch(t, async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    },
  }));
  await assert.rejects(directTenderPage(), (e) => {
    assert.ok(e instanceof DirectApiError);
    assert.equal(e.code, 'HTTP_ERROR');
    return true;
  });
});

// ---------------------------------------------------------------------------
// The wiring: lib/api.ts
// ---------------------------------------------------------------------------

test('tenderApi.list retries in the browser when our route served fixtures', async (t) => {
  const calls = stubFetch(t, async (url) => {
    if (url.startsWith('/api/tenders')) {
      return jsonResponse({ ...listPayload([]), source: 'fixture', notice: 'captured' });
    }
    return jsonResponse(listPayload());
  });

  const page = await tenderApi.list({ sort: 'newest', limit: 8 });

  assert.equal(calls.length, 2, 'one server call, then one direct call');
  assert.ok(calls[1].url.startsWith(DIRECT_API_URL), 'the retry goes to the upstream itself');
  assert.equal(page.source, 'live');
  assert.equal(page.via, 'browser');
  assert.equal(page.results.length, 1, 'real rows replace the captured snapshot');
});

test('tenderApi.list does not double-fetch when the server is already live', async (t) => {
  const calls = stubFetch(t, async () => jsonResponse(listPayload()));
  const page = await tenderApi.list({ sort: 'newest', limit: 8 });
  assert.equal(calls.length, 1);
  assert.equal(page.source, 'live');
  assert.equal(page.via, undefined, 'server-served data keeps the default provenance');
});

test('when the direct retry also fails the server answer is returned unchanged', async (t) => {
  stubFetch(t, async (url) => {
    if (url.startsWith('/api/tenders')) {
      return jsonResponse({
        results: [],
        total: 0,
        page: 1,
        totalPages: 1,
        source: 'error',
        notice: 'Could not reach the tender service. Please try again shortly.',
      });
    }
    throw new TypeError('Failed to fetch');
  });

  const page = await tenderApi.list();
  assert.equal(page.source, 'error', 'the outage is still reported honestly');
  assert.equal(page.notice, 'Could not reach the tender service. Please try again shortly.');
});

// ---------------------------------------------------------------------------
// Transport against a REAL HTTP server (not a Response stub)
//
// The sandbox running these tests has no egress to the upstream, so the real
// host cannot be used. A loopback server speaking the same shapes exercises
// the parts a stub cannot: a genuine AbortController timeout, a real 404, and a
// real non-JSON body.
// ---------------------------------------------------------------------------

async function loopback(t, handler) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${port}`;
}

test('a real request is parsed and returned as-is', async (t) => {
  const base = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(listPayload()));
  });

  const body = await directFetchFrom(base, '/tenders?limit=1');
  assert.equal(body.results[0].id, TENDER.id);
  assert.equal(body.source, 'live');
});

test('a real 404 keeps its status so detail can return null', async (t) => {
  const base = await loopback(t, (_req, res) => {
    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ detail: 'Not found' }));
  });

  await assert.rejects(directFetchFrom(base, '/tenders/nope'), (e) => {
    assert.ok(e instanceof DirectApiError);
    assert.equal(e.code, 'HTTP_ERROR');
    assert.equal(e.status, 404, 'the status is preserved, not flattened into a generic error');
    return true;
  });
});

test('a real HTML error page is reported as malformed, not parsed', async (t) => {
  const base = await loopback(t, (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' });
    res.end('<html><body>Proxy error</body></html>');
  });

  await assert.rejects(directFetchFrom(base, '/tenders'), (e) => {
    assert.ok(e instanceof DirectApiError);
    assert.equal(e.code, 'HTTP_ERROR');
    return true;
  });
});

test('a stalled upstream trips the timeout instead of hanging the screen', async (t) => {
  const base = await loopback(t, () => {
    /* never responds */
  });

  const started = Date.now();
  await assert.rejects(directFetchFrom(base, '/tenders', 60), (e) => {
    assert.ok(e instanceof DirectApiError);
    assert.equal(e.code, 'UPSTREAM_TIMEOUT');
    return true;
  });
  assert.ok(Date.now() - started < 5_000, 'the abort fired on schedule, not on the OS timeout');
});

// ---------------------------------------------------------------------------
// The detail route's outage status (regression: the fallback could never fire)
//
// `/api/tenders/[id]` answers 503 for `source: 'error'` so a CDN cannot cache an
// outage under a `s-maxage` header. That is right for the cache and was wrong
// for the client: `request` threw on any non-2xx, so `tenderApi.getById` never
// reached the retry its own module documents. These pin the reconciliation.
// ---------------------------------------------------------------------------

const OUTAGE = {
  source: 'error',
  notice: 'Could not reach the tender service. Please try again shortly.',
};

test('detail: a 503 outage envelope is an answer, so the browser retry runs', async (t) => {
  const calls = stubFetch(t, async (url) => {
    if (url.startsWith('/api/tenders/')) return jsonResponse(OUTAGE, 503);
    return jsonResponse({ tender: { ...TENDER, amendments: [] }, source: 'live' });
  });

  const res = await tenderApi.getById(TENDER.id);

  assert.equal(calls.length, 2, 'the envelope is parsed, not thrown, so the retry gets its turn');
  assert.ok(calls[1].url.startsWith(DIRECT_API_URL), 'and it goes to the upstream itself');
  assert.equal(res.source, 'live');
  assert.equal(res.via, 'browser');
  assert.equal(res.tender?.id, TENDER.id);
});

test('detail: when the retry also fails the outage is returned, not dressed up', async (t) => {
  stubFetch(t, async (url) => {
    if (url.startsWith('/api/tenders/')) return jsonResponse(OUTAGE, 503);
    throw new TypeError('Failed to fetch');
  });

  const res = await tenderApi.getById(TENDER.id);
  assert.equal(res.source, 'error', 'still an outage, still honest');
  assert.equal(res.notice, OUTAGE.notice);
  assert.equal(res.tender, undefined, 'and no tender was invented to cover it up');
});

test('detail: a fixture envelope is replaced the same way', async (t) => {
  const calls = stubFetch(t, async (url) => {
    if (url.startsWith('/api/tenders/')) {
      return jsonResponse({ ...TENDER, source: 'fixture', notice: 'captured' });
    }
    return jsonResponse({ tender: { ...TENDER, amendments: [] }, source: 'live' });
  });
  const res = await tenderApi.getById(TENDER.id);
  assert.equal(calls.length, 2);
  assert.equal(res.source, 'live');
});

test('detail: a live server answer is never re-fetched, and a crash still throws', async (t) => {
  const live = stubFetch(t, async (url) => {
    if (url.startsWith('/api/tenders/')) {
      return jsonResponse({ tender: { ...TENDER, amendments: [] }, source: 'live', via: 'server' });
    }
    throw new Error('must not be reached');
  });
  const res = await tenderApi.getById(TENDER.id);
  assert.equal(live.length, 1);
  assert.equal(res.via, 'server', 'server-served provenance is left alone');

  stubFetch(t, async () => ({
    ok: false,
    status: 500,
    text: async () => 'Internal Server Error',
  }));
  await assert.rejects(tenderApi.getById(TENDER.id), /500/, 'a real failure is not a data source');
});
