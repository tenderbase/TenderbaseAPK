'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Crown, Loader2, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/cn';
import { loadPayfastOnsite, openOnsitePayment } from '@/lib/payfast-client';

/**
 * Real PayFast checkout, embedded.
 *
 * The browser asks our server for a payment identifier (the server signs the
 * request with the merchant key and resolves the price from the plan
 * catalogue), then opens PayFast's own modal on this page. Nothing about the
 * payment — amount, merchant, signature — is decided here.
 *
 * If PayFast's script cannot load we fall back to the hosted checkout: the
 * same signed fields are POSTed to PayFast as a plain form so the customer
 * can still pay. If neither path is available we say so; we never pretend.
 */

type Phase =
  | { kind: 'idle' }
  | { kind: 'opening' }
  | { kind: 'paying' }
  | { kind: 'verifying' }
  | { kind: 'closed' }
  | { kind: 'error'; message: string };

const POLL_DELAYS_MS = [1500, 4000, 8000, 15_000];

export function SubscribeButton({
  plan,
  label,
  signingIn,
  sandbox,
  className,
  onStarted,
}: {
  plan: string;
  label: string;
  /** True when nobody is signed in — a subscription belongs to an account. */
  signingIn: boolean;
  sandbox: boolean;
  className?: string;
  onStarted?: () => void;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });

  const busy = phase.kind === 'opening' || phase.kind === 'paying' || phase.kind === 'verifying';

  async function hostedFallback(): Promise<boolean> {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { processUrl?: string; fields?: Record<string, string> };
    if (!data.processUrl || !data.fields) return false;

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = data.processUrl;
    for (const [name, value] of Object.entries(data.fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = value;
      form.appendChild(input);
    }
    document.body.appendChild(form);
    form.submit();
    return true;
  }

  async function start() {
    if (signingIn) {
      router.push('/login?next=/pro/plan');
      return;
    }

    setPhase({ kind: 'opening' });
    try {
      const res = await fetch('/api/billing/onsite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      if (res.status === 401) {
        router.push('/login?next=/pro/plan');
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        setPhase({
          kind: 'error',
          message: body.message ?? 'We could not reach PayFast. Nothing was charged — please try again.',
        });
        return;
      }

      const { uuid } = (await res.json()) as { uuid: string };
      onStarted?.();

      const ready = await loadPayfastOnsite(sandbox);
      if (!ready) {
        const opened = await hostedFallback();
        if (!opened) {
          setPhase({ kind: 'error', message: 'Checkout could not open. Nothing was charged — please try again.' });
        }
        return;
      }

      setPhase({ kind: 'paying' });
      const result = await openOnsitePayment(uuid);
      if (result === 'closed') {
        setPhase({ kind: 'closed' });
        return;
      }

      // PayFast says the customer paid. Pro switches on when the ITN reaches
      // our webhook and the server re-resolves the entitlement, so we refresh
      // the page a few times rather than claiming it is already unlocked.
      setPhase({ kind: 'verifying' });
      POLL_DELAYS_MS.forEach((delay) => {
        setTimeout(() => router.refresh(), delay);
      });
    } catch {
      setPhase({ kind: 'error', message: 'Checkout could not open. Nothing was charged — please try again.' });
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className={cn(
          'flex h-[50px] w-full items-center justify-center gap-2 rounded-md bg-navy text-[15px] font-semibold text-white transition-colors active:opacity-90',
          busy && 'opacity-70',
        )}
      >
        {busy ? (
          <Loader2 size={17} strokeWidth={2.2} className="animate-spin motion-reduce:animate-none" aria-hidden />
        ) : (
          <Crown size={17} strokeWidth={2.2} aria-hidden />
        )}
        {phase.kind === 'paying'
          ? 'Waiting for PayFast…'
          : phase.kind === 'verifying'
            ? 'Confirming payment…'
            : phase.kind === 'opening'
              ? 'Opening checkout…'
              : label}
      </button>

      {phase.kind === 'verifying' && (
        <p className="mt-2 text-center text-[11.5px] leading-[1.45] text-ink-2">
          PayFast has your payment. We confirm it with PayFast on our servers, then Pro unlocks —
          this can take a few seconds. This page updates itself.
        </p>
      )}
      {phase.kind === 'closed' && (
        <p className="mt-2 text-center text-[11.5px] leading-[1.45] text-ink-2">
          Payment window closed — nothing was charged.
        </p>
      )}
      {phase.kind === 'error' && (
        <p className="mt-2 flex items-start justify-center gap-1.5 text-center text-[11.5px] leading-[1.45] text-soon">
          <TriangleAlert size={13} strokeWidth={2.2} className="mt-[1.5px] shrink-0" aria-hidden />
          {phase.message}
        </p>
      )}
    </div>
  );
}
