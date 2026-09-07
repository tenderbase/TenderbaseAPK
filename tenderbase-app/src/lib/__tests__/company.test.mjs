/**
 * Company profile validation & completeness.
 *   node --test src/lib/__tests__/
 * Mirrors src/types/company.ts. Keep in sync if the rules change.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

// --- inlined copies of the pure functions under test ---
const CIDB_CLASSES = ['GB','CE','EB','EP','ME','SB','SC','SD','SE','SF','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SQ'];

const validateRegistrationNumber = (v) => {
  if (!/^\d{4}\/\d{6}\/\d{2}$/.test(v.trim())) return 'Use the CIPC format YYYY/NNNNNN/NN, e.g. 2018/443921/07';
  const year = Number(v.slice(0, 4));
  const thisYear = new Date().getFullYear();
  if (year < 1900 || year > thisYear) return `Registration year must be between 1900 and ${thisYear}`;
  return null;
};
const validateVatNumber = (v) => {
  const d = v.replace(/\s/g, '');
  if (!/^\d{10}$/.test(d)) return 'A VAT number is 10 digits';
  if (!d.startsWith('4')) return 'South African VAT numbers start with 4';
  return null;
};
const validateCsdNumber = (v) => (/^MAAA\d{7}$/i.test(v.trim()) ? null : 'Use the CSD format MAAA0000000');
const validateCidbGrading = (v) => {
  const m = /^([1-9])\s*([A-Z]{2})\s*(PE|SO)?$/i.exec(v.trim());
  if (!m) return 'Use a grade and class, e.g. 6GB or 3CE PE';
  if (!CIDB_CLASSES.includes(m[2].toUpperCase())) return `Unknown class "${m[2].toUpperCase()}"`;
  return null;
};
const validatePhone = (v) => {
  const d = v.replace(/[\s()-]/g, '');
  if (/^0\d{9}$/.test(d) || /^\+27\d{9}$/.test(d)) return null;
  return 'Use 031 502 8841 or +27 31 502 8841';
};
const validatePostalCode = (v) => (/^\d{4}$/.test(v.trim()) ? null : 'South African postal codes are 4 digits');

const COMPLETENESS_FIELDS = [
  ['legalName', 2], ['companyType', 1], ['registrationNumber', 2], ['csdNumber', 3],
  ['taxClearanceExpiry', 3], ['bbbeeLevel', 2], ['cidbGrading', 1], ['vatNumber', 1],
  ['contactPerson', 1], ['email', 1], ['phone', 1], ['city', 1], ['province', 1],
];
const calculateCompleteness = (p) => {
  let earned = 0, total = 0;
  for (const [key, weight] of COMPLETENESS_FIELDS) {
    total += weight;
    const v = p[key];
    const filled = typeof v === 'string' ? v.trim().length > 0 : v !== null && v !== undefined;
    if (filled) earned += weight;
  }
  return Math.round((earned / total) * 100);
};
const getExpiryStatus = (iso, now = new Date()) => {
  if (!iso) return 'missing';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'missing';
  const days = Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
     Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
};

// --- CIPC registration numbers ---
test('accepts a valid CIPC registration number', () => {
  assert.equal(validateRegistrationNumber('2018/443921/07'), null);
});
test('rejects malformed registration numbers', () => {
  for (const bad of ['18/443921/07', '2018/44392/07', '2018-443921-07', '2018/443921', '']) {
    assert.ok(validateRegistrationNumber(bad), `should reject ${bad}`);
  }
});
test('rejects a registration year in the future', () => {
  const future = new Date().getFullYear() + 1;
  assert.match(validateRegistrationNumber(`${future}/443921/07`), /Registration year/);
});

// --- SARS VAT ---
test('accepts a 10-digit VAT number starting with 4', () => {
  assert.equal(validateVatNumber('4820318877'), null);
});
test('rejects a VAT number that does not start with 4', () => {
  assert.match(validateVatNumber('1820318877'), /start with 4/);
});
test('rejects VAT numbers of the wrong length', () => {
  assert.match(validateVatNumber('482031887'), /10 digits/);
});

// --- CSD ---
test('accepts a CSD number and is case-insensitive', () => {
  assert.equal(validateCsdNumber('MAAA0891234'), null);
  assert.equal(validateCsdNumber('maaa0891234'), null);
});
test('rejects a CSD number with the wrong prefix or length', () => {
  assert.ok(validateCsdNumber('MBBB0891234'));
  assert.ok(validateCsdNumber('MAAA089123'));
});

// --- CIDB ---
test('accepts valid CIDB gradings including the PE suffix', () => {
  assert.equal(validateCidbGrading('6GB'), null);
  assert.equal(validateCidbGrading('3CE PE'), null);
  assert.equal(validateCidbGrading('9sq'), null);
});
test('rejects an unknown CIDB works class', () => {
  assert.match(validateCidbGrading('9ZZ'), /Unknown class "ZZ"/);
});
test('rejects CIDB grades outside 1-9', () => {
  assert.ok(validateCidbGrading('0GB'));
  assert.ok(validateCidbGrading('10GB'));
});

// --- phone / postal ---
test('accepts both local and +27 phone formats', () => {
  assert.equal(validatePhone('031 502 8841'), null);
  assert.equal(validatePhone('+27 31 502 8841'), null);
  assert.equal(validatePhone('(031) 502-8841'), null);
});
test('rejects phone numbers of the wrong length', () => {
  assert.ok(validatePhone('031 502 884'));
  assert.ok(validatePhone('12345'));
});
test('requires a 4-digit postal code', () => {
  assert.equal(validatePostalCode('4001'), null);
  assert.ok(validatePostalCode('400'));
});

// --- completeness ---
test('an empty profile is 0% complete', () => {
  assert.equal(calculateCompleteness({}), 0);
});
test('a fully populated profile is 100% complete', () => {
  const full = {};
  for (const [k] of COMPLETENESS_FIELDS) full[k] = 'x';
  assert.equal(calculateCompleteness(full), 100);
});
test('weights disqualifying fields above cosmetic ones', () => {
  // CSD (weight 3) must move the needle further than trading name (weight 1).
  const csdOnly = calculateCompleteness({ csdNumber: 'MAAA0891234' });
  const cidbOnly = calculateCompleteness({ cidbGrading: '6GB' });
  assert.ok(csdOnly > cidbOnly);
});
test('whitespace does not count as a filled field', () => {
  assert.equal(calculateCompleteness({ legalName: '   ' }), 0);
});
test('the demo profile is missing only CIDB grading', () => {
  const demo = {
    legalName: 'Mkhize Solutions (Pty) Ltd', companyType: 'Private Company (Pty) Ltd',
    registrationNumber: '2018/443921/07', csdNumber: 'MAAA0891234',
    taxClearanceExpiry: '2027-03-31', bbbeeLevel: 2, cidbGrading: null,
    vatNumber: '4820318877', contactPerson: 'Sipho Mkhize',
    email: 'info@mkhize-solutions.co.za', phone: '+27 31 502 8841',
    city: 'Durban', province: 'KwaZulu-Natal',
  };
  assert.equal(calculateCompleteness(demo), 95);
});

// --- certificate expiry ---
test('classifies certificate expiry against the 30-day renewal window', () => {
  const now = new Date('2026-09-02T00:00:00Z');
  assert.equal(getExpiryStatus('2027-03-31', now), 'valid');
  assert.equal(getExpiryStatus('2026-09-20', now), 'expiring');
  assert.equal(getExpiryStatus('2026-08-30', now), 'expired');
  assert.equal(getExpiryStatus(null, now), 'missing');
});
test('expiry boundaries are inclusive at today and 30 days out', () => {
  const now = new Date('2026-09-02T00:00:00Z');
  assert.equal(getExpiryStatus('2026-09-02', now), 'expiring', 'expires today');
  assert.equal(getExpiryStatus('2026-10-02', now), 'expiring', '30 days out');
  assert.equal(getExpiryStatus('2026-10-03', now), 'valid', '31 days out');
});
test('an unparseable date is treated as missing, not valid', () => {
  assert.equal(getExpiryStatus('not-a-date'), 'missing');
});
