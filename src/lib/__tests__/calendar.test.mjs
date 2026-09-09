import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildTenderIcs } from '@/lib/calendar';

const tender = {
  id: 'cmtt6lx56000142xs7i6g1dkg',
  tenderNumber: 'RFQ-12214',
  title: 'Design services, RFQ: furniture',
  organisation: 'Airports Company of SA',
  closingDate: '2026-09-21T16:00:00.000Z',
  sourceUrl: 'https://www.etenders.gov.za/Home/opportunities',
};

test('buildTenderIcs emits a well-formed one-hour closing event', () => {
  const out = buildTenderIcs(tender);
  assert.ok(out);
  assert.equal(out.fileName, `tenderbase-${tender.id}.ics`);
  assert.ok(out.ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(out.ics.includes('END:VCALENDAR\r\n'));
  assert.ok(out.ics.includes('DTSTART:20260921T160000Z'));
  assert.ok(out.ics.includes('DTEND:20260921T170000Z'));
  assert.ok(out.ics.includes(`UID:closing-${tender.id}@tenderbase.app`));
  assert.ok(out.ics.includes('SUMMARY:Closing: Design services\\, RFQ: furniture'));
});

test('ICS text is escaped so commas and line breaks cannot corrupt the file', () => {
  const tricky = {
    ...tender,
    title: 'Laptops, monitors; "pro" units\n(second line)',
    sourceUrl: null,
  };
  const out = buildTenderIcs(tricky);
  assert.ok(out);
  assert.ok(out.ics.includes('Laptops\\, monitors\\; "pro" units\\n(second line)'));
});

test('an unparseable closing date yields null — the UI then hides the action', () => {
  assert.equal(buildTenderIcs({ ...tender, closingDate: 'not-a-date' }), null);
  assert.equal(buildTenderIcs({ ...tender, closingDate: '' }), null);
});
