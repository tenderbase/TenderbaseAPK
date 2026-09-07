/**
 * Tender preferences logic.
 *   node --test src/lib/__tests__/
 * Mirrors src/types/preferences.ts. Keep in sync if the rules change.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const DEFAULTS = {
  categories: ['IT & Technology', 'Supply & Delivery'],
  provinces: ['KwaZulu-Natal'],
  includeNational: true,
  minDaysToClose: 0,
  requireDocuments: false,
  alertOnNewMatch: true,
  alertOnClosingSoon: true,
  alertOnSavedUpdated: false,
  digest: 'daily',
};

const toggleInList = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

const summarise = (p) => {
  const cats = p.categories.length === 0 ? 'All categories'
    : `${p.categories.length} ${p.categories.length === 1 ? 'category' : 'categories'}`;
  const provs = p.provinces.length === 0 ? 'all provinces'
    : `${p.provinces.length} ${p.provinces.length === 1 ? 'province' : 'provinces'}`;
  return `${cats} · ${provs}`;
};

const countActiveFilters = (p) =>
  (p.categories.length > 0 ? 1 : 0) + (p.provinces.length > 0 ? 1 : 0) +
  (p.minDaysToClose > 0 ? 1 : 0) + (p.requireDocuments ? 1 : 0) +
  (p.includeNational ? 0 : 1);

const preferencesEqual = (a, b) => {
  const same = (x, y) => x.length === y.length && [...x].sort().every((v, i) => v === [...y].sort()[i]);
  return same(a.categories, b.categories) && same(a.provinces, b.provinces) &&
    a.includeNational === b.includeNational && a.minDaysToClose === b.minDaysToClose &&
    a.requireDocuments === b.requireDocuments && a.alertOnNewMatch === b.alertOnNewMatch &&
    a.alertOnClosingSoon === b.alertOnClosingSoon && a.alertOnSavedUpdated === b.alertOnSavedUpdated &&
    a.digest === b.digest;
};

const toQueryParams = (p) => {
  const q = {};
  if (p.categories.length === 1) q.category = p.categories[0];
  if (p.provinces.length === 1 && !p.includeNational) q.province = p.provinces[0];
  if (p.requireDocuments) q.has_documents = 'true';
  return q;
};

// --- toggling ---
test('toggleInList adds a value that is absent', () => {
  assert.deepEqual(toggleInList(['a'], 'b'), ['a', 'b']);
});
test('toggleInList removes a value that is present', () => {
  assert.deepEqual(toggleInList(['a', 'b'], 'a'), ['b']);
});
test('toggling the same value twice is a no-op', () => {
  assert.deepEqual(toggleInList(toggleInList(['a'], 'b'), 'b'), ['a']);
});

// --- summaries ---
test('summarise pluralises correctly', () => {
  assert.equal(summarise({ categories: ['IT'], provinces: ['KZN', 'GP'] }), '1 category · 2 provinces');
});
test('an empty selection reads as "all", never as zero', () => {
  assert.equal(summarise({ categories: [], provinces: [] }), 'All categories · all provinces');
});

// --- active filter count ---
test('defaults count category and province as the active filters', () => {
  assert.equal(countActiveFilters(DEFAULTS), 2);
});
test('excluding national tenders counts as a filter', () => {
  assert.equal(countActiveFilters({ ...DEFAULTS, includeNational: false }), 3);
});
test('a wide-open preference set has no active filters', () => {
  assert.equal(countActiveFilters({
    categories: [], provinces: [], includeNational: true,
    minDaysToClose: 0, requireDocuments: false,
  }), 0);
});

// --- equality (drives the save bar) ---
test('identical preferences compare equal', () => {
  assert.ok(preferencesEqual(DEFAULTS, { ...DEFAULTS }));
});
test('order of selected categories does not count as a change', () => {
  assert.ok(preferencesEqual(DEFAULTS, {
    ...DEFAULTS, categories: ['Supply & Delivery', 'IT & Technology'],
  }));
});
test('a changed toggle is detected', () => {
  assert.ok(!preferencesEqual(DEFAULTS, { ...DEFAULTS, requireDocuments: true }));
});
test('a changed closing window is detected', () => {
  assert.ok(!preferencesEqual(DEFAULTS, { ...DEFAULTS, minDaysToClose: 7 }));
});
test('adding a category is detected', () => {
  assert.ok(!preferencesEqual(DEFAULTS, {
    ...DEFAULTS, categories: [...DEFAULTS.categories, 'Security'],
  }));
});

// --- API params ---
test('a single category is pushed to the API', () => {
  assert.deepEqual(toQueryParams({ ...DEFAULTS, categories: ['Security'] }).category, 'Security');
});
test('multi-select is filtered client-side, not sent as a single param', () => {
  // Sending one of two would silently drop the other.
  assert.equal(toQueryParams(DEFAULTS).category, undefined);
});
test('province is only sent when national tenders are excluded', () => {
  assert.equal(toQueryParams(DEFAULTS).province, undefined);
  assert.equal(
    toQueryParams({ ...DEFAULTS, includeNational: false }).province, 'KwaZulu-Natal');
});
test('requireDocuments maps to the has_documents param', () => {
  assert.equal(toQueryParams({ ...DEFAULTS, requireDocuments: true }).has_documents, 'true');
});
test('no unsupported value or B-BBEE params are ever sent', () => {
  const q = toQueryParams({ ...DEFAULTS, requireDocuments: true, minDaysToClose: 7 });
  for (const k of Object.keys(q)) {
    assert.ok(!/value|price|bbbee|cidb/i.test(k), `unexpected param ${k}`);
  }
});
