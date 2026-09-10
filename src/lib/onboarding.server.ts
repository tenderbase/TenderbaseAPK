import 'server-only';

/**
 * Server-side read of the onboarding decision.
 *
 * Used by the OAuth callback (to send first-run users to the decision moment)
 * and by the welcome screen itself. A missing table — migrations not run yet —
 * reports as "decided", because routing everyone through a screen that cannot
 * save anything would be worse than quietly skipping it.
 */
export async function onboardingDecided(client: { from: (table: string) => any }): Promise<boolean> {
  try {
    const { data, error } = await client
      .from('user_onboarding')
      .select('plan_choice')
      .maybeSingle();

    if (error) return true;
    return Boolean(data);
  } catch {
    return true;
  }
}
