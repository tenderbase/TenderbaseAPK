import { test } from 'node:test';
import assert from 'node:assert/strict';

import { REASON_COPY, entitlementFromSubscription } from '@/lib/entitlement';

const NOW = new Date('2026-09-09T12:00:00.000Z');
const FUTURE = '2026-09-20T12:00:00.000Z';
const PAST = '2026-09-01T12:00:00.000Z';

const sub = (overrides = {}) => ({
  plan: 'pro-monthly',
  status: 'active',
  currentPeriodEnd: FUTURE,
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
  ...overrides,
});

test('no subscription means a signed-in Basic account, never Pro', () => {
  assert.deepEqual(entitlementFromSubscription(null, NOW), {
    tier: 'basic',
    trialEnd: null,
    reason: 'no_subscription',
  });
});

test('an unexpired trial grants Pro and reports when it ends', () => {
  const ent = entitlementFromSubscription(
    sub({ status: 'trialing', trialEndsAt: FUTURE, currentPeriodEnd: FUTURE }),
    NOW,
  );
  assert.equal(ent.tier, 'pro');
  assert.equal(ent.trialEnd, FUTURE);
  assert.equal(ent.reason, 'active_trial');
});

test('a lapsed trial drops to Basic, even before anything else runs', () => {
  const ent = entitlementFromSubscription(
    sub({ status: 'trialing', trialEndsAt: PAST, currentPeriodEnd: PAST }),
    NOW,
  );
  assert.equal(ent.tier, 'basic');
  assert.equal(ent.trialEnd, null);
  assert.equal(ent.reason, 'trial_ended');
});

test('the trial ends exactly at its end instant, not a moment later', () => {
  const atEnd = entitlementFromSubscription(
    sub({ status: 'trialing', trialEndsAt: '2026-09-09T12:00:00.000Z' }),
    NOW,
  );
  assert.equal(atEnd.tier, 'basic');
});

test('a trialing row with no dates is treated as valid (no evidence it lapsed)', () => {
  const ent = entitlementFromSubscription(
    sub({ status: 'trialing', trialEndsAt: null, currentPeriodEnd: null }),
    NOW,
  );
  assert.equal(ent.tier, 'pro');
  assert.equal(ent.reason, 'active_trial');
});

test('an active subscription grants Pro', () => {
  const ent = entitlementFromSubscription(sub(), NOW);
  assert.deepEqual(ent, { tier: 'pro', trialEnd: null, reason: 'subscribed' });
});

test('a paid period that has ended drops the account to Basic', () => {
  const ent = entitlementFromSubscription(sub({ currentPeriodEnd: PAST }), NOW);
  assert.equal(ent.tier, 'basic');
  assert.equal(ent.reason, 'subscription_ended');
});

test('cancel-at-period-end keeps Pro until the paid period is over', () => {
  const stillPaid = entitlementFromSubscription(sub({ cancelAtPeriodEnd: true }), NOW);
  assert.equal(stillPaid.tier, 'pro');
  assert.equal(stillPaid.reason, 'cancel_at_period_end');

  const lapsed = entitlementFromSubscription(
    sub({ cancelAtPeriodEnd: true, currentPeriodEnd: PAST }),
    NOW,
  );
  assert.equal(lapsed.tier, 'basic');
});

test('cancelled and expired rows are Basic', () => {
  for (const status of ['cancelled', 'expired']) {
    const ent = entitlementFromSubscription(sub({ status }), NOW);
    assert.equal(ent.tier, 'basic');
    assert.equal(ent.reason, 'subscription_ended');
  }
});

test('an undated active row stays Pro (PayFast is what says otherwise)', () => {
  const ent = entitlementFromSubscription(sub({ currentPeriodEnd: null }), NOW);
  assert.equal(ent.tier, 'pro');
  assert.equal(ent.reason, 'subscribed');
});

test('every reason has user-facing copy', () => {
  const reasons = ['active_trial', 'trial_ended', 'subscribed', 'cancel_at_period_end', 'subscription_ended', 'no_subscription'];
  for (const r of reasons) {
    assert.ok(REASON_COPY[r] && REASON_COPY[r].length > 0, `missing copy for ${r}`);
  }
});
