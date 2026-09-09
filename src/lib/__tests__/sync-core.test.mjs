import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mergeById, mergeUnique, reconcileSettings, stableJson } from '@/lib/sync-core';

const row = (id, name, extra = {}) => ({ id, name, ...extra });

test('stableJson is key-order independent and nested-safe', () => {
  assert.equal(stableJson({ a: 1, b: { c: 2, d: [1, 2] } }), stableJson({ b: { d: [1, 2], c: 2 }, a: 1 }));
  assert.notEqual(stableJson({ a: 1 }), stableJson({ a: 2 }));
  assert.equal(stableJson([3, { a: 1 }]), stableJson([3, { a: 1 }]));
});

test('mergeById unions local-only, remote-only and conflicted rows', () => {
  const local = [row('l1', 'Local search'), row('both', 'Local edit', { p: 1 })];
  const remote = [row('r1', 'From another device'), row('both', 'Remote original', { p: 9 })];

  const { merged, toUpsert } = mergeById(local, remote, (r) => r.id);

  // remote-only first, then locals (locals win id conflicts)
  assert.deepEqual(
    merged.map((r) => r.id),
    ['r1', 'l1', 'both'],
  );
  assert.equal(merged.find((r) => r.id === 'both').name, 'Local edit');

  // local rows missing remotely, plus the changed 'both' row
  assert.deepEqual(
    toUpsert.map((r) => r.id),
    ['l1', 'both'],
  );
});

test('mergeById does not upsert identical local rows', () => {
  const same = row('x', 'Same');
  const { toUpsert } = mergeById([same], [row('x', 'Same', { p: undefined })], (r) => r.id);
  assert.deepEqual(toUpsert, []);
});

test('mergeById handles empty sides', () => {
  const a = mergeById([], [row('r', 'Remote')], (r) => r.id);
  assert.deepEqual(a.merged.map((r) => r.id), ['r']);
  assert.deepEqual(a.toUpsert, []);

  const b = mergeById([row('l', 'Local')], [], (r) => r.id);
  assert.deepEqual(b.merged.map((r) => r.id), ['l']);
  assert.deepEqual(b.toUpsert.map((r) => r.id), ['l']);
});

test('mergeById with equal content on both sides pushes nothing extra', () => {
  const l = row('s', 'Same content', { q: 'pumps' });
  const r = row('s', 'Same content', { q: 'pumps' });
  const { toUpsert } = mergeById([l], [r], (x) => x.id);
  assert.deepEqual(toUpsert, []);
});

test('mergeUnique unions with local order first and no duplicates', () => {
  assert.deepEqual(
    mergeUnique(['b', 'a'], ['a', 'c']),
    ['b', 'a', 'c'],
  );
  assert.deepEqual(mergeUnique([], ['c', 'd']), ['c', 'd']);
  assert.deepEqual(mergeUnique([], []), []);
});

test('reconcileSettings: remote row wins, first sync pushes local', () => {
  // Account already has a row — that is the newest explicit state anywhere.
  assert.deepEqual(reconcileSettings(['closing'], ['system']), { adopt: ['system'], push: false, unresolved: false });
  assert.deepEqual(reconcileSettings(['closing'], []), { adopt: [], push: false, unresolved: false });

  // No remote row yet — first sync: adopt local and push it.
  assert.deepEqual(reconcileSettings(['closing'], null), { adopt: ['closing'], push: true, unresolved: false });
  assert.deepEqual(reconcileSettings([], null), { adopt: [], push: false, unresolved: false });
});

test('reconcileSettings: unknown remote state never touches local or remote', () => {
  // A fetch failure must NOT read as "no row" — that would push local mutes
  // over an existing account row (or vice-versa). Nothing adopted, nothing
  // pushed, caller retries later.
  assert.deepEqual(reconcileSettings(['closing'], undefined), {
    adopt: null,
    push: false,
    unresolved: true,
  });
});
