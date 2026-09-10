import { NextResponse, type NextRequest } from 'next/server';

import { startOnsiteCheckout } from '@/lib/billing.server';
import { billingGate, readPlan } from '@/lib/billing-request';

/**
 * Embedded PayFast checkout (Onsite Payments).
 *
 * POST { plan: 'pro-monthly' | 'pro-yearly' }
 *   200  { uuid }  — the browser opens the PayFast modal on our own page
 *   400  unknown_plan
 *   401  not_signed_in
 *   503  billing_not_configured | billing_storage_unconfigured
 *   502  payfast_unreachable — PayFast did not hand us a payment id
 *
 * The customer never leaves TenderBase: we sign the request server-side,
 * PayFast returns a payment identifier, and the modal is rendered by PayFast's
 * own script against that identifier. Amounts still come from our catalogue.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await billingGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error, message: gate.message }, { status: gate.status });

  const plan = await readPlan(req);
  const outcome = await startOnsiteCheckout({ ...gate.caller, plan });

  if (!outcome.ok) {
    if (outcome.reason === 'unknown_plan') {
      return NextResponse.json({ error: 'unknown_plan' }, { status: 400 });
    }
    if (outcome.reason === 'payfast_unreachable') {
      return NextResponse.json(
        { error: 'payfast_unreachable', message: 'PayFast did not accept the request. Nothing was charged.' },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: outcome.reason }, { status: 503 });
  }

  return NextResponse.json({ uuid: outcome.uuid });
}
