import { test } from 'node:test';
import assert from 'node:assert/strict';

import { docsOfSaved, orgsOfSaved } from '@/lib/saved-hub';

const doc = (id, name, isAddendum = false) => ({
  id, name, fileType: 'PDF', sizeBytes: 1024, updatedAt: '', url: `https://x/${id}`, isAddendum,
});

const tender = (id, title, organisation, documents) => ({
  id, title, organisation, tenderNumber: `RFQ-${id}`, category: 'Other', province: 'KwaZulu-Natal',
  location: 'Durban', valueCents: null, publishedDate: '', closingDate: '', sourceUrl: null,
  documents, contactInformation: null, isSaved: true, savedAt: null, matchScore: null,
});

const saved = (t) => ({ tenderId: t.id, savedAt: '2026-09-09T00:00:00Z', tender: t });

test('docsOfSaved flattens every saved tender document with its tender context', () => {
  const rows = [
    saved(tender('t1', 'Build a school', 'Dept of Works', [doc('d1', 'Bid pack.pdf'), doc('d2', 'Amendment 1.pdf', true)])),
    saved(tender('t2', 'Supply laptops', 'Provincial Treasury', [doc('d3', 'Specs.pdf')])),
    saved(tender('t3', 'No docs', 'Quiet Org', [])),
  ];
  const docs = docsOfSaved(rows);
  assert.equal(docs.length, 3);
  assert.deepEqual(
    docs.map((d) => `${d.tenderId}:${d.doc.name}`),
    ['t1:Bid pack.pdf', 't1:Amendment 1.pdf', 't2:Specs.pdf'],
  );
  assert.equal(docs[0].tenderTitle, 'Build a school');
});

test('orgsOfSaved groups issuers with real counts, sorted by name', () => {
  const rows = [
    saved(tender('t1', 'A', 'Dept of Works', [])),
    saved(tender('t2', 'B', 'Dept of Works', [])),
    saved(tender('t3', 'C', 'Acme', [])),
  ];
  const orgs = orgsOfSaved(rows);
  assert.equal(orgs.length, 2);
  assert.deepEqual(orgs.map((o) => o.name), ['Acme', 'Dept of Works']);
  assert.equal(orgs[1].savedCount, 2);
  assert.equal(orgs[1].tenderId, 't1'); // first-seen stays the deep-link target
});

test('orgsOfSaved ignores tenders without an issuer', () => {
  const rows = [saved(tender('t1', 'A', '  ', []))];
  assert.deepEqual(orgsOfSaved(rows), []);
});
