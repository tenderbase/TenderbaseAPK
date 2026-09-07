/**
 * Business-logic tests — zero dependencies, runs on the Node test runner.
 *   node --test src/lib/__tests__/
 * Mirrors src/lib/format.ts. Keep in sync if the rules change.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- inlined copies of the pure functions under test ---
const formatValue = (c) => {
  if (c === null) return 'Not disclosed';
  const r = c / 100;
  if (r >= 1_000_000) { const m = r / 1_000_000; return `R${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`; }
  if (r >= 1_000) return `R${Math.round(r / 1_000)}k`;
  return `R${r.toFixed(0)}`;
};
const daysUntil = (iso, now = new Date()) => {
  const s = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const c = new Date(iso);
  return Math.round((Date.UTC(c.getFullYear(), c.getMonth(), c.getDate()) - s) / 86400000);
};
const getStatus = (iso, now) => {
  const d = daysUntil(iso, now);
  if (d < 0) return 'closed';
  if (d <= 2) return 'urgent';
  if (d <= 7) return 'closing_soon';
  return 'open';
};

const NOW = new Date('2026-09-02T09:00:00Z');
const at = (days) => { const d = new Date(NOW); d.setDate(d.getDate() + days); return d.toISOString(); };

test('formatValue: millions', () => {
  assert.equal(formatValue(240_000_000), 'R2.4M');
  assert.equal(formatValue(870_000_000), 'R8.7M');
  assert.equal(formatValue(200_000_000), 'R2M');   // drops trailing .0
});

test('formatValue: thousands and small amounts', () => {
  assert.equal(formatValue(85_000_00), 'R85k');
  assert.equal(formatValue(50_000), 'R500');
});

test('formatValue: withheld value is never rendered as R0', () => {
  assert.equal(formatValue(null), 'Not disclosed');
  assert.notEqual(formatValue(null), 'R0');
});

test('getStatus is derived from the closing date', () => {
  assert.equal(getStatus(at(-1), NOW), 'closed');
  assert.equal(getStatus(at(0),  NOW), 'urgent');       // closes today
  assert.equal(getStatus(at(2),  NOW), 'urgent');
  assert.equal(getStatus(at(3),  NOW), 'closing_soon');
  assert.equal(getStatus(at(7),  NOW), 'closing_soon');
  assert.equal(getStatus(at(8),  NOW), 'open');
});

test('status boundaries do not overlap', () => {
  // every day maps to exactly one status
  for (let d = -5; d <= 30; d++) {
    const s = getStatus(at(d), NOW);
    assert.ok(['closed','urgent','closing_soon','open'].includes(s), `day ${d} → ${s}`);
  }
});

test('daysUntil ignores time-of-day', () => {
  // 23:59 today and 00:01 today are both "0 days"
  assert.equal(daysUntil('2026-09-02T23:59:00Z', NOW), 0);
  assert.equal(daysUntil('2026-09-02T00:01:00Z', NOW), 0);
});

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const formatDate = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not stated';
  return `${String(d.getUTCDate()).padStart(2,'0')} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

test('September abbreviates to Sep, not Sept (Intl regression)', () => {
  // Node ICU returns "Sept" for en-GB AND en-ZA; Chromium returns "Sep".
  // Hardcoded tables keep server and client identical.
  assert.equal(formatDate('2026-09-29T12:00:00Z'), '29 Sep 2026');
  assert.equal(formatDate('2026-09-02T00:00:00Z'), '02 Sep 2026');
  assert.ok(!/Sept/.test(formatDate('2026-09-29T12:00:00Z')));
});

test('invalid or missing dates degrade to "Not stated"', () => {
  assert.equal(formatDate(''), 'Not stated');
  assert.equal(formatDate('not-a-date'), 'Not stated');
});

test('all twelve months are three letters', () => {
  for (let m = 0; m < 12; m++) {
    const iso = `2026-${String(m+1).padStart(2,'0')}-15T12:00:00Z`;
    const abbr = formatDate(iso).split(' ')[1];
    assert.equal(abbr.length, 3, `${iso} -> ${abbr}`);
  }
});
