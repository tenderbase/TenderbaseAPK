/**
 * Data-layer tests for the ingestion API integration.
 *
 * Runs with NODE_ENV=test, which sets FIXTURES_ONLY, so `listTenders` and
 * friends serve the real captured payloads instead of touching the network.
 * That makes these deterministic and offline — but they still exercise the same
 * `buildApiQuery` translation and the same `adapt.ts` mapping the live path uses.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  buildApiQuery,
  getClosingSoon,
  getFacets,
  getLatest,
  getStats,
  getTender,
  listTenders,
  UPSTREAM_BASE_URL,
} from '@/lib/tenders';
import { FIXTURE_TENDERS } from '@/lib/fixtures/tender-api';
import { CATEGORIES } from '@/types/tender';

const NOW = new Date('2026-09-08T22:00:00Z');
const DAY = 86_400_000;

// ---------------------------------------------------------------------------
// Where the data comes from
// ---------------------------------------------------------------------------

test('the upstream is the new ingestion API', () => {
  assert.equal(UPSTREAM_BASE_URL, 'https://tenderbase-api-rqrh.onrender.com');
  assert.ok(!UPSTREAM_BASE_URL.endsWith('/'), 'trailing slash would double up in paths');
});

test('the retired Railway API is not referenced anywhere in src/', () => {
  const root = path.resolve('src');
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|mjs)$/.test(entry)) {
        const body = readFileSync(full, 'utf8');
        if (/tenderbased-production\.up\.railway\.app|\/api\/v1\/tenders/.test(body)) {
          offenders.push(path.relative(root, full));
        }
      }
    }
  };
  walk(root);
  assert.deepEqual(offenders, [], `old API still referenced in: ${offenders.join(', ')}`);
});

test('no param the new API ignores is still being sent', () => {
  // Verified ignored upstream: it drops unknown keys silently, so these fail
  // open into an unfiltered result set rather than erroring.
  const q = buildApiQuery(
    { query: 'x', closingWithin: '7d', sort: 'closing_soon', category: 'C', province: 'P' },
    NOW,
  );
  for (const banned of ['closingWithin', 'closing_within', 'hasDocuments', 'has_documents', 'search', 'organisation', 'municipality']) {
    assert.equal(q[banned], undefined, `sent unsupported param ${banned}`);
  }
});

// ---------------------------------------------------------------------------
// Query translation
// ---------------------------------------------------------------------------

test('defaults are a sane first page', () => {
  assert.deepEqual(buildApiQuery({}, NOW), {
    page: 1, limit: 20, q: undefined, category: undefined,
    province: undefined, status: undefined, sort: 'latest',
  });
});

test('app sorts map onto the API sort enum', () => {
  // The enum is exactly: latest | closing | closing_desc | published_asc.
  assert.equal(buildApiQuery({ sort: 'newest' }, NOW).sort, 'latest');
  assert.equal(buildApiQuery({ sort: 'closing_soon' }, NOW).sort, 'closing');
  assert.equal(buildApiQuery({}, NOW).sort, 'latest');
});

test('value_desc degrades instead of sending a value the API drops', () => {
  // valueCents is null across the whole feed — there is nothing to order by.
  assert.equal(buildApiQuery({ sort: 'value_desc' }, NOW).sort, 'latest');
});

test('closingWithin becomes a closingAfter/closingBefore bracket', () => {
  const q = buildApiQuery({ closingWithin: '7d' }, NOW);
  assert.equal(q.closingAfter, NOW.toISOString());
  assert.equal(q.closingBefore, new Date(NOW.getTime() + 7 * DAY).toISOString());
  assert.equal(q.sort, 'closing');
});

test('"closing soon" always excludes already-closed tenders', () => {
  // sort=closing is ASCENDING over every record including long-closed ones, so
  // without closingAfter=now the first page is nothing but expired tenders.
  for (const opts of [{ sort: 'closing_soon' }, { closingWithin: '7d' }, { sort: 'closing_soon', closingWithin: '30d' }]) {
    const q = buildApiQuery(opts, NOW);
    assert.equal(q.closingAfter, NOW.toISOString(), JSON.stringify(opts));
    assert.ok(q.closingBefore > q.closingAfter);
  }
});

test('hour and day windows both parse', () => {
  assert.equal(buildApiQuery({ closingWithin: '24h' }, NOW).closingBefore, new Date(NOW.getTime() + DAY).toISOString());
  assert.equal(buildApiQuery({ closingWithin: '48h' }, NOW).closingBefore, new Date(NOW.getTime() + 2 * DAY).toISOString());
  assert.equal(buildApiQuery({ closingWithin: '30d' }, NOW).closingBefore, new Date(NOW.getTime() + 30 * DAY).toISOString());
});

test('a nonsense window falls back to seven days rather than NaN', () => {
  for (const bad of ['soon', 'd', 'NaNd', '0d']) {
    const q = buildApiQuery({ closingWithin: bad }, NOW);
    assert.ok(!Number.isNaN(Date.parse(q.closingBefore)), `${bad} produced an invalid date`);
    assert.ok(q.closingBefore > q.closingAfter, `${bad} produced an empty window`);
  }
  // 'soon' has no leading number at all -> the 7-day default.
  assert.equal(
    buildApiQuery({ closingWithin: 'soon' }, NOW).closingBefore,
    new Date(NOW.getTime() + 7 * DAY).toISOString(),
  );
  // '0d' must not collapse to a zero-length window that matches nothing.
  assert.ok(buildApiQuery({ closingWithin: '0d' }, NOW).closingBefore > NOW.toISOString());
});

test('an empty closingWithin means no window, not a seven-day one', () => {
  // `?closingWithin=` arrives as '' from the route handler; filtering on an
  // empty value would silently drop every tender.
  const q = buildApiQuery({ closingWithin: '' }, NOW);
  assert.equal(q.closingAfter, undefined);
  assert.equal(q.closingBefore, undefined);
});

test('filters are passed verbatim, because the API matches exact names', () => {
  const q = buildApiQuery(
    { category: 'Supplies: Computer Equipment', province: 'KwaZulu-Natal', status: 'active', query: ' aruba ' },
    NOW,
  );
  assert.equal(q.category, 'Supplies: Computer Equipment');
  assert.equal(q.province, 'KwaZulu-Natal');
  assert.equal(q.status, 'active');
  assert.equal(q.q, 'aruba', 'query should be trimmed');
});

test('empty filters are omitted, not sent as empty strings', () => {
  const q = buildApiQuery({ query: '   ', category: '', province: '', status: '' }, NOW);
  for (const k of ['q', 'category', 'province', 'status']) {
    assert.ok(!q[k], `${k} should be absent, got "${q[k]}"`);
  }
});

test('page is never below 1', () => {
  assert.equal(buildApiQuery({ page: 0 }, NOW).page, 1);
  assert.equal(buildApiQuery({ page: -3 }, NOW).page, 1);
  assert.equal(buildApiQuery({ page: 4 }, NOW).page, 4);
});

// ---------------------------------------------------------------------------
// Listing (fixture path)
// ---------------------------------------------------------------------------

test('results come back in the domain shape, not the wire shape', async () => {
  const page = await listTenders({ limit: 8 });
  assert.equal(page.source, 'fixture');
  assert.ok(page.results.length > 0);
  const t = page.results[0];
  for (const wireOnly of ['tenderNumber', 'closingDate']) assert.ok(t[wireOnly]);
  assert.equal(typeof t.id, 'string');
  assert.ok(CATEGORIES.includes(t.category), `unmapped category ${t.category}`);
  assert.ok(t.categoryRaw, 'verbatim category lost');
  assert.equal(t.valueCents, null);
  assert.ok(t.contactInformation?.contactPerson, 'contact lost');
});

test('the fallback says where the data came from', async () => {
  const page = await listTenders({});
  assert.equal(page.source, 'fixture');
  assert.match(page.notice, /captured from the live API/i);
  assert.match(page.notice, /2026-09-08/);
  // Never described as live, and never described as invented sample data.
  assert.ok(!/sample data/i.test(page.notice));
});

test('province filter uses the API\'s exact display names', async () => {
  const kzn = await listTenders({ province: 'KwaZulu-Natal', limit: 20 });
  assert.equal(kzn.total, 3);
  assert.ok(kzn.results.every((t) => t.province === 'KwaZulu-Natal'));

  // The slug the UI used to send matches nothing — this is the bug the rewiring fixed.
  const slug = await listTenders({ province: 'kwazulu-natal', limit: 20 });
  assert.equal(slug.total, 0);
});

test('category filter uses verbatim upstream names, not app groupings', async () => {
  const exact = await listTenders({ category: 'Construction', limit: 20 });
  assert.equal(exact.total, 1);
  assert.equal(exact.results[0].tenderNumber, '169476');

  const grouped = await listTenders({ category: 'IT & Technology', limit: 20 });
  assert.equal(grouped.total, 0, 'an app grouping is not an upstream category');
});

test('status filter matches the lifecycle values', async () => {
  const complete = await listTenders({ status: 'complete', limit: 20 });
  assert.equal(complete.total, 2);
  assert.ok(complete.results.every((t) => t.lifecycleStatus === 'complete'));

  const active = await listTenders({ status: 'active', limit: 20 });
  assert.equal(active.total, 6);
});

test('full-text search matches description, as the API does', async () => {
  // 'ETHEKWINI' appears only inside the description of 169148.
  const found = await listTenders({ query: 'ethekwini', limit: 20 });
  assert.equal(found.total, 1);
  assert.equal(found.results[0].tenderNumber, '169148');

  const none = await listTenders({ query: 'zzz-not-a-word', limit: 20 });
  assert.equal(none.total, 0);
  assert.deepEqual(none.results, []);
});

test('closing-soon lists only future closings, soonest first', async () => {
  const page = await getClosingSoon(10, 7);
  const now = Date.now();
  assert.ok(page.results.length > 0, 'expected some tenders closing this week');
  for (const t of page.results) {
    const c = new Date(t.closingDate).getTime();
    assert.ok(c >= now, `${t.tenderNumber} already closed`);
    assert.ok(c <= now + 7 * DAY, `${t.tenderNumber} outside the window`);
  }
  const times = page.results.map((t) => new Date(t.closingDate).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => a - b), 'not ascending');
});

test('latest is ordered newest-first by ingest time', async () => {
  const page = await getLatest(8);
  const seen = page.results.map((t) => new Date(t.firstSeenAt).getTime());
  assert.deepEqual(seen, [...seen].sort((a, b) => b - a));
});

test('pagination slices and reports totals consistently', async () => {
  const first = await listTenders({ limit: 3, page: 1 });
  assert.equal(first.results.length, 3);
  assert.equal(first.totalPages, 3);
  assert.equal(first.page, 1);

  const second = await listTenders({ limit: 3, page: 2 });
  assert.equal(second.page, 2);
  assert.equal(second.results.length, 3);
  const ids = (p) => p.results.map((t) => t.id);
  assert.ok(!ids(first).some((id) => ids(second).includes(id)), 'pages overlap');

  const beyond = await listTenders({ limit: 3, page: 99 });
  assert.deepEqual(beyond.results, []);
  assert.equal(beyond.total, first.total, 'total must not change with the page');
});

test('the total reflects the filter, not the whole dataset', async () => {
  assert.equal((await listTenders({})).total, FIXTURE_TENDERS.results.length);
  assert.equal((await listTenders({ province: 'Gauteng' })).total, 3);
});

// ---------------------------------------------------------------------------
// Detail, facets, stats
// ---------------------------------------------------------------------------

test('a known id resolves to a detail record with amendments', async () => {
  const found = await getTender('cmtt6lx56000142xs7i6g1dkg');
  assert.ok(found);
  assert.equal(found.tender.tenderNumber, '169585');
  assert.deepEqual(found.tender.amendments, []);
  assert.equal(found.tender.documents[0].fileType, 'PDF');
});

test('an unknown id is null so the page can 404', async () => {
  assert.equal(await getTender('does-not-exist'), null);
});

test('facets carry live counts and a valid app grouping', async () => {
  const facets = await getFacets();
  assert.equal(facets.categories.length, 62);
  assert.equal(facets.provinces.length, 10);
  for (const c of facets.categories) {
    assert.ok(CATEGORIES.includes(c.group), `${c.name} -> ${c.group}`);
    assert.ok(c.count >= 1);
  }
  const construction = facets.categories.find((c) => c.name === 'Construction');
  assert.equal(construction.count, 18);
  assert.equal(construction.group, 'Construction');
});

test('stats are the pipeline totals, not a row count', async () => {
  const stats = await getStats();
  assert.equal(stats.totalTenders, 411);
  assert.equal(stats.activeTenders, 396);
  assert.equal(stats.completedTenders, 9);
  assert.equal(stats.cancelledTenders, 3);
  assert.equal(stats.expiringSoonTenders, 101);
  assert.equal(stats.categoriesCount, 62);
  assert.equal(stats.provincesCount, 10);
  assert.equal(stats.source, 'fixture');
});

test('the fixture totals agree with the stats endpoint', async () => {
  const stats = await getStats();
  const facets = await getFacets();
  assert.equal(facets.categories.length, stats.categoriesCount);
  assert.equal(facets.provinces.length, stats.provincesCount);
  const sum = facets.provinces.reduce((a, p) => a + p.count, 0);
  assert.equal(sum, stats.totalTenders, 'province counts should sum to the dataset');
});
