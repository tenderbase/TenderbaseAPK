import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCommercialAnalysis } from '@/lib/opportunities/score';

function tender(valueCents = null) {
  return {
    id: 't-1',
    title: 'Construction works',
    description: 'Civil works',
    category: 'Construction',
    categoryRaw: 'Construction',
    province: 'KwaZulu-Natal',
    location: 'Durban',
    organisation: 'Test Municipality',
    valueCents,
    documents: [],
  };
}

test('undisclosed tender value is a normal commercial state', () => {
  const result = getCommercialAnalysis(tender(null));
  assert.equal(result.valueStatus, 'not_disclosed');
  assert.equal(result.publishedValueCents, null);
  assert.equal(result.confidence, 'not_available');
  assert.equal(result.attractiveness, 'not_assessable');
  assert.ok(result.notes.some((note) => note.includes('does not reduce')));
});

test('published value is commercial context, not a fit signal', () => {
  const result = getCommercialAnalysis(tender(125000000));
  assert.equal(result.valueStatus, 'published');
  assert.equal(result.publishedValueCents, 125000000);
  assert.equal(result.confidence, 'high');
});
