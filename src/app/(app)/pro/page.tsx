import type { Metadata } from 'next';

import { billingStorageConfigured, fetchSubscription, payfastConfig } from '@/lib/billing.server';
import { entitlementFromSubscription, type SubscriptionSnapshot } from '@/lib/entitlement';
import { createClient, getUser } from '@/lib/supabase-server';
import { ProHubView } from './ProHubView';

export const metadata: Metadata = {
  title: 'Pro · TenderBase',
};

export const dynamic = 'force-dynamic';

/** The Pro hub. The server decides whether PayFast checkout can actually run. */
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

  return (
    <ProHubView
      billing={{
        payfastReady: Boolean(config),
        storageReady,
        sandbox: config?.sandbox ?? false,
        signedIn: Boolean(user),
      }}
    />
  );
}
