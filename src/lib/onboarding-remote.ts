'use client';

import { createClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import { currentSessionUserId } from '@/lib/supabase-user';
import type { OnboardingChoice } from '@/lib/onboarding';

/**
 * Records the first-run choice on the account (RLS: own row only).
 *
 * One row per user, upserted, so choosing again later just corrects the
 * record. Returns false when it could not be saved — the caller then says so
 * rather than pretending the decision stuck.
 */
export async function persistOnboardingChoice(choice: OnboardingChoice): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const userId = await currentSessionUserId();
  if (!userId) return false;

  const { error } = await createClient()
    .from('user_onboarding')
    .upsert(
      { user_id: userId, plan_choice: choice, decided_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) {
    console.error('[onboarding] could not record choice:', error.message);
    return false;
  }
  return true;
}
