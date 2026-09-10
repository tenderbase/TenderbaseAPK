import { NextResponse, type NextRequest } from 'next/server';

import { startCheckout } from '@/lib/billing.server';
import { billingGate, readPlan } from '@/lib/billing-request';

/**
 * Hosted PayFast checkout — the fallback for browsers that cannot run the
 * embedded modal (no JavaScript, or PayFast's onsite script blocked).
 *
 * POST { plan: 'pro-monthly' | 'pro-yearly' }
 *   200  { processUrl, fields }  — the browser posts `fields` to `processUrl`
 *   400  unknown_plan
 *   401  not_signed_in
 *   503  billing_not_configured | billing_storage_unconfigured
 *
 * The signing key never leaves the server, and the amount is resolved from
 * the server-side plan catalogue — the client only names a plan.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const gate = await billingGate(req);
  if (!gate.ok) return NextResponse.json({ error: gate.error, message: gate.message }, { status: gate.status });

  const plan = await readPlan(req);
  const outcome = await startCheckout({ ...gate.caller, plan });

  if (!outcome.ok) {
    const status = outcome.reason === 'unknown_plan' ? 400 : 503;
    return NextResponse.json({ error: outcome.reason }, { status });
  }

  return NextResponse.json({
    processUrl: outcome.request.processUrl,
    fields: outcome.request.fields,
  });
}
