import 'server-only';

import type { NextRequest } from 'next/server';

import { billingStorageConfigured, payfastConfig } from '@/lib/billing.server';
import { getUser } from '@/lib/supabase-server';

/**
 * Shared gate for the billing routes: every one of them needs the same
 * "is billing even configured", "is anyone signed in" answers before it can
 * do anything honest. Keeping it here means the embedded checkout, the
 * hosted checkout and the trial route cannot drift apart.
 */

export interface BillingCaller {
  userId: string;
  email: string;
  name: { first?: string; last?: string };
  origin: string;
}

export type BillingGate =
  | { ok: true; caller: BillingCaller }
  | { ok: false; status: 401 | 503; error: string; message: string };

/** Public origin of this deployment, so PayFast can call us back. */
export function siteOrigin(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, '');
  // Behind the preview proxy these headers carry the public origin.
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ?? req.headers.get('host');
  if (host) return `${proto ?? 'https'}://${host}`;
  return new URL(req.url).origin;
}

export async function billingGate(req: NextRequest): Promise<BillingGate> {
  if (!payfastConfig()) {
    return {
      ok: false,
      status: 503,
      error: 'billing_not_configured',
      message: 'PayFast credentials are not configured on this deployment yet.',
    };
  }

  const user = await getUser();
  if (!user) {
    return {
      ok: false,
      status: 401,
      error: 'not_signed_in',
      message: 'Sign in first — a subscription belongs to an account.',
    };
  }

  if (!billingStorageConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'billing_storage_unconfigured',
      message: 'Payments cannot be recorded yet (Supabase service role is not configured).',
    };
  }

  const meta = (user.user_metadata ?? {}) as { full_name?: string; name?: string };
  const fullName = (meta.full_name ?? meta.name ?? '').trim();
  const [first, ...rest] = fullName.split(/\s+/).filter(Boolean);

  return {
    ok: true,
    caller: {
      userId: user.id,
      email: user.email ?? '',
      name: { first: first ?? undefined, last: rest.join(' ') || undefined },
      origin: siteOrigin(req),
    },
  };
}

/** The client names a plan id; it never sends a price. */
export async function readPlan(req: NextRequest): Promise<string> {
  try {
    const body = (await req.json()) as { plan?: unknown };
    return typeof body?.plan === 'string' ? body.plan : '';
  } catch {
    return '';
  }
}
