import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyseOpportunity, rankOpportunities } from '@/lib/opportunities/score';

function tender(overrides = {}) {
  return {
    id: 't-1',
    tenderNumber: 'TB-001',
    title: 'Road rehabilitation and construction works',
    description: 'Civil infrastructure works in KwaZulu-Natal.',
    organisation: 'Test Municipality',
    category: 'Construction',
    categoryRaw: 'Construction',
    province: 'KwaZulu-Natal',
    location: 'Durban, KwaZulu-Natal',
    locationFull: null,
    valueCents: null,
    publishedDate: '2026-09-01T00:00:00Z',
    closingDate: '2026-09-20T12:00:00Z',
    sourceUrl: null,
    documents: [{ id: 'd1', name: 'pack.pdf', fileType: 'pdf', sizeBytes: 100, updatedAt: '2026-09-01T00:00:00Z', url: '#', isAddendum: false }],
    contactInformation: null,
    lifecycleStatus: 'active',
    cidbGrade: null,
    firstSeenAt: null,
    isSaved: false,
    savedAt: null,
    matchScore: null,
    ...overrides,
  };
}

const context = {
  profile: { legalName: 'Example Construction', city: 'Durban', province: 'KwaZulu-Natal', cidbGrading: '6GB', bbbeeLevel: 2 },
  preferences: { categories: ['Construction'], provinces: ['KwaZulu-Natal'] },
};

test('opportunity analysis preserves explainable match score and adds verified context', () => {
  const fit = analyseOpportunity(tender(), { ...context, now: new Date('2026-09-10T12:00:00Z') });
  assert.equal(fit.score, 97);
  assert.equal(fit.confidence, 'high');
  assert.ok(fit.positives.some((s) => s.kind === 'category'));
  assert.ok(fit.positives.some((s) => s.kind === 'province'));
  assert.ok(fit.positives.some((s) => s.kind === 'locality'));
  assert.ok(fit.positives.some((s) => s.kind === 'documents'));
});

test('deadline warning is generated without changing the underlying match score', () => {
  const fit = analyseOpportunity(tender({ closingDate: '2026-09-12T12:00:00Z' }), { ...context, now: new Date('2026-09-10T12:00:00Z') });
  assert.equal(fit.score, 97);
  assert.ok(fit.concerns.some((s) => s.kind === 'deadline'));
});

test('missing company compliance profile fields are surfaced instead of guessed', () => {
  const fit = analyseOpportunity(tender(), {
    preferences: { categories: ['Construction'], provinces: ['KwaZulu-Natal'] },
    profile: { legalName: 'Example Construction' },
    now: new Date('2026-09-10T12:00:00Z'),
  });
  assert.ok(fit.missingProfileData.includes('CIDB grading'));
  assert.ok(fit.missingProfileData.includes('B-BBEE level'));
});

test('ranking is deterministic and best-first', () => {
  const results = rankOpportunities([
    tender({ id: 'strong' }),
    tender({ id: 'weak', province: 'Gauteng', location: 'Johannesburg, Gauteng', category: 'Other', categoryRaw: 'Other' }),
  ], { ...context, now: new Date('2026-09-10T12:00:00Z') });
  assert.equal(results[0].tender.id, 'strong');
  assert.ok(results[0].fit.score >= results[results.length - 1].fit.score);
});
