'use client';
import { useRouter } from 'next/navigation';
import { Bell, BellRing, Bookmark, FileText, Sparkles, Settings } from 'lucide-react';
import { MenuButton } from '@/components/nav/MenuButton';
import { useSavedTenders } from '@/lib/saved-store';
import { cn } from '@/lib/cn';

const EXPECTED_ALERTS = [
  { icon: BellRing, tone: 'bg-soon-bg text-soon', title: 'Closing soon', body: 'Saved tenders closing in the next few days.' },
  { icon: Sparkles, tone: 'bg-blue-soft text-blue', title: 'New matches', body: 'Tenders that match your company profile and preferences.' },
  { icon: FileText, tone: 'bg-open-bg text-open', title: 'Tender updates', body: 'Addenda and document changes on tenders you have saved.' },
] as const;

/**
 * Alerts centre.
 *
 * Phase-0 honest state: the notification engine does not exist yet, so this
 * screen explains what will appear here rather than showing invented rows.
 * Nothing on this page pretends to work — the only action routes to the
 * preferences that will eventually drive these alerts.
 */
export default function AlertsPage() {
  const router = useRouter();
  const { session } = useSavedTenders();

  return (
    <main>
      <header className="border-b border-line bg-white px-5 pb-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Alerts</h1>
          </div>
        </div>
      </header>

      <div className="px-5 pt-3.5">
        <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-8 text-center">
          <div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-canvas text-ink-3">
            <Bell size={24} strokeWidth={1.7} aria-hidden />
          </div>
          <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
            You&apos;re all caught up
          </h3>
          <p className="mt-1.5 max-w-[280px] text-meta text-ink-2">
            {session.signedIn
              ? 'When tenders match your preferences, or something you saved moves, the alert will appear here.'
              : 'Sign in for free to get alerts when tenders match your preferences — then manage them below.'}
          </p>
        </div>

        <h2 className="mb-1.5 mt-5 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
          What will appear here
        </h2>
        <ul className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
          {EXPECTED_ALERTS.map(({ icon: Icon, tone, title, body }) => (
            <li key={title} className="flex items-center gap-3 py-3">
              <span className={cn('flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px]', tone)}>
                <Icon size={17} strokeWidth={2} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold tracking-[-0.015em] text-ink">{title}</span>
                <span className="mt-px block text-[12.5px] leading-[18px] text-ink-2">{body}</span>
              </span>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => router.push('/profile/preferences')}
          className="mt-4 flex h-[46px] w-full items-center justify-center gap-2 rounded-[13px] border border-line bg-white text-body font-semibold text-navy"
        >
          <Settings size={18} strokeWidth={2} aria-hidden />
          Manage alert preferences
        </button>

        {!session.signedIn && (
          <button
            type="button"
            onClick={() => router.push('/login?next=/alerts')}
            className="mt-2 flex h-[46px] w-full items-center justify-center gap-2 rounded-[13px] bg-navy text-body font-semibold text-white"
          >
            <Bookmark size={18} strokeWidth={2} aria-hidden />
            Sign in to receive alerts
          </button>
        )}
      </div>
    </main>
  );
}
