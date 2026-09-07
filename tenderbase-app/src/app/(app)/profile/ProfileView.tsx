'use client';
import Link from 'next/link';
import { SignOutButton } from '@/components/auth/SignOutButton';
import {
  Building2, SlidersHorizontal, Bookmark, Crown, Bell, Mail,
  HelpCircle, ShieldCheck, Info, LogOut, Settings, ChevronRight, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MenuButton } from '@/components/nav/MenuButton';

function Row({
  icon: Icon, title, sub, href = '#', danger, right,
}: {
  icon: LucideIcon; title: string; sub?: string; href?: string; danger?: boolean; right?: React.ReactNode;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 py-2.5">
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
      {right ?? <ChevronRight size={17} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />}
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
  return (
    <main>
      <header className="border-b border-line bg-white px-5 pb-3 pt-1.5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Profile</h1>
          </div>
          <Link href="/settings" aria-label="Settings" className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink">
            <Settings size={20} strokeWidth={1.75} aria-hidden />
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
              {identity.initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-bold tracking-[-0.03em]">{identity.name}</p>
            <p className="mt-0.5 truncate text-meta text-ink-2">{identity.email}</p>
            <span className="mt-1.5 inline-flex h-[22px] items-center rounded-md bg-blue-soft px-2 text-[11.5px] font-semibold text-blue">
              Professional Plan
            </span>
          </div>
        </div>

        <dl className="mt-3.5 flex rounded-[13px] bg-canvas py-2.5">
          {[['17', 'Saved'], ['5', 'Categories'], ['3', 'Saved searches']].map(([v, l], i) => (
            <div key={l} className={cn('flex-1 text-center', i > 0 && 'border-l border-line')}>
              <dt className="sr-only">{l}</dt>
              <dd>
                <span className="block text-[19px] font-bold tracking-[-0.04em]">{v}</span>
                <span className="mt-0.5 block text-micro text-ink-3">{l}</span>
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="px-5 pt-3.5">
        <Group title="Account">
          <Row icon={Building2} title="Company Profile" sub="Mkhize Solutions (Pty) Ltd" href="/profile/company" />
          <Row icon={SlidersHorizontal} title="Tender Preferences" sub="Categories, provinces and alerts" href="/profile/preferences" />
          <Row icon={Bookmark} title="Saved Searches" sub="3 active" />
          <Row icon={Crown} title="Subscription & Billing" sub="Professional · Renews 28 Sep" />
        </Group>

        <Group title="Intelligence">
          <Row icon={Sparkles} title="AI Features" sub="Summaries, match scores and smart search" />
          <Row icon={Bell} title="Notification Settings" sub="Push, email and deadline alerts" />
          <Row icon={Mail} title="Email Digest" sub="Daily at 07:00" />
        </Group>

        <Group title="Support">
          <Row icon={HelpCircle} title="Help Centre" />
          <Row icon={ShieldCheck} title="Privacy & Security" />
          <Row
            icon={Info}
            title="About TenderBase"
            right={<span className="text-caption text-ink-3">v1.4.2</span>}
          />
        </Group>

        <div className="rounded-[14px] border border-line bg-white px-3.5">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
