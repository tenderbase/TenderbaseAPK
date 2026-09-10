import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { billingStorageConfigured, fetchSubscription, payfastConfig } from '@/lib/billing.server';
import { entitlementFromSubscription, type SubscriptionSnapshot } from '@/lib/entitlement';
import { proOffer, safeNext, welcomeHref } from '@/lib/onboarding';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { createClient, getUser } from '@/lib/supabase-server';
import { WelcomeView } from './WelcomeView';

export const metadata: Metadata = {
  title: 'Choose your plan · TenderBase',
};

// The offer depends on account state (trial used? subscribed? checkout live?).
export const dynamic = 'force-dynamic';

/**
 * The first-run Basic/Pro decision.
 *
 * The server decides what the Pro card may offer — whether the one-per-account
 * trial is still available and whether a card payment could actually run — so
 * the screen cannot promise something the backend would refuse.
 */
export default async function WelcomePage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const next = safeNext(searchParams?.next);
  const user = await getUser();

  // Live deployment: this screen sits behind the account it is asking about.
  if (isSupabaseConfigured && !user) {
    redirect(`/login?next=${encodeURIComponent(welcomeHref(next))}`);
  }

  const config = payfastConfig();
  const storageReady = billingStorageConfigured();

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

  const { reason } = entitlementFromSubscription(snapshot);
  const subscribed = reason === 'subscribed' || reason === 'cancel_at_period_end';
  // Same rule as the Pro hub: the trial is offered only where it is real.
  const trialReady = reason === 'no_subscription' && (!user || storageReady);

  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const firstName = (meta.full_name ?? meta.name ?? '').trim().split(/\s+/)[0] || null;

  return (
    <WelcomeView
      mode={isSupabaseConfigured ? 'account' : 'preview'}
      firstName={firstName}
      offer={proOffer({ subscribed, trialReady, checkoutReady: Boolean(config) && storageReady })}
      sandbox={config?.sandbox ?? false}
      next={next}
    />
  );
}
