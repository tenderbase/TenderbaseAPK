import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  paramsFromUrl,
  hasAny,
  paramsKey,
  searchUrlFor,
  summarize,
  defaultName,
  toListParams,
} from '@/lib/saved-searches';

test('paramsFromUrl keeps only Discover keys and drops empties', () => {
  const sp = new URLSearchParams('q=laptops&province=KwaZulu-Natal&page=3&sort=newest&status=active&utm=x');
  const p = paramsFromUrl(sp);
  assert.deepEqual(p, { q: 'laptops', province: 'KwaZulu-Natal', status: 'active' });

  assert.deepEqual(paramsFromUrl(new URLSearchParams('q=&page=2')), {});
  assert.equal(hasAny(paramsFromUrl(new URLSearchParams(''))), false);
});

test('paramsKey is canonical and independent of param insertion order', () => {
  const a = paramsKey({ q: 'roads', category: 'Construction', province: 'Gauteng' });
  const b = paramsKey({ province: 'Gauteng', category: 'Construction', q: 'roads' });
  assert.equal(a, b);
  assert.ok(a.startsWith('q=roads&category=Construction&province=Gauteng'));
});

test('searchUrlFor rebuilds the Discover URL with encoding', () => {
  assert.equal(searchUrlFor({ q: 'supply and delivery', province: 'KwaZulu-Natal' }),
    '/search?q=supply+and+delivery&province=KwaZulu-Natal');
  assert.equal(searchUrlFor({}), '/search');
});

test('summarize turns params into real card chips', () => {
  const chips = summarize({ q: 'laptops', category: 'Construction', province: 'KZN', closingWithin: '7d', status: 'active' });
  assert.equal(chips.length, 5);
  assert.deepEqual(chips[0], { label: '“laptops”', kind: 'query' });
  assert.ok(chips.some((c) => c.kind === 'window' && c.label === 'Closing soon'));
  assert.ok(chips.some((c) => c.kind === 'status' && c.label === 'Open only'));
});

test('defaultName prefers the keyword then the most specific filter', () => {
  assert.equal(defaultName({ q: 'pumps' }), 'pumps');
  assert.equal(defaultName({ category: 'Construction', province: 'Gauteng' }), 'Construction');
  assert.equal(defaultName({ closingWithin: '7d' }), 'Closing soon');
  assert.equal(defaultName({}), 'All tenders');
});

test('toListParams maps saved state onto the live count query', () => {
  const p = toListParams({ q: 'x', closingWithin: '7d' });
  assert.equal(p.q, 'x');
  assert.equal(p.closingWithin, '7d');
  assert.equal(p.limit, 1);
});
