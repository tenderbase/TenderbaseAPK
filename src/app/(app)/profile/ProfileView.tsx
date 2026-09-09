'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignOutButton } from '@/components/auth/SignOutButton';
import {
  Building2, SlidersHorizontal, Bookmark, Crown, Bell,
  HelpCircle, ShieldCheck, Info, LogIn, ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MenuButton } from '@/components/nav/MenuButton';
import { useSavedTenders } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { PlanChip } from '@/components/ui/PlanChip';
import { loadPreferences } from '@/lib/preferences';
import { fetchPreferences } from '@/lib/preferences-remote';
import { loadProfile } from '@/lib/company';
import { fetchProfile } from '@/lib/company-remote';

function Row({
  icon: Icon,
  title,
  sub,
  href,
  soon,
  danger,
  right,
}: {
  icon: LucideIcon;
  title: string;
  sub?: string;
  href?: string;
  /** Not built yet — shown, labelled, and NOT clickable. No dead links. */
  soon?: boolean;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  const visual = (
    <>
      <span
        className={cn(
          'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]',
          danger ? 'bg-urgent-bg text-urgent' : 'bg-canvas text-navy',
        )}
      >
        <Icon size={17} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[14.5px] font-medium tracking-[-0.015em]', danger && 'text-urgent')}>
          {title}
        </span>
        {sub && <span className="mt-px block text-caption text-ink-3">{sub}</span>}
      </span>
      {soon ? (
        <span className="shrink-0 rounded-md bg-canvas px-1.5 py-0.5 text-[10px] font-semibold text-ink-3">
          Soon
        </span>
      ) : (
        (right ?? <ChevronRight size={17} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />)
      )}
    </>
  );

  if (soon || !href) {
    return (
      <div aria-disabled={soon || undefined} className={cn('flex items-center gap-3 py-2.5', soon && 'opacity-45')}>
        {visual}
      </div>
    );
  }
  return (
    <Link href={href} className="flex items-center gap-3 py-2.5">
      {visual}
    </Link>
  );
}

function Group({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="mb-3.5">
      {title && (
        <h2 className="mb-1.5 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">{title}</h2>
      )}
      <div className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">{children}</div>
    </section>
  );
}

export interface ProfileIdentity {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
}

export default function ProfileView({ identity }: { identity: ProfileIdentity }) {
  const router = useRouter();
  const { session, count: savedCount } = useSavedTenders();
  const { tier, trial } = useTier();
  const [categoryCount, setCategoryCount] = useState(0);
  const [companyName, setCompanyName] = useState<string | null>(null);

  // Real numbers only: categories come from preferences, the company name
  // from the company profile. Nothing is hardcoded to a demo persona.
  useEffect(() => {
    setCategoryCount(loadPreferences().categories.length);
    const local = loadProfile();
    setCompanyName(local.legalName?.trim() || null);

    if (session.signedIn) {
      void fetchPreferences().then((remote) => {
        if (remote) setCategoryCount(remote.categories.length);
      });
      void fetchProfile().then((remote) => {
        if (remote?.legalName) setCompanyName(remote.legalName);
      });
    }
  }, [session.signedIn]);

  const signedIn = session.signedIn;

  return (
    <main>
      <header className="border-b border-line bg-white px-5 pb-3 pt-1.5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Profile</h1>
          </div>
          <Link
            href="/profile/preferences"
            aria-label="Tender preferences"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink"
          >
            <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>

        <div className="flex items-center gap-3.5">
          {identity.avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={identity.avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              className="h-[54px] w-[54px] shrink-0 rounded-[16px] object-cover"
            />
          ) : (
            <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[16px] bg-navy text-[19px] font-semibold text-white">
              {signedIn ? (identity.initials || session.initials || 'U') : 'G'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-bold tracking-[-0.03em]">
              {signedIn ? identity.name : 'Browse as guest'}
            </p>
            <p className="mt-0.5 truncate text-meta text-ink-2">
              {signedIn ? identity.email : 'Not signed in'}
            </p>
            <span className="mt-1.5 inline-flex items-center gap-1.5">
              <PlanChip tier={tier} />
              {tier === 'pro' && trial.active && (
                <span className="text-[11px] font-medium text-soon">
                  Trial · {trial.daysLeft}d left
                </span>
              )}
              {!signedIn && <span className="text-[11px] text-ink-3">Guest</span>}
            </span>
          </div>
        </div>

        {!signedIn && (
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="mt-3.5 flex h-[46px] w-full items-center justify-center gap-2 rounded-[13px] bg-navy text-body font-semibold text-white"
          >
            <LogIn size={17} strokeWidth={2} aria-hidden />
            Sign in — it&apos;s free
          </button>
        )}

        {signedIn && (
          <dl className="mt-3.5 flex rounded-[13px] bg-canvas py-2.5">
            {[
              [session.loading ? '—' : String(savedCount), 'Saved'],
              [String(categoryCount), 'Categories'],
            ].map(([v, l], i) => (
              <div key={l} className={cn('flex-1 text-center', i > 0 && 'border-l border-line')}>
                <dt className="sr-only">{l}</dt>
                <dd>
                  <span className="block text-[19px] font-bold tracking-[-0.04em]">{v}</span>
                  <span className="mt-0.5 block text-micro text-ink-3">{l}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <div className="px-5 pt-3.5">
        <Group title="Account">
          <Row
            icon={Building2}
            title="Company Profile"
            sub={companyName ?? (signedIn ? 'Not set up yet' : 'Set up to match tenders')}
            href="/profile/company"
          />
          <Row icon={SlidersHorizontal} title="Tender Preferences" sub="Categories, provinces and alerts" href="/profile/preferences" />
          <Row icon={Bookmark} title="Saved Searches" soon />
          <Row
            icon={Crown}
            title="Subscription & Pro"
            href="/pro"
            sub={
              tier === 'pro'
                ? trial.active
                  ? `Pro · trial ${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'} left`
                  : 'Pro active — manage plan'
                : tier === 'basic'
                  ? 'Upgrade for unlimited AI & matches'
                  : 'Guest — see what Pro adds'
            }
          />
        </Group>

        <Group title="Intelligence">
          <Row icon={Bell} title="Notification Settings" sub="Push, email and deadline alerts" soon />
        </Group>

        <Group title="Support">
          <Row icon={HelpCircle} title="Help Centre" soon />
          <Row icon={ShieldCheck} title="Privacy & Security" soon />
          <Row icon={Info} title="About TenderBase" right={<span className="text-caption text-ink-3">v1.4.2</span>} />
        </Group>

        {signedIn && (
          <div className="rounded-[14px] border border-line bg-white px-3.5">
            <SignOutButton />
          </div>
        )}
      </div>
    </main>
  );
}
