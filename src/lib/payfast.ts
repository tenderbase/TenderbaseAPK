/**
 * PayFast integration core — SERVER-SIDE ONLY.
 *
 * Never import this from a client component: it signs with the merchant
 * passphrase, which must not reach the browser. (Client-rendered pricing UI
 * reads prices from `types/tier.ts`, the one tier model.)
 *
 * Everything here is pure and unit-tested against PayFast's documented
 * rules:
 *   - parameters are joined in PayFast's field order for payment requests,
 *     and in posted order for ITN validation;
 *   - empty values are excluded, values are trimmed;
 *   - values are encoded with PHP `urlencode` semantics (space -> '+'),
 *     because PayFast hashes the PHP string;
 *   - a passphrase, when set, is appended as `&passphrase=<encoded>`;
 *   - the result is MD5'd to lowercase hex.
 *
 * Reference: PayFast "Custom Integration" and "ITN" documentation.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { PRO_MONTHLY_ZAR, PRO_YEARLY_ZAR } from '@/types/tier';

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export type BillingPlan = 'pro-monthly' | 'pro-yearly';

export interface PlanDef {
  id: BillingPlan;
  /** Sent as item_name and shown on invoices. */
  label: string;
  amountCents: number;
  /** PayFast subscription frequency: 3 = monthly, 6 = annual. */
  frequency: 3 | 6;
}

export const PLANS: Record<BillingPlan, PlanDef> = {
  'pro-monthly': {
    id: 'pro-monthly',
    label: 'TenderBase Pro (monthly)',
    amountCents: PRO_MONTHLY_ZAR * 100,
    frequency: 3,
  },
  'pro-yearly': {
    id: 'pro-yearly',
    label: 'TenderBase Pro (annual)',
    amountCents: PRO_YEARLY_ZAR * 100,
    frequency: 6,
  },
};

export function planById(value: string | null | undefined): PlanDef | null {
  return value === 'pro-monthly' || value === 'pro-yearly' ? PLANS[value] : null;
}

/** PayFast wants a decimal string: 24900 -> "249.00". */
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Parse a PayFast money string ("249.00") back to cents, or null. */
export function parseAmountCents(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// ---------------------------------------------------------------------------
// Encoding + hashing
// ---------------------------------------------------------------------------

/**
 * PHP's urlencode, which is what PayFast hashes:
 * spaces become '+', and `! ' ( ) * ~` are percent-encoded (unlike
 * JavaScript's encodeURIComponent).
 */
export function phpUrlEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/~/g, '%7E');
}

export function md5Hex(value: string): string {
  return createHash('md5').update(value, 'utf8').digest('hex');
}

/** Appends the passphrase to a signature base string, PayFast-style. */
function withPassphrase(base: string, passphrase: string | null | undefined): string {
  if (!passphrase) return base;
  return `${base}&passphrase=${phpUrlEncode(passphrase.trim())}`;
}

/** `key=value&key=value` for non-empty (after trim) values, in given order. */
function joinPairs(pairs: Iterable<[string, string]>): string {
  const out: string[] = [];
  for (const [key, raw] of pairs) {
    const value = raw?.trim() ?? '';
    if (value === '') continue;
    out.push(`${key}=${phpUrlEncode(value)}`);
  }
  return out.join('&');
}

// ---------------------------------------------------------------------------
// Payment request (checkout form)
// ---------------------------------------------------------------------------

/**
 * PayFast's documented field order. The signature is computed over the
 * non-empty fields in exactly this sequence.
 */
export const PAYFAST_FIELD_ORDER = [
  'merchant_id',
  'merchant_key',
  'return_url',
  'cancel_url',
  'notify_url',
  'name_first',
  'name_last',
  'email_address',
  'cell_number',
  'm_payment_id',
  'amount',
  'item_name',
  'item_description',
  'custom_int1',
  'custom_int2',
  'custom_int3',
  'custom_int4',
  'custom_int5',
  'custom_str1',
  'custom_str2',
  'custom_str3',
  'custom_str4',
  'custom_str5',
  'email_confirmation',
  'confirmation_address',
  'payment_method',
  'subscription_type',
  'recurring_amount',
  'frequency',
  'cycles',
  'subscription_notify_email',
  'subscription_notify_webhook',
  'subscription_notify_buyer',
] as const;

/** Signature base string for a payment request. */
export function paymentSignatureBase(
  params: Record<string, string | undefined>,
  passphrase: string | null | undefined,
): string {
  const pairs: [string, string][] = [];
  for (const key of PAYFAST_FIELD_ORDER) {
    const value = params[key];
    if (value !== undefined) pairs.push([key, value]);
  }
  return withPassphrase(joinPairs(pairs), passphrase);
}

export function paymentSignature(
  params: Record<string, string | undefined>,
  passphrase: string | null | undefined,
): string {
  return md5Hex(paymentSignatureBase(params, passphrase));
}

/**
 * A ready-to-submit PayFast checkout: the process URL plus the signed form
 * fields (including `signature`). The browser posts these as a form —
 * PayFast never accepts a server-side redirect with credentials in the URL.
 */
export interface CheckoutRequest {
  processUrl: string;
  /** Signed form fields, insertion-ordered as PayFast expects. */
  fields: Record<string, string>;
}

export function buildCheckoutRequest(input: {
  processUrl: string;
  params: Record<string, string | undefined>;
  passphrase: string | null | undefined;
}): CheckoutRequest {
  const fields: Record<string, string> = {};
  for (const key of PAYFAST_FIELD_ORDER) {
    const value = input.params[key]?.trim();
    if (value) fields[key] = value;
  }
  fields.signature = paymentSignature(input.params, input.passphrase);
  return { processUrl: input.processUrl, fields };
}

// ---------------------------------------------------------------------------
// ITN (Instant Transaction Notification)
// ---------------------------------------------------------------------------

/** Parses the raw urlencoded ITN body, preserving posted order. */
export function parseItn(rawBody: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(rawBody).entries()) out[k] = v;
  return out;
}

/**
 * Signature base string for ITN validation: every posted field except
 * `signature`, in posted order (which is PayFast's own order), skipping
 * empties.
 */
export function itnSignatureBase(
  fields: Record<string, string>,
  passphrase: string | null | undefined,
): string {
  const pairs: [string, string][] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (key === 'signature') continue;
    pairs.push([key, value]);
  }
  return withPassphrase(joinPairs(pairs), passphrase);
}

export function itnSignature(
  fields: Record<string, string>,
  passphrase: string | null | undefined,
): string {
  return md5Hex(itnSignatureBase(fields, passphrase));
}

/** Constant-time hex comparison (length-safe). */
export function signaturesMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a.toLowerCase(), 'utf8');
  const bb = Buffer.from(b.toLowerCase(), 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export type PaymentStatus = 'pending' | 'complete' | 'failed' | 'cancelled';

/** PayFast payment_status values mapped onto our own lifecycle. */
export function mapPaymentStatus(raw: string | undefined): PaymentStatus | null {
  switch ((raw ?? '').toUpperCase()) {
    case 'COMPLETE':
      return 'complete';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    case 'PENDING':
      return 'pending';
    default:
      return null;
  }
}

export type ItnProblem =
  /** Signature does not match — the payload was not signed by our merchant. */
  | 'signature'
  /** Signed by someone else's merchant account. */
  | 'merchant'
  /** No pending payment row matches this ITN. */
  | 'unknown_payment'
  /** The amount paid is not the amount we asked for. */
  | 'amount'
  /** payment_status missing or not one we handle. */
  | 'status';

export interface ItnValidation {
  ok: boolean;
  problems: ItnProblem[];
  status: PaymentStatus | null;
  mPaymentId: string | null;
  pfPaymentId: string | null;
  /** Subscription token — present on recurring ITNs. */
  token: string | null;
  amountCents: number | null;
  /** True when the ITN says the payer is a subscription signup. */
  recurring: boolean;
}

/**
 * Validates the parts of an ITN that can be checked without a network call:
 * signature, merchant, known payment, amount, status. Network confirmation
 * (`/eng/query/validate`) and the state change happen in billing.server.ts.
 *
 * `expectedAmountCents` comes from OUR pending row, never from the payload —
 * that is what makes the amount check meaningful.
 */
export function validateItn(input: {
  fields: Record<string, string>;
  passphrase: string | null;
  expectedMerchantId: string | null;
  expectedAmountCents: number | null;
}): ItnValidation {
  const { fields } = input;
  const problems: ItnProblem[] = [];

  const posted = fields.signature ?? '';
  const expected = itnSignature(fields, input.passphrase);
  if (!posted || !signaturesMatch(posted, expected)) problems.push('signature');

  if (input.expectedMerchantId && fields.merchant_id !== input.expectedMerchantId) {
    problems.push('merchant');
  }

  if (input.expectedAmountCents === null) {
    problems.push('unknown_payment');
  } else {
    const paid = parseAmountCents(fields.amount_gross ?? fields.amount);
    if (paid === null || paid !== input.expectedAmountCents) problems.push('amount');
  }

  const status = mapPaymentStatus(fields.payment_status);
  if (status === null) problems.push('status');

  return {
    ok: problems.length === 0,
    problems,
    status,
    mPaymentId: fields.m_payment_id ?? null,
    pfPaymentId: fields.pf_payment_id ?? null,
    token: fields.token ?? null,
    amountCents: parseAmountCents(fields.amount_gross ?? fields.amount),
    recurring: fields.subscription_type === '1' || Boolean(fields.token),
  };
}

/**
 * End of the paid period, computed from the ITN's `billing_date` (or now if
 * absent) and the plan frequency. 3 = monthly, 6 = annual, per PayFast.
 */
export function nextPeriodEnd(billingDateIso: string | null, frequency: number): string {
  const base = billingDateIso ? new Date(billingDateIso) : new Date();
  const start = Number.isNaN(base.getTime()) ? new Date() : base;
  const months = frequency === 6 ? 12 : 1;
  const end = new Date(start.getTime());
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
}
