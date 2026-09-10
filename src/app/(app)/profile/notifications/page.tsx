'use client';

import Link from 'next/link';
import {
  Bell, BellRing, Bookmark, Crown, FileText, Mail, Newspaper,
  ShieldCheck, Smartphone, Sparkles, Timer,
} from 'lucide-react';
import { MenuButton } from '@/components/nav/MenuButton';
import { ToggleRow } from '@/components/ui/Toggle';
import { useAlerts } from '@/lib/alerts-store';
import { useTier } from '@/lib/tier-store';
import { cn } from '@/lib/cn';
import type { AlertKind } from '@/lib/alerts';

/**
 * Notification settings. In-app notifications are persisted to the account
 * and delivered in real time through Supabase Realtime. Push/email remain
 * opt-in delivery channels and only activate when their provider credentials
 * are configured on the notification worker.
 */
export default function NotificationsPage() {
  const alerts = useAlerts();
  const { can } = useTier();
  const pro = can('push-full');

  const inAppKinds: { kind: AlertKind; icon: typeof Sparkles; title: string; sub: string }[] = [
    { kind: 'match', icon: Sparkles, title: 'New matches', sub: 'When a tender scores 65%+ for your business for the first time.' },
    { kind: 'closing', icon: BellRing, title: 'Deadline alerts', sub: 'Saved tenders entering their final 7 days — and their closing day.' },
    { kind: 'system', icon: ShieldCheck, title: 'System notices', sub: 'Account and service events.' },
  ];

  const futureEvents = [
    { icon: Sparkles, title: 'New tender matches profile', now: 'In-app · instant', later: pro ? 'Push · Pro instant' : 'Push · Pro' },
    { icon: BellRing, title: 'Saved tender closing ≤ 7/3/1 day', now: 'In-app · instant', later: 'Push · Basic and up' },
    { icon: FileText, title: 'Addendum / document update', now: 'In-app · ready', later: 'Push · Pro' },
    { icon: Newspaper, title: 'Daily News Brief', now: '—', later: 'Push & email · Pro' },
    { icon: Mail, title: 'Weekly digest', now: '—', later: 'Email · Basic' },
  ] as const;

  return (
    <main>
      <header className="border-b border-line bg-white px-5 pb-3 pt-1.5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Notifications</h1>
          </div>
        </div>
        <div className="flex items-start gap-2.5 rounded-[12px] border border-line bg-canvas px-3.5 py-3">
          <Bell size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
          <p className="text-[12.5px] leading-[18px] text-ink-2">
            In-app notifications are live, persistent, and synced in real time. Push and email are
            the next delivery channels and will only activate when configured safely.
          </p>
        </div>
      </header>

      <div className="px-5 pt-4">
        <section>
          <h2 className="mb-2 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
            In-app alerts
          </h2>
          <ul className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
            {inAppKinds.map((k) => {
              const Icon = k.icon;
              const on = !alerts.muted.includes(k.kind);
              return (
                <li key={k.kind} className="py-1">
                  <ToggleRow
                    icon={Icon}
                    label={k.title}
                    description={k.sub}
                    checked={on}
                    onChange={(v) => (v ? alerts.unmute(k.kind) : alerts.mute(k.kind))}
                  />
                </li>
              );
            })}
          </ul>
          <p className="mt-1.5 px-1 text-[11px] leading-[15px] text-ink-3">
            Toggles apply instantly to the Alerts tab and its badge, sync to your account, and now
            survive sign-in on another device.
          </p>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
            Push &amp; email
          </h2>

          <div className="rounded-[14px] border border-line bg-white px-4 py-3.5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-soft text-blue">
                <Smartphone size={17} strokeWidth={1.9} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-ink">Push notifications</p>
                <p className="mt-1 text-[12.5px] leading-[18px] text-ink-2">
                  {pro
                    ? 'Instant push for new matches and every deadline, at the time of day you choose.'
                    : 'Closing-day pushes for your saved tenders on Basic; instant match pushes with Pro.'}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-md border border-line bg-canvas px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.05em] text-ink-3">
                  <Timer size={11} strokeWidth={2.2} aria-hidden />
                  Provider configuration required
                </span>
              </div>
            </div>

            <div className="mt-3 rounded-[12px] bg-canvas px-3.5 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">
                Permission copy
              </p>
              <p className="mt-1.5 text-[13.5px] leading-[19px] text-ink">
                &ldquo;Get instant push when a tender matches your business, or a saved deadline
                nears.&rdquo;
              </p>
              <p className="mt-1.5 text-[11.5px] leading-[16px] text-ink-3">
                The permission prompt will be shown once, after the value is clear. Declining will
                not trigger repeated prompts.
              </p>
            </div>
          </div>

          <p className="mt-3 px-0.5 text-[12px] text-ink-2">
            Delivery matrix:
          </p>
          <ul className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
            {futureEvents.map((e) => {
              const Icon = e.icon;
              return (
                <li key={e.title} className="flex items-center gap-3 py-3">
                  <span className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[9px] bg-canvas text-ink-2">
                    <Icon size={15} strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] font-medium leading-[18px] text-ink">{e.title}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5">
                      <ChipTone className="bg-open-bg text-open">In-app {e.now === '—' ? 'later' : 'now'}</ChipTone>
                      <ChipTone className={e.later.startsWith('Push') ? 'bg-ai-bg text-ai' : 'bg-soon-bg text-soon'}>
                        {e.later}
                      </ChipTone>
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          {!pro && (
            <Link
              href="/pro"
              className="mt-4 flex items-center justify-center gap-2 rounded-[13px] border border-pro-line bg-pro-soft py-3 text-[14px] font-semibold text-[#7a610f]"
            >
              <Crown size={16} strokeWidth={2.2} aria-hidden />
              Pro: instant-match push + quiet hours
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}

function ChipTone({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-[5px] px-1.5 py-0.5 text-[10px] font-bold', className)}>
      {children}
    </span>
  );
}
