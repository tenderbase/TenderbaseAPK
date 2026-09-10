'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Crown, Loader2, Receipt, TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { PlanChip, ProBadge } from '@/components/ui/PlanChip';
import { useTier } from '@/lib/tier-store';
import { SubscribeButton } from '@/components/billing/SubscribeButton';

export interface PlanOption {
  id: string;
  label: string;
  display: string;
  cadence: string;
}

export interface InvoiceRow {
  id: string;
  plan: string;
  amountCents: number;
  status: string;
  createdAt: string;
}

export interface PlanViewProps {
  signedIn: boolean;
  payfastReady: boolean;
  sandbox: boolean;
  storageReady: boolean;
  plans: PlanOption[];
  reason: string;
  status: string | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  invoices: InvoiceRow[];
}

function StatusCard({ title, body, tone }: { title: string; body: string; tone: 'pro' | 'basic' }) {
  return (
    <div className={cn('flex items-start gap-3 rounded-[16px] border p-4', tone === 'pro' ? 'border-pro-line bg-pro-soft' : 'border-line bg-white')}>
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]', tone === 'pro' ? 'bg-pro text-[#3d3205]' : 'bg-canvas text-ink-2')}>
        <Crown size={19} strokeWidth={2.1} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15.5px] font-bold tracking-[-0.02em] text-ink">{title}</p>
        <p className="mt-0.5 text-[12.5px] leading-[1.45] text-ink-2">{body}</p>
      </div>
      {tone === 'pro' && <ProBadge />}
    </div>
  );
}

function Rands({ cents }: { cents: number }) {
  return <>{`R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</>;
}

export function PlanView(props: PlanViewProps) {
  const router = useRouter();
  const { tier } = useTier();
  const [pending, setPending] = useState<null | 'cancel'>(null);
  const [notice, setNotice] = useState<null | { tone: 'ok' | 'error'; text: string }>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { reason, status, periodEnd, cancelAtPeriodEnd, signedIn, payfastReady, sandbox, storageReady, plans, invoices } = props;
  const paidActive = reason === 'subscribed' || reason === 'cancel_at_period_end';
  const subscribed = paidActive || status === 'active';

  async function cancelSubscription() {
    setPending('cancel');
    setNotice(null);
    try {
      const res = await fetch('/api/billing/cancel', { method: 'POST' });
      const body = (await res.json().catch(() => ({}))) as { periodEnd?: string; message?: string };
      if (!res.ok) {
        setNotice({ tone: 'error', text: body.message ?? 'PayFast did not confirm the cancellation, so nothing changed.' });
        return;
      }
      setConfirmCancel(false);
      setNotice({ tone: 'ok', text: body.periodEnd ? `Cancelled — no further charges. Pro stays on until ${formatDate(body.periodEnd)}.` : 'Cancelled — no further charges.' });
      router.refresh();
    } catch {
      setNotice({ tone: 'error', text: 'We could not reach the server. Nothing changed.' });
    } finally {
      setPending(null);
    }
  }

  return (
    <main className="pb-24">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-2">
        <Link href="/pro" aria-label="Back to Pro" className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink">
          <ChevronLeft size={21} strokeWidth={1.75} aria-hidden />
        </Link>
        <h1 className="flex-1 truncate text-card-title font-semibold tracking-[-0.02em]">Your plan</h1>
        <PlanChip tier={tier} />
      </header>

      <div className="space-y-5 px-5 pt-4">
        {!signedIn ? (
          <StatusCard tone="basic" title="Sign in to manage a subscription" body="A Pro subscription belongs to your account — sign in and it follows you to every device. Basic stays free." />
        ) : paidActive && cancelAtPeriodEnd && periodEnd ? (
          <StatusCard tone="pro" title="Cancelled — Pro until your period ends" body={`No further charges will be made. Pro stays unlocked until ${formatDate(periodEnd)}.`} />
        ) : paidActive ? (
          <StatusCard tone="pro" title="Pro subscription active" body={periodEnd ? `Billed automatically until you cancel. Current period ends ${formatDate(periodEnd)}.` : 'Billed automatically until you cancel.'} />
        ) : (
          <StatusCard tone="basic" title="You are on Basic" body="Basic is free forever: 50 saved tenders, top-3 daily matches and in-app alerts. Subscribe to unlock full Pro." />
        )}

        {notice && (
          <p className={cn('rounded-[12px] border px-3.5 py-2.5 text-[12.5px] leading-[1.45]', notice.tone === 'ok' ? 'border-open/30 bg-open-soft/40 text-ink' : 'border-soon/30 bg-soon-soft/40 text-ink')}>
            {notice.text}
          </p>
        )}

        {signedIn && (
          <section className="space-y-3">
            {subscribed && !cancelAtPeriodEnd && (
              <div className="rounded-[16px] border border-line bg-white p-4">
                {confirmCancel ? (
                  <>
                    <p className="text-[13.5px] font-semibold text-ink">Cancel your subscription?</p>
                    <p className="mt-1 text-[12.5px] leading-[1.45] text-ink-2">
                      PayFast will stop charging you. You keep Pro until your paid period ends{periodEnd ? ` (${formatDate(periodEnd)})` : ''} — nothing you saved is deleted.
                    </p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={cancelSubscription} disabled={pending !== null} className="flex h-[42px] flex-1 items-center justify-center gap-2 rounded-md border border-soon/40 bg-soon-soft/40 text-[13.5px] font-semibold text-ink disabled:opacity-60">
                        {pending === 'cancel' && <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden />}
                        Yes, cancel
                      </button>
                      <button type="button" onClick={() => setConfirmCancel(false)} disabled={pending !== null} className="h-[42px] flex-1 rounded-md border border-line bg-white text-[13.5px] font-semibold text-ink">
                        Keep Pro
                      </button>
                    </div>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmCancel(true)} className="text-[13px] font-semibold text-ink-2 underline decoration-line underline-offset-2">
                    Cancel subscription
                  </button>
                )}
              </div>
            )}

            {!subscribed && (
              <div className="overflow-hidden rounded-[16px] border-2 border-pro bg-white shadow-card">
                <div className="px-4 pb-4 pt-4">
                  <p className="text-center text-[12.5px] leading-[1.45] text-ink-2">Subscribe to unlock Pro on every device.</p>
                  {payfastReady && storageReady ? (
                    <div className="mt-3 space-y-2.5">
                      {plans.map((plan) => (
                        <SubscribeButton key={plan.id} plan={plan.id} label={`${plan.display} — ${plan.cadence}`} signingIn={!signedIn} sandbox={sandbox} />
                      ))}
                      <p className="text-center text-[11px] leading-[1.45] text-ink-3">
                        Paid securely by card via PayFast, in rand. Recurring until you cancel. VAT included.{sandbox && ' Sandbox mode — no real money moves.'}
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-[12px] leading-[1.45] text-ink-2">
                      <TriangleAlert size={13} strokeWidth={2.2} className="mt-[1.5px] shrink-0 text-soon" aria-hidden />
                      Card payments are not switched on for this deployment yet. Nothing will be charged, and we will not pretend otherwise.
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {signedIn && (
          <section>
            <h2 className="mb-2 flex items-center gap-1.5 px-0.5 text-section font-semibold tracking-[-0.02em] text-ink">
              <Receipt size={16} strokeWidth={2.1} aria-hidden />
              Invoices
            </h2>
            <div className="overflow-hidden rounded-[16px] border border-line bg-white">
              {invoices.length === 0 ? (
                <p className="px-4 py-4 text-[12.5px] leading-[1.45] text-ink-2">No payments yet — you have not been charged.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{inv.plan}</p>
                        <p className="text-[11.5px] text-ink-3">{formatDate(inv.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[13.5px] font-semibold text-ink"><Rands cents={inv.amountCents} /></p>
                        <p className={cn('text-[11px] font-semibold uppercase tracking-wide', inv.status === 'complete' ? 'text-open' : 'text-ink-3')}>{inv.status}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <p className="mt-2 px-0.5 text-[11.5px] leading-[1.45] text-ink-3">PayFast emails a receipt for every successful payment. These rows are our own record of your account.</p>
          </section>
        )}

        <p className="px-0.5 text-[11.5px] leading-[1.45] text-ink-3">
          Browsing is always free. Pro adds depth — it never removes access. Questions? Reply to any TenderBase email and we will help.
        </p>
      </div>
    </main>
  );
}
