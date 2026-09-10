import type { Metadata } from 'next';

import { billingStorageConfigured, fetchInvoices, fetchSubscription, payfastConfig } from '@/lib/billing.server';
import { entitlementFromSubscription, type SubscriptionSnapshot } from '@/lib/entitlement';
import { createClient, getUser } from '@/lib/supabase-server';
import { PLANS } from '@/lib/payfast';
import { PRO_MONTHLY_ZAR, PRO_YEARLY_ZAR, formatZAR } from '@/types/tier';
import { PlanView, type PlanOption } from './PlanView';

export const metadata: Metadata = {
  title: 'Your plan · TenderBase',
};

// Prices and the subscription row change without a deploy; never cache.
export const dynamic = 'force-dynamic';

/**
 * Plan management: what the account has, what it costs, how to stop it, and
 * every payment we have recorded.
 *
 * The subscription and the invoices are read with the *user's* client, so
 * RLS ("read own rows") is what scopes them — this page cannot show anyone
 * another account's billing history even if it wanted to.
 */
export default async function ProPlanPage() {
  const user = await getUser();
  const config = payfastConfig();

  let snapshot: SubscriptionSnapshot | null = null;
  let status: string | null = null;
  let periodEnd: string | null = null;
  let cancelAtPeriodEnd = false;
  let invoices: { id: string; plan: string; amountCents: number; status: string; createdAt: string }[] = [];

  if (user) {
    const client = createClient();
    const sub = await fetchSubscription(client);
    if (sub) {
      status = sub.status;
      periodEnd = sub.currentPeriodEnd;
      cancelAtPeriodEnd = sub.cancelAtPeriodEnd;
      snapshot = {
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialEndsAt: sub.trialEndsAt,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      };
    }
    invoices = await fetchInvoices(client);
  }

  const entitlement = entitlementFromSubscription(snapshot);
  // A trial is paid for by nobody: its end date is what matters, and the
  // resolver already puts that in `trialEnd`.
  const effectivePeriodEnd = entitlement.trialEnd ?? periodEnd;

  const plans: PlanOption[] = [
    { id: 'pro-monthly', label: PLANS['pro-monthly'].label, display: formatZAR(PRO_MONTHLY_ZAR), cadence: 'per month' },
    { id: 'pro-yearly', label: PLANS['pro-yearly'].label, display: formatZAR(PRO_YEARLY_ZAR), cadence: 'per year' },
  ];

  return (
    <PlanView
      signedIn={Boolean(user)}
      payfastReady={Boolean(config)}
      sandbox={config?.sandbox ?? false}
      storageReady={billingStorageConfigured()}
      plans={plans}
      reason={entitlement.reason}
      status={status}
      periodEnd={effectivePeriodEnd}
      cancelAtPeriodEnd={cancelAtPeriodEnd}
      invoices={invoices}
    />
  );
}
