import type { Metadata } from 'next';
import { getUser } from '@/lib/supabase-server';
import ProfileView, { type ProfileIdentity } from './ProfileView';

export const metadata: Metadata = { title: 'Profile · TenderBase' };

/** Google returns display names inconsistently; fall back down the chain. */
function toIdentity(
  meta: Record<string, unknown> | undefined,
  email: string | null,
): ProfileIdentity {
  const name =
    (meta?.full_name as string) ??
    (meta?.name as string) ??
    email?.split('@')[0] ??
    'Your account';

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'U';

  return {
    name,
    email: email ?? 'Not signed in',
    initials,
    avatarUrl: (meta?.avatar_url as string) ?? (meta?.picture as string) ?? null,
  };
}

export default async function ProfilePage() {
  const user = await getUser();

  return (
    <ProfileView
      identity={
        user
          ? toIdentity(user.user_metadata, user.email ?? null)
          : { name: 'Guest', email: 'Not signed in', initials: 'G', avatarUrl: null }
      }
    />
  );
}
