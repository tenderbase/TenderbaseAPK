/**
 * Business-logic tests — zero dependencies, runs on the Node test runner.
 *   npm test
 *
 * Imports the REAL src/lib/format.ts (see resolver.mjs). This file used to
 * inline copies of the functions, and they had already drifted: the copy took
 * `getStatus(iso, now)` while the module takes `getStatus(tender, now)`, so the
 * test was asserting a signature nothing in the app calls.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  daysUntil,
  formatDate,
  formatDeadline,
  formatValue,
  getStatus,
  normaliseCase,
} from '@/lib/format';

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
  assert.equal(getStatus({ closingDate: at(-1) }, NOW), 'closed');
  assert.equal(getStatus({ closingDate: at(0) },  NOW), 'urgent');       // closes today
  assert.equal(getStatus({ closingDate: at(2) },  NOW), 'urgent');
  assert.equal(getStatus({ closingDate: at(3) },  NOW), 'closing_soon');
  assert.equal(getStatus({ closingDate: at(7) },  NOW), 'closing_soon');
  assert.equal(getStatus({ closingDate: at(8) },  NOW), 'open');
});

test('status boundaries do not overlap', () => {
  // every day maps to exactly one status
  for (let d = -5; d <= 30; d++) {
    const s = getStatus({ closingDate: at(d) }, NOW);
    assert.ok(['closed','urgent','closing_soon','open'].includes(s), `day ${d} → ${s}`);
  }
});

test('daysUntil ignores time-of-day', () => {
  // 23:59 today and 00:01 today are both "0 days"
  assert.equal(daysUntil('2026-09-02T23:59:00Z', NOW), 0);
  assert.equal(daysUntil('2026-09-02T00:01:00Z', NOW), 0);
});

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

// --- lifecycle override ---
// The ingestion API reports `status: active | complete | cancelled`, which can
// contradict the closing date. A cancelled tender with a date still in the
// future must not read as "Open" — bidders spend real money on those responses.

test('a cancelled tender is cancelled even when its closing date is in the future', () => {
  assert.equal(getStatus({ closingDate: at(30), lifecycleStatus: 'cancelled' }, NOW), 'cancelled');
  assert.equal(getStatus({ closingDate: at(1), lifecycleStatus: 'cancelled' }, NOW), 'cancelled');
});

test('a completed tender is closed even when its closing date is in the future', () => {
  assert.equal(getStatus({ closingDate: at(30), lifecycleStatus: 'complete' }, NOW), 'closed');
});

test('an active tender still derives its status from the date', () => {
  assert.equal(getStatus({ closingDate: at(3), lifecycleStatus: 'active' }, NOW), 'closing_soon');
  assert.equal(getStatus({ closingDate: at(30), lifecycleStatus: 'active' }, NOW), 'open');
});

test('an unknown lifecycle value does not override the date', () => {
  // The enum is undocumented upstream; a new state must degrade, not crash.
  assert.equal(getStatus({ closingDate: at(3), lifecycleStatus: 'awarded' }, NOW), 'closing_soon');
  assert.equal(getStatus({ closingDate: at(3), lifecycleStatus: null }, NOW), 'closing_soon');
  assert.equal(getStatus({ closingDate: at(3) }, NOW), 'closing_soon');
});

test('status matching is case-insensitive', () => {
  assert.equal(getStatus({ closingDate: at(30), lifecycleStatus: 'CANCELLED' }, NOW), 'cancelled');
});

test('cancelled appears in the boundary sweep', () => {
  for (let d = -5; d <= 30; d++) {
    const s = getStatus({ closingDate: at(d), lifecycleStatus: 'cancelled' }, NOW);
    assert.equal(s, 'cancelled', `day ${d}`);
  }
});

test('formatDeadline reports cancellation instead of a countdown', () => {
  assert.equal(formatDeadline(at(30), NOW, 'cancelled'), 'Cancelled');
  assert.equal(formatDeadline(at(30), NOW, 'active'), '30 days left');
  assert.equal(formatDeadline(at(1), NOW), 'Closes tomorrow');
});

test('normaliseCase leaves mixed-case descriptions alone', () => {
  // The new feed is not uniformly shouted, unlike the previous one.
  assert.equal(
    normaliseCase('Provision of Security Services in Tsolo for a One-Year Contract.'),
    'Provision of Security Services in Tsolo for a One-Year Contract.',
  );
  assert.equal(normaliseCase('SUPPLY OF MESH FENCING'), 'Supply of mesh fencing');
  assert.equal(normaliseCase(''), '');
});
