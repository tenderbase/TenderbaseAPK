import type { Metadata } from 'next';

import { billingStorageConfigured, fetchSubscription, payfastConfig } from '@/lib/billing.server';
import type { SubscriptionSnapshot } from '@/lib/entitlement';
import { createClient, getUser } from '@/lib/supabase-server';
import { BidAnalystHero } from '@/components/pro/BidAnalystHero';
import { ProHubView } from './ProHubView';

export const metadata: Metadata = { title: 'Pro · TenderBase' };
export const dynamic = 'force-dynamic';

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
    <>
      <div className="px-5 pt-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <BidAnalystHero />
        </div>
      </div>
      <ProHubView
        billing={{
          payfastReady: Boolean(config),
          storageReady,
          sandbox: config?.sandbox ?? false,
          signedIn: Boolean(user),
        }}
      />
    </>
  );
}
