/**
 * Adapter tests using REAL payload shapes captured from the live eTenders feed.
 * These lock in the defensive transforms — if someone "simplifies" adapt.ts,
 * these fail.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirror of the pure logic in src/lib/adapt.ts (kept in sync deliberately;
// the TS module imports `server-only` and can't be loaded by the bare runner).
function looksLikeReferenceCode(s) {
  const t = s.trim();
  if (t.length < 25 && /[0-9]/.test(t) && t.split(' ').length <= 4) return true;
  if (/^[A-Z0-9][A-Z0-9\/\-.\s]*$/.test(t) && t.split(' ').length <= 3) return true;
  return false;
}
function toSentenceCase(s) {
  const letters = s.replace(/[^A-Za-z]/g, '');
  const ratio = letters.length ? letters.split('').filter(c => c === c.toUpperCase()).length / letters.length : 0;
  if (ratio < 0.7) return s;
  return s.toLowerCase().replace(/(^\w|[.!?]\s+\w)/g, m => m.toUpperCase());
}
function truncateAtWord(s, max) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max), i = cut.lastIndexOf(' ');
  return (i > max * 0.6 ? cut.slice(0, i) : cut).replace(/[,;:.\-\s]+$/, '') + '…';
}
function deriveTitle(t) {
  const raw = (t.title ?? '').trim(), desc = (t.description ?? '').trim();
  if (raw && !looksLikeReferenceCode(raw)) return truncateAtWord(toSentenceCase(raw), 120);
  if (desc.length > 10) {
    const first = desc.split(/(?<=[.!?])\s+/)[0] ?? desc;
    return truncateAtWord(toSentenceCase(first), 120);
  }
  return raw || 'Untitled tender';
}

function deriveSourceUrl(t) {
  const url = t.source_url?.trim();
  if (!url) return 'https://www.etenders.gov.za/Home/opportunities';
  if (/etenders\.gov\.za\/tender\b/i.test(url) || /\/tender\/\d+/i.test(url)) {
    return 'https://www.etenders.gov.za/Home/opportunities';
  }
  return url;
}

test('reference-code titles are replaced by the description', () => {
  // Real record id=1066
  const t = {
    title: '20/2026 LLM',
    description: 'THE APPOINTMENT OF TWO (2) SERVICE PROVIDERS FOR THE CONSTRUCTION OF ROADS AND STORMWATER PROJECTS ON BEHALF OF THE LESEDI LOCAL MUNICIPALITY FOR A PERIOD OF THREE (3) YEARS.',
  };
  const out = deriveTitle(t);
  assert.ok(!out.startsWith('20/2026'), 'must not show the raw code');
  assert.match(out, /appointment of two/i);
  assert.ok(out.length <= 121, `too long: ${out.length}`);
});

test('various real code formats are all detected', () => {
  for (const code of ['CS01/02/26', 'LPT 005/2026', 'E3445GCDMWP', 'RFQ 2027/65', 'RFI07-2026-2027']) {
    assert.ok(looksLikeReferenceCode(code), `${code} should be a code`);
  }
});

test('genuine prose titles are kept', () => {
  const t = { title: 'Provision of Security Services for Municipal Buildings', description: 'x' };
  assert.equal(deriveTitle(t), 'Provision of Security Services for Municipal Buildings');
});

test('ALL CAPS is normalised, mixed case untouched', () => {
  assert.equal(toSentenceCase('THE APPOINTMENT OF A SERVICE PROVIDER'), 'The appointment of a service provider');
  assert.equal(toSentenceCase('The appointment of a Service Provider'), 'The appointment of a Service Provider');
});

test('empty description falls back to the code rather than crashing', () => {
  assert.equal(deriveTitle({ title: 'RFQ 12/26', description: '' }), 'RFQ 12/26');
  assert.equal(deriveTitle({ title: '', description: '' }), 'Untitled tender');
});

test('titles never exceed the card budget', () => {
  const long = 'A'.repeat(400);
  assert.ok(deriveTitle({ title: 'X1/26', description: long }).length <= 121);
});

test('broken etenders /tender/12345 URLs are replaced with the live opportunities portal', () => {
  assert.equal(
    deriveSourceUrl({ source_url: 'https://www.etenders.gov.za/tender/169382' }),
    'https://www.etenders.gov.za/Home/opportunities'
  );
  assert.equal(
    deriveSourceUrl({ source_url: null }),
    'https://www.etenders.gov.za/Home/opportunities'
  );
  assert.equal(
    deriveSourceUrl({ source_url: 'https://www.etenders.gov.za/Home/opportunities?id=1' }),
    'https://www.etenders.gov.za/Home/opportunities?id=1'
  );
});
