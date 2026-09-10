import { NextResponse } from 'next/server';

import { endTrial, startTrial } from '@/lib/billing.server';
import { getUser } from '@/lib/supabase-server';
import { PRO_TRIAL_DAYS } from '@/types/tier';

export const runtime = 'nodejs';

export async function POST() {
  try {
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
  } catch (error) {
    console.error('[billing/trial] POST failed', error);
    return NextResponse.json({ error: 'failed', message: 'Unable to start the trial right now.' }, { status: 503 });
  }
}

export async function DELETE() {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'not_signed_in' }, { status: 401 });

    if (process.env.TENDERBASE_TEST_PRO === 'true') {
      return NextResponse.json({ ok: true, testMode: true });
    }

    const outcome = await endTrial(user.id);
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.reason ?? 'failed' }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[billing/trial] DELETE failed', error);
    return NextResponse.json({ error: 'failed' }, { status: 503 });
  }
}
