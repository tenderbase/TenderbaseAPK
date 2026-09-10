import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ONBOARDING_CHOICES,
  isOnboardingChoice,
  proOffer,
  safeNext,
  welcomeHref,
} from '@/lib/onboarding';

test('only the two real choices are accepted', () => {
  for (const c of ONBOARDING_CHOICES) assert.equal(isOnboardingChoice(c), true);
  assert.equal(isOnboardingChoice('basic '), false);
  assert.equal(isOnboardingChoice('PRO'), false);
  assert.equal(isOnboardingChoice('premium'), false);
  assert.equal(isOnboardingChoice(null), false);
  assert.equal(isOnboardingChoice(undefined), false);
});

test('safeNext keeps same-site paths and refuses everything else', () => {
  assert.equal(safeNext('/'), '/');
  assert.equal(safeNext('/saved?tab=searches'), '/saved?tab=searches');
  // A user who has just authenticated must not be redirectable off-site.
  assert.equal(safeNext('//evil.example'), '/');
  assert.equal(safeNext('/\\evil.example'), '/');
  assert.equal(safeNext('https://evil.example'), '/');
  assert.equal(safeNext('javascript:alert(1)'), '/');
  assert.equal(safeNext(''), '/');
  assert.equal(safeNext(null), '/');
  assert.equal(safeNext(undefined, '/pro'), '/pro');
});

test('welcomeHref carries the return path, and stays bare for home', () => {
  assert.equal(welcomeHref(null), '/welcome');
  assert.equal(welcomeHref('/'), '/welcome');
  assert.equal(welcomeHref('/alerts'), '/welcome?next=%2Falerts');
  // Off-site targets are dropped, not forwarded.
  assert.equal(welcomeHref('//evil.example'), '/welcome');
});

test('a subscribed account is never sold Pro again', () => {
  assert.equal(proOffer({ subscribed: true, trialReady: false, checkoutReady: false }), 'active');
  assert.equal(proOffer({ subscribed: true, trialReady: true, checkoutReady: true }), 'active');
});

test('the trial is offered only when the server says it is available', () => {
  assert.equal(proOffer({ subscribed: false, trialReady: true, checkoutReady: false }), 'trial');
  assert.equal(proOffer({ subscribed: false, trialReady: true, checkoutReady: true }), 'trial');
});

test('without a trial left we offer checkout, and say so when we cannot', () => {
  assert.equal(proOffer({ subscribed: false, trialReady: false, checkoutReady: true }), 'subscribe');
  assert.equal(proOffer({ subscribed: false, trialReady: false, checkoutReady: false }), 'unavailable');
});
