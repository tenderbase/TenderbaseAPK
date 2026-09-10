import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  closingWord,
  quickSummaryBullets,
  noticeRiskFlags,
  starterQuestions,
} from '@/lib/notice-analysis';

// Fixed "today" so assertions never drift with the wall clock.
const NOW = new Date('2026-09-09T12:00:00.000Z');

const base = {
  id: 't1',
  tenderNumber: 'RFQ-001',
  title: 'Supply of laptops',
  organisation: 'Provincial Treasury',
  category: 'IT & Technology',
  province: 'KwaZulu-Natal',
  location: 'Durban, KwaZulu-Natal',
  locationFull: '1 City Hall - Durban - 4000',
  valueCents: null,
  publishedDate: '2026-09-05',
  closingDate: '2026-09-21T16:00:00.000Z',
  sourceUrl: null,
  lifecycleStatus: 'active',
  documents: [],
  contactInformation: null,
};

const tender = (overrides = {}) => ({ ...base, ...overrides });

test('closingWord speaks deadline language, never cold dates', () => {
  assert.equal(closingWord('2026-09-09T16:00:00.000Z', NOW), 'today');
  assert.equal(closingWord('2026-09-10T16:00:00.000Z', NOW), 'tomorrow');
  assert.equal(closingWord('2026-09-21T16:00:00.000Z', NOW), 'in 12 days');
  assert.equal(closingWord('2026-09-01T16:00:00.000Z', NOW), 'Closed');
});

test('quickSummaryBullets are true statements from the notice', () => {
  const bullets = quickSummaryBullets(tender(), NOW);
  assert.ok(bullets.some((b) => b.text.startsWith('Closes in 12 days')));
  assert.ok(bullets.some((b) => b.text.includes('21 Sep 2026')));
  assert.ok(bullets.some((b) => b.text.startsWith('Published ')));
  assert.ok(bullets.some((b) => b.text.includes('1 City Hall - Durban - 4000')));
  // Value withheld => honest "not disclosed", never an invented figure.
  assert.ok(bullets.some((b) => b.text === 'Value not disclosed by the issuer'));
});

test('quickSummaryBullets reflect documents and contact honestly', () => {
  const withDocs = tender({
    documents: [
      { id: 'd1', name: 'Bid pack.pdf', fileType: 'PDF', sizeBytes: 1, updatedAt: '', url: '', isAddendum: false },
      { id: 'd2', name: 'Amendment 1.pdf', fileType: 'PDF', sizeBytes: 1, updatedAt: '', url: '', isAddendum: true },
    ],
    contactInformation: { department: null, contactPerson: 'A Person', email: 'a@x.co.za', phone: null },
  });
  const bullets = quickSummaryBullets(withDocs, NOW);
  assert.ok(bullets.some((b) => b.text === '2 documents in the pack · 1 amended'));
  assert.ok(bullets.some((b) => b.text === 'Issuer contact published — see Contact below'));

  const none = quickSummaryBullets(tender({ documents: [] }), NOW);
  assert.ok(none.some((b) => b.text === 'No documents published yet'));
});

test('risk flags: short window, amendments and hidden value all surface', () => {
  const risky = noticeRiskFlags(
    tender({ closingDate: '2026-09-11T16:00:00.000Z', valueCents: null }),
    2,
    NOW,
  );
  assert.ok(risky.some((f) => f.severity === 'amber' && f.text.includes('closes in 2 days')));
  assert.ok(risky.some((f) => f.text.includes('Amended 2×')));
  assert.ok(risky.some((f) => f.text.includes('Value not disclosed')));
  assert.ok(risky.some((f) => f.severity === 'red' && f.text.includes('closes tomorrow')) === false);
});

test('risk flags: extreme urgency is red, not amber', () => {
  const urgent = noticeRiskFlags(
    tender({ closingDate: '2026-09-10T16:00:00.000Z' }),
    0,
    NOW,
  );
  assert.ok(urgent.some((f) => f.severity === 'red' && f.text.includes('closes tomorrow')));
});

test('risk flags: a clean notice says so instead of inventing risk', () => {
  const clean = noticeRiskFlags(
    tender({ closingDate: '2026-09-21T16:00:00.000Z', valueCents: 2_500_000_00, documents: [base.documents[0] ?? { id: 'd', name: 'x.pdf', fileType: 'PDF', sizeBytes: 1, updatedAt: '', url: '', isAddendum: false }] }),
    0,
    NOW,
  );
  assert.deepEqual(clean, [{ severity: 'none', text: 'No notice-level risk flags' }]);
});

test('cancelled tenders only ever report the cancellation', () => {
  const flags = noticeRiskFlags(tender({ lifecycleStatus: 'cancelled', closingDate: '2026-09-10T16:00:00.000Z' }), 3, NOW);
  assert.deepEqual(flags, [{ severity: 'red', text: 'Cancelled — do not bid' }]);
});

test('starterQuestions are generic and issuer-safe', () => {
  const qs = starterQuestions();
  assert.equal(qs.length, 3);
  assert.ok(qs.every((q) => q.endsWith('?')));
});
