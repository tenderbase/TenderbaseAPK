import type { Metadata } from 'next';

import { billingStorageConfigured, fetchSubscription, payfastConfig } from '@/lib/billing.server';
import { entitlementFromSubscription, type SubscriptionSnapshot } from '@/lib/entitlement';
import { createClient, getUser } from '@/lib/supabase-server';
import { ProHubView } from './ProHubView';

export const metadata: Metadata = {
  title: 'Pro · TenderBase',
};

export const dynamic = 'force-dynamic';

/**
 * The Pro hub. The server decides what this deployment and this account can
 * actually do — whether PayFast is configured, whether a payment could be
 * recorded, and whether the one-time trial is still available — so the page
 * never shows a checkout button that cannot work.
 *
 * In explicit TENDERBASE_TEST_PRO mode, the trial button is also available
 * without billing storage because that deployment is intentionally running
 * as a Pro test environment.
 */
export default async function ProPage() {
  const config = payfastConfig();
  const user = await getUser();

  let snapshot: SubscriptionSnapshot | null = null;
  if (user) {
    const sub = await fetchSubscription(createClient());
    if (sub) {
      snapshot = {
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        trialEndsAt: sub.trialEndsAt,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      };
    }
  }

  const storageReady = billingStorageConfigured();
  const { reason } = entitlementFromSubscription(snapshot);
  const testProEnabled = process.env.TENDERBASE_TEST_PRO === 'true';

  // In test mode the deployment is intentionally Pro, so the trial CTA must
  // remain usable even when Supabase billing storage is not configured.
  const trialAvailable = testProEnabled || (reason === 'no_subscription' && (!user || storageReady));

  return (
    <ProHubView
      billing={{
        payfastReady: Boolean(config),
        storageReady,
        sandbox: config?.sandbox ?? false,
        signedIn: Boolean(user),
        trialAvailable,
      }}
    />
  );
}
