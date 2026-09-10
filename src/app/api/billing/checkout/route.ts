import { NextResponse, type NextRequest } from 'next/server';

import { billingStorageConfigured, payfastConfig, startCheckout } from '@/lib/billing.server';
import { getUser } from '@/lib/supabase-server';

/**
 * Starts a PayFast checkout.
 *
 * POST { plan: 'pro-monthly' | 'pro-yearly' }
 *   200  { processUrl, fields }  — the browser posts `fields` to `processUrl`
 *   401  not_signed_in
 *   503  billing_not_configured | billing_storage_unconfigured
 *   400  unknown_plan
 *
 * The signing key never leaves the server, and the amount is resolved from
 * the server-side plan catalogue — the client only names a plan.
 */

export const runtime = 'nodejs';

function siteOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  // Behind the preview proxy these headers carry the public origin.
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ?? req.headers.get('host');
  if (host) return `${proto ?? 'https'}://${host}`;
  return new URL(req.url).origin;
}

export async function POST(req: NextRequest) {
  if (!payfastConfig()) {
    return NextResponse.json(
      {
        error: 'billing_not_configured',
        message: 'PayFast credentials are not configured on this deployment yet.',
      },
      { status: 503 },
    );
  }

  const user = await getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'not_signed_in', message: 'Sign in first — a subscription belongs to an account.' },
      { status: 401 },
    );
  }

  if (!billingStorageConfigured()) {
    return NextResponse.json(
      {
        error: 'billing_storage_unconfigured',
        message: 'Payments cannot be recorded yet (Supabase service role is not configured).',
      },
      { status: 503 },
    );
  }

  let plan = '';
  try {
    const body = (await req.json()) as { plan?: unknown };
    if (typeof body?.plan === 'string') plan = body.plan;
  } catch {
    /* empty body -> unknown_plan below */
  }

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const fullName = (meta.full_name ?? meta.name ?? '').trim();
  const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);

  const outcome = await startCheckout({
    plan,
    userId: user.id,
    email: user.email ?? '',
    name: { first: first ?? undefined, last: rest.join(' ') || undefined },
    origin: siteOrigin(req),
  });

  if (!outcome.ok) {
    const status = outcome.reason === 'unknown_plan' ? 400 : 503;
    return NextResponse.json({ error: outcome.reason }, { status });
  }

  return NextResponse.json({
    processUrl: outcome.request.processUrl,
    fields: outcome.request.fields,
  });
}
