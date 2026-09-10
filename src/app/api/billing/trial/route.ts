import { NextResponse } from 'next/server';

import { endTrial, startTrial } from '@/lib/billing.server';
import { getUser } from '@/lib/supabase-server';
import { PRO_TRIAL_DAYS } from '@/types/tier';

/**
 * The Pro trial, server-side. One trial per account, ever — the browser
 * cannot grant or extend it, and the tier the server returns is derived from
 * the row this route writes.
 *
 * POST   starts the trial
 * DELETE ends it early (the account drops to Basic immediately)
 *
 * Explicit TENDERBASE_TEST_PRO mode is a deliberate deployment-level test
 * override. In that mode no billing row is required because the deployment
 * is already server-resolved as Pro.
 */

export const runtime = 'nodejs';

export async function POST() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'not_signed_in', message: 'Create a free account to start the trial.' },
      { status: 401 },
    );
  }

  if (process.env.TENDERBASE_TEST_PRO === 'true') {
    const trialEnd = new Date(Date.now() + PRO_TRIAL_DAYS * 86_400_000).toISOString();
    return NextResponse.json({ trialEnd, testMode: true });
  }

  const outcome = await startTrial(user.id);
  if (outcome.ok) return NextResponse.json({ trialEnd: outcome.trialEnd });

  const status = outcome.reason === 'already_used' || outcome.reason === 'already_subscribed' ? 409 : 503;
  return NextResponse.json({ error: outcome.reason }, { status });
}

export async function DELETE() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });
  }

  if (process.env.TENDERBASE_TEST_PRO === 'true') {
    return NextResponse.json({ ok: true, testMode: true });
  }

  const outcome = await endTrial(user.id);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.reason ?? 'failed' }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
