import 'server-only';

import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js';

import { SUPABASE_URL, isSupabaseConfigured } from '@/lib/supabase-config';
import {
  PLANS,
  buildCheckoutRequest,
  formatAmount,
  itnSignature,
  nextPeriodEnd,
  parseItn,
  planById,
  signaturesMatch,
  validateItn,
  type BillingPlan,
  type CheckoutRequest,
  type PaymentStatus,
} from '@/lib/payfast';

/**
 * PayFast billing server module.
 *
 * Money path, in order:
 *   1. `startCheckout` records a PENDING payment row (our id becomes
 *      m_payment_id) and returns the signed form the browser posts.
 *   2. PayFast sends an ITN to /api/billing/itn; `processItn` validates it
 *      (signature, merchant, amount vs OUR row, status), confirms it
 *      server-to-server with PayFast, then flips the row to COMPLETE and
 *      upserts the subscription that unlocks Pro.
 *
 * Nothing here is guessed: unconfigured PayFast, an unauthenticated user or
 * a missing service-role key are all reported as such and never fake a
 * successful payment.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface PayfastConfig {
  merchantId: string;
  merchantKey: string;
  passphrase: string | null;
  sandbox: boolean;
}

/** Credentials from env; null when billing is not configured. */
export function payfastConfig(): PayfastConfig | null {
  const merchantId = process.env.PAYFAST_MERCHANT_ID?.trim();
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY?.trim();
  if (!merchantId || !merchantKey) return null;
  return {
    merchantId,
    merchantKey,
    passphrase: process.env.PAYFAST_PASSPHRASE?.trim() || null,
    sandbox: process.env.PAYFAST_SANDBOX === 'true',
  };
}

export function payfastEndpoints(sandbox: boolean): { processUrl: string; validateUrl: string } {
  const host = sandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
  return {
    processUrl: `https://${host}/eng/process`,
    validateUrl: `https://${host}/eng/query/validate`,
  };
}

/** True when a signed-in user's subscription can actually be written. */
export function billingStorageConfigured(): boolean {
  return isSupabaseConfigured && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

/**
 * Service-role client: the only writer of billing rows. RLS deliberately has
 * no client write policy — a subscription row is what unlocks Pro.
 */
function serviceClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!isSupabaseConfigured || !key) return null;
  return createServiceClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ---------------------------------------------------------------------------
// Checkout
// ---------------------------------------------------------------------------

export type CheckoutOutcome =
  | { ok: true; request: CheckoutRequest }
  | { ok: false; reason: 'not_configured' | 'storage_unconfigured' | 'unknown_plan' | 'record_failed' };

/**
 * Records the pending payment and builds the signed PayFast form.
 *
 * The amount always comes from the server-side plan catalogue — the client
 * sends only a plan id, never a price.
 */
export async function startCheckout(input: {
  plan: string;
  userId: string;
  email: string;
  name: { first?: string; last?: string };
  origin: string;
}): Promise<CheckoutOutcome> {
  const config = payfastConfig();
  if (!config) return { ok: false, reason: 'not_configured' };

  const plan = planById(input.plan);
  if (!plan) return { ok: false, reason: 'unknown_plan' };

  const supabase = serviceClient();
  if (!supabase) return { ok: false, reason: 'storage_unconfigured' };

  const { data, error } = await supabase
    .from('billing_payments')
    .insert({
      user_id: input.userId,
      plan: plan.id,
      amount_cents: plan.amountCents,
      status: 'pending' satisfies PaymentStatus,
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[billing] could not record pending payment:', error?.message);
    return { ok: false, reason: 'record_failed' };
  }

  const { processUrl } = payfastEndpoints(config.sandbox);
  const request = buildCheckoutRequest({
    processUrl,
    passphrase: config.passphrase,
    params: {
      merchant_id: config.merchantId,
      merchant_key: config.merchantKey,
      return_url: `${input.origin}/pro/plan?paid=1`,
      cancel_url: `${input.origin}/pro/plan?cancelled=1`,
      notify_url: `${input.origin}/api/billing/itn`,
      name_first: input.name.first,
      name_last: input.name.last,
      email_address: input.email,
      m_payment_id: data.id as string,
      amount: formatAmount(plan.amountCents),
      item_name: plan.label,
      item_description: 'TenderBase Pro subscription',
      // Recurring: PayFast keeps debiting until cancelled.
      subscription_type: '1',
      recurring_amount: formatAmount(plan.amountCents),
      frequency: String(plan.frequency),
      cycles: '0',
      subscription_notify_email: 'true',
      subscription_notify_webhook: 'true',
      subscription_notify_buyer: 'true',
      custom_str1: input.userId,
      custom_str2: plan.id,
    },
  });

  return { ok: true, request };
}

// ---------------------------------------------------------------------------
// ITN processing
// ---------------------------------------------------------------------------

export type ItnOutcome =
  | { ok: true; status: PaymentStatus; note: string }
  | { ok: false; code: number; note: string };

/** Server-to-server confirmation with PayFast's validate endpoint. */
async function confirmWithPayfast(rawBody: string, sandbox: boolean): Promise<boolean> {
  const { validateUrl } = payfastEndpoints(sandbox);
  const res = await fetch(validateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: rawBody,
    cache: 'no-store',
  });
  if (!res.ok) return false;
  const text = (await res.text()).trim().toUpperCase();
  return text === 'VALID';
}

interface PaymentRow {
  id: string;
  user_id: string;
  plan: string;
  amount_cents: number;
  status: string;
  payfast_token: string | null;
}

export async function processItn(rawBody: string): Promise<ItnOutcome> {
  const config = payfastConfig();
  if (!config) return { ok: false, code: 503, note: 'billing not configured' };
  const supabase = serviceClient();
  if (!supabase) return { ok: false, code: 503, note: 'billing storage not configured' };

  const fields = parseItn(rawBody);
  const mPaymentId = fields.m_payment_id ?? '';
  const token = fields.token ?? '';

  // Find our row: by m_payment_id first, then by subscription token (that is
  // how recurring ITNs from later periods arrive).
  let payment: PaymentRow | null = null;
  if (mPaymentId) {
    const { data } = await supabase
      .from('billing_payments')
      .select('id, user_id, plan, amount_cents, status, payfast_token')
      .eq('id', mPaymentId)
      .maybeSingle();
    payment = (data as PaymentRow | null) ?? null;
  }
  if (!payment && token) {
    const { data } = await supabase
      .from('billing_payments')
      .select('id, user_id, plan, amount_cents, status, payfast_token')
      .eq('payfast_token', token)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    payment = (data as PaymentRow | null) ?? null;
  }

  const validation = validateItn({
    fields,
    passphrase: config.passphrase,
    expectedMerchantId: config.merchantId,
    // Recurring ITNs bill the same amount as the row we hold.
    expectedAmountCents: payment?.amount_cents ?? null,
  });

  if (!validation.ok) {
    console.error('[billing] ITN rejected:', validation.problems.join(', '), mPaymentId || token);
    // 200 stops PayFast retrying a payload we will never accept; the row (if
    // any) is left untouched and the reason is logged.
    if (validation.problems.includes('unknown_payment')) {
      return { ok: false, code: 200, note: `unknown payment ${mPaymentId || token}` };
    }
    return { ok: false, code: 400, note: validation.problems.join(', ') };
  }

  // Signature is ours and the amount matches our own row — now confirm with
  // PayFast that it really sent this. No confirmation, no state change.
  let confirmed = false;
  try {
    confirmed = await confirmWithPayfast(rawBody, config.sandbox);
  } catch (e) {
    console.error('[billing] ITN confirmation failed:', e instanceof Error ? e.message : e);
  }
  if (!confirmed) return { ok: false, code: 500, note: 'payfast confirmation failed' };

  const status = validation.status ?? 'pending';
  const plan = planById(payment?.plan ?? fields.custom_str2 ?? null);

  const { error: updateError } = await supabase
    .from('billing_payments')
    .update({
      status,
      pf_payment_id: validation.pfPaymentId,
      payfast_token: validation.token,
      itn: fields,
    })
    .eq('id', payment!.id);

  if (updateError) {
    console.error('[billing] could not update payment:', updateError.message);
    return { ok: false, code: 500, note: 'could not record payment' };
  }

  // Only a completed payment touches the subscription.
  if (status === 'complete' && plan) {
    const { error: subError } = await supabase.from('billing_subscriptions').upsert(
      {
        user_id: payment!.user_id,
        plan: plan.id,
        status: 'active',
        payfast_token: validation.token,
        current_period_end: nextPeriodEnd(fields.billing_date ?? null, plan.frequency),
        cancel_at_period_end: false,
      },
      { onConflict: 'user_id' },
    );
    if (subError) {
      console.error('[billing] subscription upsert failed:', subError.message);
      return { ok: false, code: 500, note: 'could not activate subscription' };
    }
  }

  return { ok: true, status, note: `${plan?.id ?? 'unknown'} ${status}` };
}

// ---------------------------------------------------------------------------
// Subscription lookup (used by the server-side tier resolver)
// ---------------------------------------------------------------------------

export interface SubscriptionRow {
  plan: BillingPlan;
  status: 'active' | 'cancelled' | 'expired';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  payfastToken: string | null;
}

/**
 * The signed-in user's subscription, read through the caller's own Supabase
 * client so RLS applies (read-own-row policy).
 */
export async function fetchSubscription(
  client: { from: (table: string) => any },
): Promise<SubscriptionRow | null> {
  const { data, error } = await client
    .from('billing_subscriptions')
    .select('plan, status, current_period_end, cancel_at_period_end, payfast_token')
    .maybeSingle();

  if (error) {
    // Table missing (migration not run) or RLS denial — both mean "no
    // verified subscription", never a fabricated one.
    return null;
  }
  if (!data) return null;
  const plan = planById(data.plan);
  if (!plan) return null;
  return {
    plan: plan.id,
    status: data.status,
    currentPeriodEnd: data.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
    payfastToken: data.payfast_token ?? null,
  };
}

/** Invoice rows for the plan screen (own rows only, newest first). */
export interface InvoiceRow {
  id: string;
  plan: string;
  amountCents: number;
  status: PaymentStatus;
  createdAt: string;
}

export async function fetchInvoices(
  client: { from: (table: string) => any },
): Promise<InvoiceRow[]> {
  const { data, error } = await client
    .from('billing_payments')
    .select('id, plan, amount_cents, status, created_at')
    .order('created_at', { ascending: false })
    .limit(24);

  if (error || !data) return [];
  return data
    .filter((r: { status: string }) => r.status !== 'pending')
    .map((r: { id: string; plan: string; amount_cents: number; status: PaymentStatus; created_at: string }) => ({
      id: r.id,
      plan: planById(r.plan)?.label ?? r.plan,
      amountCents: r.amount_cents,
      status: r.status,
      createdAt: r.created_at,
    }));
}
