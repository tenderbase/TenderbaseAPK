import { NextResponse, type NextRequest } from 'next/server';

import { cancelSubscription } from '@/lib/billing.server';
import { billingGate } from '@/lib/billing-request';

/**
 * Cancels the recurring subscription at PayFast.
 *
 * POST (no body)
 *   200  { periodEnd }  — no future debits; Pro continues until `periodEnd`
 *   400  no_subscription — a trial is not a subscription; end it instead
 *   401  not_signed_in
 *   503  billing_not_configured | billing_storage_unconfigured
 *   502  payfast_rejected — PayFast refused or we could not reach it; the
 *        subscription is unchanged and we say so
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await billingGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error, message: gate.message }, { status: gate.status });

  const outcome = await cancelSubscription(gate.caller.userId);

  if (!outcome.ok) {
    if (outcome.reason === 'no_subscription') {
      return NextResponse.json(
        {
          error: 'no_subscription',
          message: 'There is no paid subscription on this account. To stop a trial, use the trial button.',
        },
        { status: 400 },
      );
    }
    if (outcome.reason === 'payfast_rejected') {
      return NextResponse.json(
        {
          error: 'payfast_rejected',
          message: 'PayFast did not confirm the cancellation, so nothing changed. Please try again.',
        },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: outcome.reason }, { status: 503 });
  }

  return NextResponse.json({ periodEnd: outcome.periodEnd });
}
