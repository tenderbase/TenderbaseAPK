import { NextResponse, type NextRequest } from 'next/server';

import { processItn } from '@/lib/billing.server';

/**
 * PayFast ITN (Instant Transaction Notification) webhook.
 *
 * PayFast posts urlencoded transaction data here and retries unless it gets
 * HTTP 200. We only answer 200 once the notification has been verified
 * (signature + our own pending amount) and confirmed with PayFast
 * server-to-server — a rejected or unconfirmed payload gets a non-200 so
 * PayFast retries rather than us silently dropping a real payment.
 *
 * Non-200 codes are deliberate:
 *   400  the payload failed validation and will never be accepted
 *   500  we could not confirm or record (transient) — retry is correct
 *   503  billing is not configured on this deployment
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!rawBody) {
    return new NextResponse('EMPTY ITN', { status: 400 });
  }

  const outcome = await processItn(rawBody);

  if (outcome.ok) {
    return new NextResponse('OK', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
  console.error('[billing] ITN not accepted:', outcome.code, outcome.note);
  return new NextResponse(`NOT ACCEPTED: ${outcome.note}`, {
    status: outcome.code,
    headers: { 'Content-Type': 'text/plain' },
  });
}
