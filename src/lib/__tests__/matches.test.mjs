import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FIXTURE_TENDERS } from '@/lib/fixtures/tender-api';
import { scoreTender, scoreTenders, matchReadiness } from '@/lib/matches';

// Fixture tenders are ApiTender rows, not adapted — adapt one through the
// same fields the UI uses (title, description, province, categoryRaw…).
const tender = (id) => {
  const t = FIXTURE_TENDERS.results[id];
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? '',
    organisation: t.organisation ?? '',
    province: t.province ?? null,
    location: t.location ?? null,
    categoryRaw: t.category ?? null,
    category: t.category ?? 'Other',
    isSaved: false,
    savedAt: null,
    matchScore: null,
    tenderNumber: t.tenderNumber ?? '',
    closingDate: t.closingDate ?? '',
    publishedDate: t.publishedDate ?? '',
    valueCents: t.valueCents ?? null,
    lifecycleStatus: null,
    sourceUrl: null,
    documents: [],
    contactInformation: null,
  };
};

test('a tender with no matching signal scores zero and carries no reasons', () => {
  const t = tender(0);
  const { score, reasons } = scoreTender(t, { preferences: { categories: ['Medical'] }, profile: { province: 'Limpopo' } });
  assert.equal(score, 0);
  assert.equal(reasons.length, 0);
});

test('category preference produces a true category reason', () => {
  // Find a fixture whose description mentions construction-ish terms.
  const t = tender(0);
  const ctx = {
    preferences: { categories: ['Construction'] },
    profile: null,
  };
  const { reasons } = scoreTender(t, ctx);
  if (t.description?.toLowerCase().includes('construction') || t.title.toLowerCase().includes('construction')) {
    assert.ok(reasons.some((r) => r.kind === 'category'), 'expected a category reason for construction text');
    assert.ok(reasons.some((r) => r.label === 'Construction'));
  } else {
    assert.equal(reasons.length, 0, 'no category should match non-construction copy');
  }
});

test('province preference produces a province reason', () => {
  const kzn = FIXTURE_TENDERS.results.find((t) => t.province === 'KwaZulu-Natal');
  assert.ok(kzn, 'fixture set contains a KZN tender');
  const t = tender(FIXTURE_TENDERS.results.indexOf(kzn));
  const { score, reasons } = scoreTender(t, {
    preferences: { provinces: ['KwaZulu-Natal'] },
    profile: null,
  });
  assert.ok(reasons.some((r) => r.kind === 'province' && r.label === 'KwaZulu-Natal'));
  assert.ok(score > 0);
});

test('profile province matches when preferences carry no provinces', () => {
  const kzn = FIXTURE_TENDERS.results.find((t) => t.province === 'KwaZulu-Natal');
  const t = tender(FIXTURE_TENDERS.results.indexOf(kzn));
  const { score } = scoreTender(t, {
    preferences: { categories: [] },
    profile: { province: 'KwaZulu-Natal', legalName: 'Test Co' },
  });
  assert.ok(score > 0);
});

test('ranked list is best-first and drops zero-reason tenders', () => {
  const tenders = FIXTURE_TENDERS.results.slice(0, 5).map((_, i) => tender(i));
  const matches = scoreTenders(tenders, {
    preferences: { provinces: ['KwaZulu-Natal'], categories: [] },
    profile: null,
  });
  for (let i = 1; i < matches.length; i++) {
    assert.ok(matches[i - 1].score >= matches[i].score, 'list sorted descending');
  }
  assert.ok(matches.every((m) => m.reasons.length > 0), 'every match has reasons');
});

test('matchReadiness reports what is missing', () => {
  assert.equal(matchReadiness({ profile: null, preferences: null }).ready, false);
  const r = matchReadiness({
    profile: { legalName: 'Zizi Construction', province: 'KwaZulu-Natal' },
    preferences: { categories: ['Construction'] },
  });
  assert.equal(r.ready, true);
  assert.equal(r.missing.length, 0);
});
