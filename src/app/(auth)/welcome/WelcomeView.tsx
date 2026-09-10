'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, Check, Crown, Loader2, Sparkles, TriangleAlert,
} from 'lucide-react';

import { cn } from '@/lib/cn';
import { SubscribeButton } from '@/components/billing/SubscribeButton';
import { writePreviewTier } from '@/lib/tier-cookies';
import {
  BASIC_POINTS,
  PRO_POINTS,
  type ProOffer,
} from '@/lib/onboarding';
import { persistOnboardingChoice } from '@/lib/onboarding-remote';
import { PRO_MONTHLY_ZAR, PRO_TRIAL_DAYS, PRO_YEARLY_ZAR, formatZAR } from '@/types/tier';

/**
 * The first-run decision: Basic or Pro.
 *
 * Both doors are one tap and neither is a trap — Basic is the free account,
 * the trial is the server's one-per-account trial, and "unavailable" is a
 * state we say out loud instead of showing a button that cannot work.
 */

type Busy = null | 'basic' | 'trial';

export function WelcomeView({
  mode,
  firstName,
  offer: initialOffer,
  sandbox,
  next,
}: {
  /** 'account' — real auth + database; 'preview' — credentials absent. */
  mode: 'account' | 'preview';
  firstName: string | null;
  offer: ProOffer;
  /** PayFast sandbox mode — the modal must point at the same host we signed for. */
  sandbox: boolean;
  next: string;
}) {
  const router = useRouter();
  const [offer, setOffer] = useState<ProOffer>(initialOffer);
  const [busy, setBusy] = useState<Busy>(null);
  const [notice, setNotice] = useState<null | { tone: 'info' | 'error'; text: string }>(null);

  async function record(choice: 'basic' | 'pro') {
    if (mode === 'preview') return;
    const saved = await persistOnboardingChoice(choice);
    if (!saved) {
      setNotice({
        tone: 'error',
        text: 'We could not record that on your account just now — you can still continue, and change it any time on the Pro screen.',
      });
    }
  }

  async function chooseBasic() {
    setBusy('basic');
    setNotice(null);
    await record('basic');
    router.push(next);
  }

  async function chooseTrial() {
    setBusy('trial');
    setNotice(null);

    if (mode === 'preview') {
      // No account store on this deployment, so the browser-side preview grant
      // is the only mechanism that exists — and the screen says as much. This
      // is a no-op on any deployment with credentials: a signed-in account
      // resolves through its verified subscription and ignores the cookie.
      writePreviewTier('pro', new Date(Date.now() + PRO_TRIAL_DAYS * 86_400_000).toISOString());
      router.push(next);
      return;
    }

    try {
      const res = await fetch('/api/billing/trial', { method: 'POST' });
      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      if (res.status === 409) {
        setOffer('subscribe');
        setNotice({ tone: 'info', text: 'That account has already used its trial — you can subscribe instead.' });
        return;
      }
      if (!res.ok) {
        setNotice({ tone: 'error', text: 'We could not start the trial just now. Nothing was charged — please try again.' });
        return;
      }
      await record('pro');
      router.push(next);
    } catch {
      setNotice({ tone: 'error', text: 'We could not reach the server. Nothing changed — please try again.' });
    } finally {
      setBusy(null);
    }
  }

  const heading = firstName ? `Welcome, ${firstName}` : 'Welcome to TenderBase';

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-10 pt-12">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-navy">
          <span className="text-[17px] font-bold leading-none text-white">T</span>
        </span>
        <p className="text-[19px] font-bold tracking-[-0.03em]">
          Tender<span className="text-ink-3">Base</span>
        </p>
      </div>

      <div className="mt-8">
        <h1 className="text-[28px] font-bold leading-[1.14] tracking-[-0.04em]">{heading}</h1>
        <p className="mt-2 text-[14.5px] leading-[1.5] text-ink-2">
          Pick how you want to start. Both take one tap, and you can change your mind any time.
        </p>
      </div>

      {mode === 'preview' && (
        <div className="mt-5 rounded-[12px] border border-soon/25 bg-soon-bg px-3 py-2.5">
          <p className="text-[12px] font-semibold text-soon">Preview mode</p>
          <p className="mt-0.5 text-[11.5px] leading-[1.45] text-ink-2">
            Accounts are not configured on this deployment, so this choice is not saved to an
            account — it applies to this browser only.
          </p>
        </div>
      )}

      {notice && (
        <p
          className={cn(
            'mt-5 rounded-[12px] border px-3 py-2.5 text-[12.5px] leading-[1.45] text-ink',
            notice.tone === 'error' ? 'border-soon/30 bg-soon-soft/40' : 'border-line bg-canvas',
          )}
        >
          {notice.text}
        </p>
      )}

      {/* -------------------------------------------------------------- */}
      {/* Basic                                                           */}
      {/* -------------------------------------------------------------- */}
      <section className="mt-6 overflow-hidden rounded-[16px] border border-line bg-white shadow-card">
        <div className="px-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold tracking-[-0.02em] text-ink">Basic</h2>
            <span className="rounded-md bg-canvas px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-2">
              Free forever
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-[1.45] text-ink-2">
            A signed-in account. Enough to follow tenders seriously.
          </p>
          <ul className="mt-3 space-y-2">
            {BASIC_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-[13px] leading-[1.4] text-ink">
                <Check size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-open" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4">
          <button
            type="button"
            onClick={chooseBasic}
            disabled={busy !== null}
            className={cn(
              'flex h-[50px] w-full items-center justify-center gap-2 rounded-md border-[1.5px] border-line bg-white text-[15px] font-semibold text-ink transition-colors active:bg-canvas',
              busy !== null && 'opacity-60',
            )}
          >
            {busy === 'basic' ? (
              <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden />
            ) : (
              <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
            )}
            Continue with Basic
          </button>
        </div>
      </section>

      {/* -------------------------------------------------------------- */}
      {/* Pro                                                             */}
      {/* -------------------------------------------------------------- */}
      <section className="mt-4 overflow-hidden rounded-[16px] border-2 border-pro bg-white shadow-card">
        <div className="bg-navy px-4 pb-4 pt-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-[17px] font-bold tracking-[-0.02em]">
              <Crown size={17} strokeWidth={2.2} className="text-pro" aria-hidden />
              Pro
            </h2>
            <span className="text-[12px] font-semibold text-blue-soft/85">
              {formatZAR(PRO_MONTHLY_ZAR)}/mo · {formatZAR(PRO_YEARLY_ZAR)}/yr
            </span>
          </div>
          <p className="mt-1 text-[13px] leading-[1.45] text-blue-soft/85">
            Everything unlocked, on every device.
          </p>
        </div>

        <div className="px-4 pt-4">
          <ul className="space-y-2">
            {PRO_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2 text-[13px] leading-[1.4] text-ink">
                <Sparkles size={15} strokeWidth={2.2} className="mt-0.5 shrink-0 text-pro" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4">
          {offer === 'active' ? (
            <>
              <p className="text-center text-[13px] font-semibold text-ink">You&apos;re on Pro already.</p>
              <button
                type="button"
                onClick={() => router.push(next)}
                className="mt-3 flex h-[50px] w-full items-center justify-center gap-2 rounded-md bg-navy text-[15px] font-semibold text-white"
              >
                Continue
                <ArrowRight size={17} strokeWidth={2.2} aria-hidden />
              </button>
            </>
          ) : offer === 'trial' ? (
            <>
              <button
                type="button"
                onClick={chooseTrial}
                disabled={busy !== null}
                className={cn(
                  'flex h-[50px] w-full items-center justify-center gap-2 rounded-md bg-pro text-[15px] font-semibold text-[#3d3205] shadow-gold-glow transition-colors active:opacity-90',
                  busy !== null && 'opacity-70',
                )}
              >
                {busy === 'trial' ? (
                  <Loader2 size={17} className="animate-spin motion-reduce:animate-none" aria-hidden />
                ) : (
                  <Crown size={17} strokeWidth={2.2} aria-hidden />
                )}
                Start {PRO_TRIAL_DAYS}-day free trial
              </button>
              <p className="mt-2 text-center text-[11.5px] leading-[1.45] text-ink-3">
                Full Pro for {PRO_TRIAL_DAYS} days. No card, no charge, and nothing renews by itself —
                when it ends the account returns to Basic.
              </p>
            </>
          ) : offer === 'subscribe' ? (
            <>
              <div className="space-y-2.5">
                <SubscribeButton
                  plan="pro-yearly"
                  label={`Subscribe — ${formatZAR(PRO_YEARLY_ZAR)}/yr`}
                  signingIn={false}
                  sandbox={sandbox}
                />
                <SubscribeButton
                  plan="pro-monthly"
                  label={`Subscribe — ${formatZAR(PRO_MONTHLY_ZAR)}/mo`}
                  signingIn={false}
                  sandbox={sandbox}
                />
              </div>
              <p className="mt-2 text-center text-[11.5px] leading-[1.45] text-ink-3">
                Secure card payment via PayFast. Cancel any time — you keep Pro until the period you
                paid for ends.
              </p>
            </>
          ) : (
            <p className="flex items-start justify-center gap-1.5 text-center text-[12px] leading-[1.45] text-ink-2">
              <TriangleAlert size={13} strokeWidth={2.2} className="mt-[1.5px] shrink-0 text-soon" aria-hidden />
              The trial has already been used and card checkout is not switched on for this deployment
              yet — so there is nothing we can honestly sell you here. Basic is free and stays that way.
            </p>
          )}
        </div>
      </section>

      <p className="mt-4 text-center text-[11.5px] leading-[1.55] text-ink-3">
        You can switch between Basic and Pro whenever you like — see{' '}
        <Link href="/pro" className="font-semibold text-navy underline decoration-line underline-offset-2">
          Pro
        </Link>
        . Browsing the full catalogue is free either way.
      </p>
    </main>
  );
}
