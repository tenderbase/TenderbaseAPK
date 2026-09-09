/**
 * Adapter tests against REAL payloads.
 *
 * These import the actual `src/lib/adapt.ts` rather than a hand-copied mirror
 * of it (see `resolver.mjs` for why the mirror existed and why it is gone), and
 * assert against the verbatim captures in `src/lib/fixtures/tender-api.ts` —
 * live records pulled from https://tenderbase-api-rqrh.onrender.com on
 * 2026-09-08, not invented ones.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  adaptContact,
  adaptDetail,
  adaptDocument,
  adaptProvinces,
  adaptTender,
  adaptTenderWithState,
  categoriesInUse,
  deriveCategory,
  deriveCity,
  deriveFileType,
  deriveLocation,
  deriveProvince,
  deriveSourceUrl,
  deriveTitle,
} from '@/lib/adapt';
import { FIXTURE_CATEGORIES, FIXTURE_PROVINCES, FIXTURE_TENDERS } from '@/lib/fixtures/tender-api';
import { CATEGORIES } from '@/types/tender';

const byNumber = (n) => FIXTURE_TENDERS.results.find((t) => t.tenderNumber === n);
const UPSTREAM_CATEGORIES = FIXTURE_CATEGORIES.categories.map((c) => c.category);

// ---------------------------------------------------------------------------
// Title — upstream puts a reference code in `title` and the subject in
// `description`. Rendering the code would make every card read "NB096".
// ---------------------------------------------------------------------------

test('reference-code titles are replaced by the description', () => {
  const out = deriveTitle(byNumber('169585'));
  assert.ok(!out.includes('RFQ12214'), `must not show the raw code: ${out}`);
  assert.match(out, /procurement of proffesional services/i);
  assert.ok(out.length <= 121, `too long: ${out.length}`);
});

test('every reference-code title in the live sample is detected and replaced', () => {
  for (const t of FIXTURE_TENDERS.results) {
    const out = deriveTitle(t);
    assert.ok(out.length > 3, `${t.tenderNumber}: derived title too short — "${out}"`);
    assert.ok(!/^(NB|RFQ|RFI|RFP|ZNQ|ORTIA|SPU)\b/.test(out), `${t.tenderNumber}: still a code — "${out}"`);
  }
});

test('the code is not repeated at the start of the derived title', () => {
  // eTenders prefixes the description with the same code we just rejected.
  const out = deriveTitle(byNumber('169397'));
  assert.ok(!out.startsWith('SPU/B/WKLF'), `code leaked into the title: ${out}`);
  assert.match(out, /supply, deliver and installation of mesh fencing/i);
});

test('boilerplate "Request for quotation" prefixes are stripped', () => {
  const out = deriveTitle(byNumber('169450'));
  assert.equal(out, 'Physical security at Lilani Hot springs in KZN');
});

test('genuine prose titles are kept verbatim', () => {
  const t = { title: 'Provision of Security Services for Municipal Buildings', description: 'x' };
  assert.equal(deriveTitle(t), 'Provision of Security Services for Municipal Buildings');
});

test('ALL CAPS is normalised, mixed case untouched', () => {
  assert.equal(
    deriveTitle({ title: 'X1/26', description: 'THE APPOINTMENT OF A SERVICE PROVIDER' }),
    'The appointment of a service provider',
  );
  const mixed = 'Provision of Security Services in Tsolo for a One-Year Contract.';
  assert.equal(deriveTitle(byNumber('169555')), mixed);
});

test('SA acronyms and place names survive sentence-casing', () => {
  const out = deriveTitle(byNumber('169585'));
  assert.match(out, /King Phalo/, `proper noun flattened: ${out}`);

  const sita = deriveTitle(byNumber('169148'));
  assert.match(sita, /^SITA\b/, `acronym flattened: ${sita}`);
});

test('empty description falls back to the code rather than crashing', () => {
  assert.equal(deriveTitle({ title: 'RFQ 12/26', description: '' }), 'RFQ 12/26');
  assert.equal(deriveTitle({ title: '', description: '' }), 'Untitled tender');
  assert.equal(deriveTitle({ title: null, description: null }), 'Untitled tender');
});

test('titles never exceed the card budget', () => {
  assert.ok(deriveTitle({ title: 'X1/26', description: 'A'.repeat(400) }).length <= 121);
  for (const t of FIXTURE_TENDERS.results) {
    assert.ok(deriveTitle(t).length <= 121, `${t.tenderNumber} too long`);
  }
});

// ---------------------------------------------------------------------------
// Category — 62 upstream values collapse into the app's 13
// ---------------------------------------------------------------------------

test('every upstream category maps to a real app category', () => {
  assert.equal(UPSTREAM_CATEGORIES.length, 62, 'fixture vocabulary drifted from /categories');
  for (const name of UPSTREAM_CATEGORIES) {
    const mapped = deriveCategory(name);
    assert.ok(CATEGORIES.includes(mapped), `"${name}" -> "${mapped}" is not a Category`);
  }
});

test('the mapping is deterministic and case-insensitive', () => {
  assert.equal(deriveCategory('Supplies: Medical'), 'Healthcare');
  assert.equal(deriveCategory('supplies: medical'), 'Healthcare');
  assert.equal(deriveCategory('  Supplies: Medical  '), 'Healthcare');
});

test('representative categories map where the UI expects', () => {
  const expected = {
    'Construction': 'Construction',
    'Construction of buildings': 'Construction',
    'Specialised construction activities': 'Construction',
    'Services: Building': 'Construction',
    'Civil engineering': 'Engineering',
    'Electricity, gas, steam and air conditioning': 'Engineering',
    'Security and investigation activities': 'Security',
    'Information and communication': 'IT & Technology',
    'Supplies: Computer Equipment': 'IT & Technology',
    'Telecommunications': 'IT & Technology',
    'Computer programming, consultancy and related activities': 'IT & Technology',
    'Agricultural Products and Services': 'Agriculture',
    'Human health activities': 'Healthcare',
    'Transportation and storage': 'Transport',
    'Advertising and market research': 'Marketing',
    'Legal and accounting activities': 'Consulting',
    'Services: Professional': 'Professional Services',
    'Supplies: General': 'Supply & Delivery',
    'Waste collection, treatment and disposal activities; materials recovery': 'Cleaning',
  };
  for (const [name, want] of Object.entries(expected)) {
    assert.equal(deriveCategory(name), want, `${name}`);
  }
});

test('the ambiguous cleaning/security bucket is split by subject text', () => {
  const bucket = 'Services: Functional (Including Cleaning and Security Services)';
  assert.equal(deriveCategory(bucket, 'Physical security at Lilani Hot springs'), 'Security');
  assert.equal(deriveCategory(bucket, 'Cleaning services for municipal offices'), 'Cleaning');
  // No signal in the subject: pick one deterministically rather than 'Other'.
  assert.equal(deriveCategory(bucket), 'Cleaning');
  // The live record 169450 is a SECURITY tender carrying this bucket.
  assert.equal(adaptTender(byNumber('169450')).category, 'Security');
});

test('unknown future categories fall back to keyword rules, then Other', () => {
  assert.equal(deriveCategory('Drone surveillance services'), 'Security');
  assert.equal(deriveCategory('Quantum computing research'), 'IT & Technology');
  assert.equal(deriveCategory('Interpretive dance'), 'Other');
  assert.equal(deriveCategory(null), 'Other');
  assert.equal(deriveCategory(''), 'Other');
});

test('an app category is a GROUPING of many upstream names', () => {
  // This is why preferences cannot push `category` to the API: /tenders takes
  // one verbatim name, and 'Construction' alone would under-report.
  const construction = UPSTREAM_CATEGORIES.filter((c) => deriveCategory(c) === 'Construction');
  assert.ok(construction.length >= 3, construction);
  assert.ok(construction.includes('Services: Civil'));
  assert.ok(categoriesInUse(UPSTREAM_CATEGORIES).length >= 8);
});

test('categoryRaw keeps the verbatim upstream value', () => {
  const t = adaptTender(byNumber('169148'));
  assert.equal(t.categoryRaw, 'Administrative and support activities');
  assert.equal(t.category, 'Other');
});

// ---------------------------------------------------------------------------
// Province & location
// ---------------------------------------------------------------------------

test('upstream province names pass through exactly', () => {
  for (const { province } of FIXTURE_PROVINCES.provinces) {
    assert.equal(deriveProvince({ province }), province);
  }
});

test('National is preserved as a scope, not discarded', () => {
  // 45 live records. The old feed treated this as "unknown" and threw it away.
  assert.equal(deriveProvince({ province: 'National' }), 'National');
  assert.equal(adaptTender({ ...byNumber('169585'), province: 'National' }).province, 'National');
});

test('a missing province is recovered from the address, else National', () => {
  assert.equal(
    deriveProvince({ province: null, location: '1 Jones Road - Kempton Park - Ekhuruleni - 1632' }),
    'National',
  );
  assert.equal(
    deriveProvince({ province: null, organisation: 'KwaZulu-Natal Department of Health' }),
    'KwaZulu-Natal',
  );
  assert.equal(deriveProvince({ province: null }), 'National');
});

test('the postal code is dropped and the city title-cased', () => {
  assert.equal(deriveCity('DF Malan Street - FORESHORE - CAPE TOWN - 8000'), 'Cape Town');
  assert.equal(
    deriveCity('King Shaka International Airport - La Mercy - Durban - 4000'),
    'Durban',
  );
  assert.equal(deriveCity('191 Prince Alfred Street - Pietermaritzburg - Pietermaritzburg - 3201'), 'Pietermaritzburg');
  assert.equal(deriveCity(null), null);
  assert.equal(deriveCity('4000'), null);
});

test('a coordinates string is not mistaken for a city', () => {
  // Real record 169397 puts GPS coordinates in the first segment.
  const raw = byNumber('169397').location;
  assert.match(raw, /WWTW-25'19'/);
  assert.equal(deriveCity(raw), 'Pretoria');
});

test('cards get a short locality, the detail screen keeps the raw address', () => {
  const t = adaptTender(byNumber('169585'));
  assert.equal(t.location, 'Durban, KwaZulu-Natal');
  assert.equal(t.locationFull, 'King Shaka International Airport - La Mercy - Durban - 4000');
});

test('location degrades to the province when there is no city', () => {
  const t = adaptTender({ ...byNumber('169585'), location: null });
  assert.equal(t.location, 'KwaZulu-Natal');
  assert.equal(t.locationFull, null);
});

test('every province in the live sample is a valid Province', () => {
  for (const raw of FIXTURE_TENDERS.results) {
    const t = adaptTender(raw);
    assert.ok(
      ['KwaZulu-Natal', 'Gauteng', 'Western Cape', 'Eastern Cape', 'Free State', 'Limpopo',
       'Mpumalanga', 'North West', 'Northern Cape', 'National'].includes(t.province),
      `${raw.tenderNumber}: bad province ${t.province}`,
    );
  }
});

test('adaptProvinces drops names that are not real provinces', () => {
  const out = adaptProvinces({
    provinces: [...FIXTURE_PROVINCES.provinces, { province: 'Atlantis', count: 3 }],
    total: 11,
    source: 'live',
  });
  assert.equal(out.length, 10);
  assert.ok(!out.some((p) => p.name === 'Atlantis'));
});

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

test('MIME types become the labels the UI renders', () => {
  assert.equal(deriveFileType('APPLICATION/PDF', 'a.pdf'), 'PDF');
  assert.equal(
    deriveFileType('APPLICATION/VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDDOCUMENT', 'a.docx'),
    'DOCX',
  );
  assert.equal(
    deriveFileType('APPLICATION/VND.OPENXMLFORMATS-OFFICEDOCUMENT.SPREADSHEETML.SHEET', 'a.xlsx'),
    'XLSX',
  );
  assert.equal(deriveFileType('APPLICATION/ZIP', 'a.zip'), 'ZIP');
  // Unknown MIME: fall back to the filename extension.
  assert.equal(deriveFileType('APPLICATION/OCTET-STREAM', 'spec.vsd'), 'VSD');
  assert.equal(deriveFileType('', 'spec.doc'), 'DOC');
  assert.equal(deriveFileType(null, 'no-extension'), 'FILE');
});

test('the real non-PDF document in the sample is labelled DOCX', () => {
  const doc = byNumber('169099').documents[0];
  assert.equal(adaptDocument(doc, 0).fileType, 'DOCX');
  assert.equal(adaptDocument(doc, 0).name, 'REVISED SBD 4 -Annexure A_AUG 2026.docx');
});

test('sizeBytes 0 is preserved, not invented', () => {
  // Upstream reports 0 for every document. The detail view suppresses the size
  // line when falsy; fabricating a size would be a lie about the file.
  const d = adaptDocument(byNumber('169585').documents[0], 0);
  assert.equal(d.sizeBytes, 0);
});

test('addenda are flagged from the API flag or the filename', () => {
  assert.equal(adaptDocument({ id: '1', name: 'Addendum 1.pdf', fileType: 'APPLICATION/PDF', sizeBytes: 0, updatedAt: '', url: 'u', isAddendum: false }, 0).isAddendum, true);
  assert.equal(adaptDocument({ id: '2', name: 'Erratum.pdf', fileType: 'APPLICATION/PDF', sizeBytes: 0, updatedAt: '', url: 'u', isAddendum: false }, 0).isAddendum, true);
  assert.equal(adaptDocument(byNumber('169585').documents[0], 0).isAddendum, false);
});

test('documents survive a missing array or blank name', () => {
  assert.deepEqual(adaptTender({ ...byNumber('169585'), documents: undefined }).documents, []);
  assert.equal(adaptDocument({ id: '9', name: '', fileType: null, sizeBytes: 0, updatedAt: '', url: '', isAddendum: false }, 2).name, 'Tender document 3');
});

// ---------------------------------------------------------------------------
// Contact — new with this feed; the previous one never supplied it
// ---------------------------------------------------------------------------

test('nested contact details are mapped into the domain shape', () => {
  const c = adaptContact(byNumber('169585'));
  assert.deepEqual(c, {
    department: null,
    contactPerson: 'Mlungisi Mgobhozi',
    email: 'Mlungisi.mgobhozi@airports.co.za',
    phone: '032-436-6198',
  });
});

test('flat contact columns are used when the nested object is absent', () => {
  const c = adaptContact({
    contactInformation: null,
    contactName: 'Ms T Gomo',
    contactEmail: 'tgomo@mhlontlolm.gov.za',
    contactPhone: '047-553-7000',
  });
  assert.equal(c.contactPerson, 'Ms T Gomo');
  assert.equal(c.email, 'tgomo@mhlontlolm.gov.za');
});

test('no contact is null, never a row of empty strings', () => {
  assert.equal(
    adaptContact({ contactInformation: { name: '', email: null, telephone: '  ' }, contactName: null, contactEmail: null, contactPhone: null }),
    null,
  );
});

test('every record in the live sample yields a contact person', () => {
  for (const raw of FIXTURE_TENDERS.results) {
    assert.ok(adaptContact(raw)?.contactPerson, `${raw.tenderNumber} lost its contact`);
  }
});

// ---------------------------------------------------------------------------
// Money, URLs, lifecycle
// ---------------------------------------------------------------------------

test('valueCents null is passed through, never rendered as R0', () => {
  for (const raw of FIXTURE_TENDERS.results) {
    assert.equal(adaptTender(raw).valueCents, null, raw.tenderNumber);
  }
  // A real value must survive when upstream starts sending one.
  assert.equal(adaptTender({ ...byNumber('169585'), valueCents: 240_000_000 }).valueCents, 240_000_000);
});

test('broken etenders /tender/12345 URLs are replaced with the live portal', () => {
  assert.equal(
    deriveSourceUrl({ sourceUrl: 'https://www.etenders.gov.za/tender/169382' }),
    'https://www.etenders.gov.za/Home/opportunities',
  );
  assert.equal(deriveSourceUrl({ sourceUrl: null }), 'https://www.etenders.gov.za/Home/opportunities');
  assert.equal(
    deriveSourceUrl({ sourceUrl: 'https://www.etenders.gov.za/Home/opportunities?id=1' }),
    'https://www.etenders.gov.za/Home/opportunities?id=1',
  );
});

test('lifecycle status survives, and unknown values are not coerced away', () => {
  assert.equal(adaptTender(byNumber('169195')).lifecycleStatus, 'complete');
  assert.equal(adaptTender(byNumber('169585')).lifecycleStatus, 'active');
  assert.equal(adaptTender({ ...byNumber('169585'), status: 'awarded' }).lifecycleStatus, 'awarded');
});

test('ids stay strings — they are CUIDs now, not integers', () => {
  const t = adaptTender(byNumber('169585'));
  assert.equal(typeof t.id, 'string');
  assert.equal(t.id, 'cmtt6lx56000142xs7i6g1dkg');
});

test('publishedDate falls back to firstSeenAt when upstream omits it', () => {
  assert.equal(adaptTender(byNumber('169585')).publishedDate, '2026-09-08');
  assert.equal(
    adaptTender({ ...byNumber('169585'), publishedDate: null }).publishedDate,
    '2026-09-08T21:28:37.386Z',
  );
});

// ---------------------------------------------------------------------------
// Per-user state
// ---------------------------------------------------------------------------

test('upstream isSaved is not trusted over our own state layer', () => {
  // The API has no concept of our Supabase user and always says false.
  assert.equal(adaptTenderWithState(byNumber('169585')).isSaved, false);
  assert.equal(
    adaptTenderWithState(byNumber('169585'), { isSaved: true, savedAt: '2026-09-01' }).isSaved,
    true,
  );
  assert.equal(
    adaptTenderWithState({ ...byNumber('169585'), isSaved: true }).isSaved,
    true,
  );
});

test('matchScore is null rather than invented', () => {
  assert.equal(adaptTenderWithState(byNumber('169585')).matchScore, null);
});

test('detail adaptation tolerates an absent amendments array', () => {
  const d = adaptDetail({ ...byNumber('169585'), amendments: [] });
  assert.deepEqual(d.amendments, []);
  assert.equal(d.id, 'cmtt6lx56000142xs7i6g1dkg');

  const legacy = adaptDetail({
    ...byNumber('169585'),
    amendments: [{ id: 1, field_changed: 'closing_date', old_value: 'a', new_value: 'b', detected_at: '2026-09-01' }],
  });
  assert.deepEqual(legacy.amendments[0], {
    id: '1', field: 'closing_date', from: 'a', to: 'b', detectedAt: '2026-09-01',
  });
});

test('the whole live sample adapts without throwing or dropping fields', () => {
  for (const raw of FIXTURE_TENDERS.results) {
    const t = adaptTenderWithState(raw);
    for (const field of ['id', 'tenderNumber', 'title', 'organisation', 'category', 'province', 'location', 'closingDate']) {
      assert.ok(t[field], `${raw.tenderNumber}: ${field} is empty`);
    }
    assert.ok(Array.isArray(t.documents));
    assert.ok(!Number.isNaN(new Date(t.closingDate).getTime()), `${raw.tenderNumber}: bad closingDate`);
  }
});
