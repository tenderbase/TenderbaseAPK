/**
 * Citation-mapping and quota-handling tests.
 * These are the parts most likely to silently corrupt an AI answer, so they
 * are pinned here rather than left to manual inspection.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror of the citation mapping in src/lib/ai.ts
function mapCitations(keyPoints, doc) {
  const pages = [...new Set(keyPoints.map(p => p.page).filter(p => p > 0))].sort((a,b)=>a-b);
  const citations = pages.map((page, i) => ({
    index: i + 1, documentId: doc.id, documentName: doc.name,
    pageRange: `Page ${page} · ${doc.fileType}`,
  }));
  return {
    citations,
    keyPoints: keyPoints.map(p => ({
      text: p.text,
      citationIndex: p.page > 0 ? pages.indexOf(p.page) + 1 : null,
    })),
  };
}

const DOC = { id: '914', name: 'A042 Security Services.pdf', fileType: 'PDF' };

test('citation markers are sequential and resolve to a real source', () => {
  // Real page numbers from the Newcastle tender Gemini actually returned.
  const out = mapCitations([
    { text: '36-month external security services contract.', page: 1 },
    { text: 'Compulsory briefing 16 September at Newcastle Town Hall.', page: 5 },
    { text: 'Non-refundable document fee of R300.', page: 5 },
    { text: 'Evaluated on the 90/10 preference points system.', page: 12 },
  ], DOC);

  assert.deepEqual(out.citations.map(c => c.index), [1, 2, 3]);
  // Same page must reuse the same marker, not create a duplicate source.
  assert.equal(out.keyPoints[1].citationIndex, out.keyPoints[2].citationIndex);
  assert.equal(out.citations.length, 3, 'three distinct pages -> three sources');
});

test('every citation index points at an existing source', () => {
  const out = mapCitations([
    { text: 'a', page: 7 }, { text: 'b', page: 2 }, { text: 'c', page: 99 },
  ], DOC);
  for (const kp of out.keyPoints) {
    assert.ok(out.citations.some(c => c.index === kp.citationIndex),
      `dangling citation ${kp.citationIndex}`);
  }
});

test('pages are ordered, so markers ascend through the document', () => {
  const out = mapCitations([
    { text: 'late', page: 40 }, { text: 'early', page: 3 },
  ], DOC);
  assert.equal(out.citations[0].pageRange, 'Page 3 · PDF');
  assert.equal(out.citations[1].pageRange, 'Page 40 · PDF');
});

test('unknown page (0) yields no citation rather than a fake one', () => {
  const out = mapCitations([{ text: 'unsourced claim', page: 0 }], DOC);
  assert.equal(out.keyPoints[0].citationIndex, null);
  assert.equal(out.citations.length, 0);
});

// --- quota classification -------------------------------------------------
function isDailyCap(errorBody) {
  return Boolean(errorBody?.error?.details?.some(d =>
    d.violations?.some(v => /PerDay/i.test(v.quotaId ?? ''))));
}

test('daily quota is distinguished from per-minute rate limiting', () => {
  // Real 429 payload from this project's key.
  const daily = { error: { code: 429, details: [ { violations: [
    { quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' } ] } ] } };
  const perMinute = { error: { code: 429, details: [ { violations: [
    { quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier', quotaValue: '10' } ] } ] } };

  assert.equal(isDailyCap(daily), true, 'daily cap must not be retried');
  assert.equal(isDailyCap(perMinute), false, 'per-minute cap should be retried');
});

// --- paged context --------------------------------------------------------
function buildPagedContext(pages, maxChars) {
  const parts = []; let used = 0;
  for (const p of pages) {
    const block = `\n\n[PAGE ${p.page}]\n${p.text}`;
    if (used + block.length > maxChars) break;
    parts.push(block); used += block.length;
  }
  return parts.join('');
}

test('paged context tags pages and respects the token budget', () => {
  const pages = Array.from({ length: 103 }, (_, i) => ({ page: i + 1, text: 'x'.repeat(2000) }));
  const ctx = buildPagedContext(pages, 20000);
  assert.ok(ctx.includes('[PAGE 1]'));
  assert.ok(ctx.length <= 20000, `budget exceeded: ${ctx.length}`);
  assert.ok(!ctx.includes('[PAGE 103]'), 'must truncate long documents');
});
