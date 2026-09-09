import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  closingEntryFor,
  syncDeadlineAlerts,
  trialEntryFor,
  addEntries,
  visibleOf,
  unreadCount,
  tabCounts,
  sortEntries,
  markRead,
  markAllRead,
  toggleMute,
  openTenderDaysLeft,
} from '@/lib/alerts';

const NOW = new Date('2026-09-09T12:00:00.000Z');

const tender = (overrides = {}) => ({
  id: 't1',
  title: 'Supply of laptops',
  closingDate: '2026-09-15T16:00:00.000Z', // 6 days out
  lifecycleStatus: 'active',
  ...overrides,
});

const entry = (overrides = {}) => ({
  id: 'closing:t1',
  kind: 'closing',
  tenderId: 't1',
  title: 'Supply of laptops',
  body: 'Closing window open.',
  createdAt: '2026-09-09T08:00:00.000Z',
  read: false,
  ...overrides,
});

test('saved tenders get a deadline row only inside the 7-day window', () => {
  assert.ok(closingEntryFor(tender({ closingDate: '2026-09-15T16:00:00.000Z' }), NOW)); // 6d
  assert.ok(closingEntryFor(tender({ closingDate: '2026-09-16T16:00:00.000Z' }), NOW)); // 7d
  assert.ok(closingEntryFor(tender({ closingDate: '2026-09-17T16:00:00.000Z' }), NOW) === null); // 8d
  assert.ok(closingEntryFor(tender({ closingDate: '2026-09-09T16:00:00.000Z' }), NOW)); // today
});

test('closed or cancelled tenders never alert', () => {
  assert.equal(openTenderDaysLeft(tender({ lifecycleStatus: 'cancelled' }), NOW), null);
  assert.equal(openTenderDaysLeft(tender({ closingDate: '2026-09-08T16:00:00.000Z' }), NOW), null);
  assert.equal(closingEntryFor(tender({ lifecycleStatus: 'complete', closingDate: '2026-09-01T00:00:00.000Z' }), NOW), null);
});

test('sync adds rows for newly-windowed saves and keeps existing ones stable', () => {
  const inWindow = tender({ closingDate: '2026-09-15T16:00:00.000Z' });
  const outWindow = tender({ id: 't2', closingDate: '2026-09-25T16:00:00.000Z' });

  // First pass: only t1 qualifies.
  const first = syncDeadlineAlerts([], [inWindow, outWindow], NOW);
  assert.equal(first.length, 1);
  assert.equal(first[0].tenderId, 't1');

  // No change → identical array identity (effects won't loop).
  const second = syncDeadlineAlerts(first, [inWindow, outWindow], NOW);
  assert.equal(second, first);

  // Unsaved / closed tenders drop their row.
  const removed = syncDeadlineAlerts(first, [], NOW);
  assert.equal(removed.length, 0);
});

test('trial rows appear only within the final 3 days', () => {
  const trial = { active: true, daysLeft: 2, endsAtIso: '2026-09-11T00:00:00.000Z' };
  const row = trialEntryFor(trial, NOW);
  assert.ok(row);
  assert.equal(row.id, 'system:trial-ending');
  assert.ok(row.body.includes('11 Sep'));

  assert.equal(trialEntryFor({ ...trial, daysLeft: 4 }, NOW), null);
  assert.equal(trialEntryFor({ ...trial, active: false }, NOW), null);
  assert.equal(trialEntryFor(null, NOW), null);
  assert.equal(trialEntryFor({ ...trial, daysLeft: 0 }, NOW)?.title.includes('has ended'), true);
});

test('addEntries logs only genuinely new event ids', () => {
  const a = entry();
  const dup = entry();
  const other = entry({ id: 'match:t2', kind: 'match', tenderId: 't2' });
  const next = addEntries([a], [dup, other]);
  assert.equal(next.length, 2);
  assert.equal(next[1].id, 'match:t2');
});

test('mutes hide a kind and counts respect them', () => {
  const rows = [
    entry({ id: 'closing:t1', kind: 'closing', tenderId: 't1' }),
    entry({ id: 'match:t2', kind: 'match', tenderId: 't2' }),
    entry({ id: 'match:t3', kind: 'match', tenderId: 't3', read: true }),
  ];
  assert.equal(visibleOf(rows, 'all', []).length, 3);
  assert.equal(visibleOf(rows, 'all', ['match']).length, 1);

  const counts = tabCounts(rows, []);
  assert.deepEqual(counts, { all: 2, matches: 1, tenders: 1, system: 0 });
  assert.equal(tabCounts(rows, ['match']).matches, 0);
  assert.equal(toggleMute(['match'], 'match').length, 0);
  assert.equal(toggleMute([], 'match')[0], 'match');
});

test('closing-today rows pin above newer entries; otherwise newest first', () => {
  const rows = [
    entry({ id: 'closing:t1', createdAt: '2026-09-09T10:00:00.000Z' }),
    entry({ id: 'match:t9', kind: 'match', tenderId: 't9', createdAt: '2026-09-09T11:00:00.000Z' }),
  ];
  // t1 closes today per the lookup.
  const sorted = sortEntries(rows, NOW, () => 0);
  assert.equal(sorted[0].id, 'closing:t1');
  const sorted2 = sortEntries(rows, NOW, () => 5);
  assert.equal(sorted2[0].id, 'match:t9');
});

test('read actions are real and idempotent', () => {
  const rows = [entry(), entry({ id: 'match:t2', kind: 'match', tenderId: 't2' })];
  assert.equal(unreadCount(rows), 2);

  const oneRead = markRead(rows, 'closing:t1');
  assert.equal(unreadCount(oneRead), 1);
  assert.equal(markRead(oneRead, 'closing:t1'), oneRead); // already read → no-op identity

  const allRead = markAllRead(oneRead);
  assert.equal(unreadCount(allRead), 0);
  assert.equal(markAllRead(allRead), allRead);
});
