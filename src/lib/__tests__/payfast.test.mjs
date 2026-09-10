import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  PAYFAST_FIELD_ORDER,
  PLANS,
  buildCheckoutRequest,
  formatAmount,
  itnSignature,
  itnSignatureBase,
  mapPaymentStatus,
  md5Hex,
  nextPeriodEnd,
  parseAmountCents,
  parseItn,
  paymentSignature,
  paymentSignatureBase,
  phpUrlEncode,
  planById,
  signaturesMatch,
  validateItn,
} from '@/lib/payfast';

// ---------------------------------------------------------------------------
// Encoding + hashing
// ---------------------------------------------------------------------------

test('md5Hex matches the canonical MD5 test vector', () => {
  // The classic vector: proves we are really hashing MD5, not a lookalike.
  assert.equal(md5Hex('abc'), '900150983cd24fb0d6963f7d28e17f72');
  assert.equal(md5Hex(''), 'd41d8cd98f00b204e9800998ecf8427e');
});

test('phpUrlEncode follows PHP urlencode, not encodeURIComponent', () => {
  assert.equal(phpUrlEncode('a b'), 'a+b'); // space -> plus
  assert.equal(phpUrlEncode('50% off'), '50%25+off');
  assert.equal(phpUrlEncode('a~b'), 'a%7Eb'); // PHP encodes ~
  assert.equal(phpUrlEncode("a!b'c(d)e*f"), 'a%21b%27c%28d%29e%2Af');
  assert.equal(phpUrlEncode('safe-_.'), 'safe-_.');
  assert.equal(phpUrlEncode('R249,00 & more'), 'R249%2C00+%26+more');
  // UTF-8 bytes are percent-encoded, as PHP does.
  assert.equal(phpUrlEncode('KwaZulu–Natal'), 'KwaZulu%E2%80%93Natal');
});

// ---------------------------------------------------------------------------
// Payment request signing
// ---------------------------------------------------------------------------

test('payment signature base uses PayFast field order, trims and skips empties', () => {
  const params = {
    item_name: 'TenderBase Pro (monthly)',
    merchant_id: '10000100',
    amount: '249.00',
    m_payment_id: 'abc-123',
    cancel_url: '',
    custom_str1: '  ',
    email_address: '  buyer@example.co.za  ',
  };
  const base = paymentSignatureBase(params, null);
  assert.equal(
    base,
    'merchant_id=10000100&email_address=buyer%40example.co.za&m_payment_id=abc-123&' +
      'amount=249.00&item_name=TenderBase+Pro+%28monthly%29',
  );
});

test('payment signature appends the passphrase, encoded, and hashes the whole thing', () => {
  const params = { merchant_id: '10000100', amount: '249.00' };
  const base = paymentSignatureBase(params, 'my pass & word');
  assert.equal(base, 'merchant_id=10000100&amount=249.00&passphrase=my+pass+%26+word');
  assert.equal(paymentSignature(params, 'my pass & word'), createHash('md5').update(base, 'utf8').digest('hex'));
  // No passphrase -> different signature.
  assert.notEqual(paymentSignature(params, null), paymentSignature(params, 'x'));
});

test('buildCheckoutRequest returns signed, ordered, non-empty fields', () => {
  const { processUrl, fields } = buildCheckoutRequest({
    processUrl: 'https://sandbox.payfast.co.za/eng/process',
    params: {
      merchant_id: '10000100',
      merchant_key: '46f0cd694581a',
      amount: '249.00',
      item_name: 'TenderBase Pro (monthly)',
      cell_number: '',
      notify_url: 'https://app.example.co.za/api/billing/itn',
    },
    passphrase: 'secret',
  });

  assert.equal(processUrl, 'https://sandbox.payfast.co.za/eng/process');
  assert.deepEqual(Object.keys(fields), [
    'merchant_id',
    'merchant_key',
    'notify_url',
    'amount',
    'item_name',
    'signature',
  ]);
  assert.equal(
    fields.signature,
    paymentSignature(
      {
        merchant_id: '10000100',
        merchant_key: '46f0cd694581a',
        amount: '249.00',
        item_name: 'TenderBase Pro (monthly)',
        notify_url: 'https://app.example.co.za/api/billing/itn',
      },
      'secret',
    ),
  );
});

test('the documented field order is honoured for the full param set', () => {
  const params = {};
  for (const key of [...PAYFAST_FIELD_ORDER].reverse()) params[key] = key;
  const base = paymentSignatureBase(params, null);
  assert.deepEqual(
    base.split('&').map((p) => p.split('=')[0]),
    [...PAYFAST_FIELD_ORDER],
  );
});

// ---------------------------------------------------------------------------
// Plans + money
// ---------------------------------------------------------------------------

test('plan catalogue is the tier model, in cents, with PayFast frequencies', () => {
  assert.equal(PLANS['pro-monthly'].amountCents, 24900);
  assert.equal(PLANS['pro-monthly'].frequency, 3); // monthly
  assert.equal(PLANS['pro-yearly'].amountCents, 199900);
  assert.equal(PLANS['pro-yearly'].frequency, 6); // annual
  assert.equal(formatAmount(24900), '249.00');
  assert.equal(formatAmount(199900), '1999.00');
  assert.equal(planById('pro-yearly').id, 'pro-yearly');
  assert.equal(planById('nope'), null);
  assert.equal(planById(undefined), null);
});

test('parseAmountCents is strict about junk and negatives', () => {
  assert.equal(parseAmountCents('249.00'), 24900);
  assert.equal(parseAmountCents('1999.99'), 199999);
  assert.equal(parseAmountCents('abc'), null);
  assert.equal(parseAmountCents('-1'), null);
  assert.equal(parseAmountCents(undefined), null);
});

// ---------------------------------------------------------------------------
// ITN
// ---------------------------------------------------------------------------

const ITN = {
  m_payment_id: '3f2a-1',
  pf_payment_id: '1089250',
  payment_status: 'COMPLETE',
  item_name: 'TenderBase Pro (monthly)',
  amount_gross: '249.00',
  amount_fee: '-5.73',
  amount_net: '243.27',
  merchant_id: '10000100',
  token: 'abc-token',
  billing_date: '2026-09-09',
};

const PASS = 'my-passphrase';

function signedItn(fields, passphrase = PASS) {
  return { ...fields, signature: itnSignature(fields, passphrase) };
}

test('parseItn keeps posted order and decodes pluses', () => {
  const parsed = parseItn('merchant_id=10000100&item_name=TenderBase+Pro&email_address=a%40b.co.za');
  assert.deepEqual(Object.keys(parsed), ['merchant_id', 'item_name', 'email_address']);
  assert.equal(parsed.item_name, 'TenderBase Pro');
  assert.equal(parsed.email_address, 'a@b.co.za');
});

test('ITN signature base excludes the signature field and empties', () => {
  const base = itnSignatureBase({ ...ITN, signature: 'deadbeef', custom_str1: '' }, null);
  assert.ok(!base.includes('signature='));
  assert.ok(!base.includes('custom_str1'));
  assert.ok(base.startsWith('m_payment_id=3f2a-1&pf_payment_id=1089250'));
});

test('a valid ITN from our merchant for the expected amount passes', () => {
  const result = validateItn({
    fields: signedItn(ITN),
    passphrase: PASS,
    expectedMerchantId: '10000100',
    expectedAmountCents: 24900,
  });
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
  assert.equal(result.status, 'complete');
  assert.equal(result.mPaymentId, '3f2a-1');
  assert.equal(result.pfPaymentId, '1089250');
  assert.equal(result.token, 'abc-token');
  assert.equal(result.amountCents, 24900);
  assert.equal(result.recurring, true);
});

test('a tampered amount fails the amount check even when signed', () => {
  const tampered = signedItn({ ...ITN, amount_gross: '1.00' });
  const result = validateItn({
    fields: tampered,
    passphrase: PASS,
    expectedMerchantId: '10000100',
    expectedAmountCents: 24900,
  });
  assert.equal(result.ok, false);
  assert.ok(result.problems.includes('amount'));
});

test('a wrong passphrase fails the signature check', () => {
  const result = validateItn({
    fields: signedItn(ITN, 'not-our-passphrase'),
    passphrase: PASS,
    expectedMerchantId: '10000100',
    expectedAmountCents: 24900,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.problems, ['signature']);
});

test('another merchant account is rejected', () => {
  const result = validateItn({
    fields: signedItn({ ...ITN, merchant_id: '99999999' }),
    passphrase: PASS,
    expectedMerchantId: '10000100',
    expectedAmountCents: 24900,
  });
  assert.ok(result.problems.includes('merchant'));
  assert.equal(result.ok, false);
});

test('an ITN for a payment we never created is rejected', () => {
  const result = validateItn({
    fields: signedItn(ITN),
    passphrase: PASS,
    expectedMerchantId: '10000100',
    expectedAmountCents: null,
  });
  assert.ok(result.problems.includes('unknown_payment'));
});

test('an unknown payment_status is rejected', () => {
  const result = validateItn({
    fields: signedItn({ ...ITN, payment_status: 'SOMETHING_NEW' }),
    passphrase: PASS,
    expectedMerchantId: '10000100',
    expectedAmountCents: 24900,
  });
  assert.ok(result.problems.includes('status'));
});

test('payment statuses map onto our lifecycle', () => {
  assert.equal(mapPaymentStatus('COMPLETE'), 'complete');
  assert.equal(mapPaymentStatus('complete'), 'complete');
  assert.equal(mapPaymentStatus('FAILED'), 'failed');
  assert.equal(mapPaymentStatus('CANCELLED'), 'cancelled');
  assert.equal(mapPaymentStatus('PENDING'), 'pending');
  assert.equal(mapPaymentStatus('WAT'), null);
});

test('signaturesMatch is exact and length-safe', () => {
  assert.equal(signaturesMatch('AB12', 'ab12'), true);
  assert.equal(signaturesMatch('ab12', 'ab13'), false);
  assert.equal(signaturesMatch('ab', 'abc'), false);
});

test('nextPeriodEnd adds a month monthly, a year annually, from billing_date', () => {
  assert.equal(nextPeriodEnd('2026-01-15T00:00:00.000Z', 3), '2026-02-15T00:00:00.000Z');
  assert.equal(nextPeriodEnd('2026-01-15T00:00:00.000Z', 6), '2027-01-15T00:00:00.000Z');
  // Garbage in -> a sane period end, never an Invalid Date.
  assert.ok(!Number.isNaN(new Date(nextPeriodEnd('not-a-date', 3)).getTime()));
});
