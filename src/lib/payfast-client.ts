'use client';

/**
 * Browser half of the embedded PayFast checkout.
 *
 * PayFast's onsite flow is two steps:
 *   1. the SERVER posts signed payment fields to /onsite/process and gets a
 *      payment identifier (uuid) — see src/lib/billing.server.ts;
 *   2. the BROWSER hands that uuid to PayFast's script, which opens the card
 *      form as a modal on our own page.
 *
 * The signing key never reaches this file, and the amount is never named here
 * — the server resolves both from the plan catalogue.
 */

declare global {
  interface Window {
    payfast_do_onsite_payment?: (
      options: { uuid: string; return_url?: string; cancel_url?: string },
      done?: (success: boolean) => void,
    ) => void;
  }
}

const SCRIPT_ID = 'payfast-onsite-engine';

export function payfastScriptUrl(sandbox: boolean): string {
  const host = sandbox ? 'sandbox.payfast.co.za' : 'www.payfast.co.za';
  return `https://${host}/onsite/engine.js`;
}

/** Injects PayFast's onsite script once per page. Resolves false if it fails. */
export function loadPayfastOnsite(sandbox: boolean): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.payfast_do_onsite_payment) return Promise.resolve(true);

  return new Promise((resolve) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = payfastScriptUrl(sandbox);
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', () => resolve(Boolean(window.payfast_do_onsite_payment)));
    script.addEventListener('error', () => resolve(false));
    // The script may already have loaded while we were attaching listeners.
    setTimeout(() => resolve(Boolean(window.payfast_do_onsite_payment)), 4000);
  });
}

export type OnsiteResult = 'paid' | 'closed' | 'unavailable';

/** Opens the PayFast modal. 'paid' means PayFast said so — not that Pro is on. */
export function openOnsitePayment(uuid: string): Promise<Exclude<OnsiteResult, 'unavailable'>> {
  return new Promise((resolve) => {
    const run = window.payfast_do_onsite_payment;
    if (!run) {
      resolve('closed');
      return;
    }
    try {
      run({ uuid }, (success) => resolve(success ? 'paid' : 'closed'));
    } catch {
      resolve('closed');
    }
  });
}
