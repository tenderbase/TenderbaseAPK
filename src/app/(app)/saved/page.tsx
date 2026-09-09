'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, LogIn } from 'lucide-react';
import { TenderCard } from '@/components/tender/TenderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { getStatus, daysUntil } from '@/lib/format';
import { useSavedTenders } from '@/lib/saved-store';
import { cn } from '@/lib/cn';
import { MenuButton } from '@/components/nav/MenuButton';

const TABS = ['All', 'Closing Soon', 'Recently Saved'] as const;
type Tab = (typeof TABS)[number];

/**
 * Saved tenders.
 *
 * Real data only: rows come from the shared saved store (Supabase
 * `saved_tenders` when signed in). Guests get an honest sign-in prompt — the
 * old synthetic list is gone, so nobody sees tenders they never saved.
 */
export default function SavedPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('All');
  const { session, saved, toggleSaved } = useSavedTenders();

  // Session still resolving: render the shell only, so guests don't see a
  // flash of "no saved tenders" before the honest sign-in prompt.
  if (session.loading) {
    return (
      <main>
        <Header tab={tab} setTab={setTab} savedCount={0} />
        <div className="px-5 pt-3.5" />
      </main>
    );
  }

  if (!session.signedIn) {
    return (
      <main>
        <Header tab={tab} setTab={setTab} savedCount={0} />
        <div className="px-5 pt-3.5">
          <EmptyState
            icon={LogIn}
            title="Sign in to save tenders"
            description="Saving is free — your saved list follows you across devices and reminds you before deadlines."
            actionLabel="Sign in"
            onAction={() => router.push('/login?next=/saved')}
          />
          <p className="mt-3 text-center text-caption text-ink-3">
            Browsing stays free either way — you can explore the full catalogue without an account.
          </p>
        </div>
      </main>
    );
  }

  const visible = saved
    .filter((t) => (tab === 'Closing Soon' ? ['urgent', 'closing_soon'].includes(getStatus(t.tender)) : true))
    .sort((a, b) =>
      tab === 'Recently Saved'
        ? +new Date(b.savedAt) - +new Date(a.savedAt)
        : daysUntil(a.tender.closingDate) - daysUntil(b.tender.closingDate),
    );

  return (
    <main>
      <Header tab={tab} setTab={setTab} savedCount={saved.length} />
      <div className="px-5 pt-3.5">
        {visible.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={saved.length === 0 ? 'No saved tenders yet' : `Nothing ${tab.toLowerCase()}`}
            description={
              saved.length === 0
                ? "Tap the bookmark on any tender and it'll appear here, ready for your deadline reminders."
                : 'Try another tab, or save more tenders from search.'
            }
            actionLabel="Explore Tenders"
            onAction={() => router.push('/search')}
          />
        ) : (
          <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
            {visible.map(({ tender }) => (
              <TenderCard
                key={tender.id}
                tender={{ ...tender, isSaved: true }}
                onToggleSave={() => toggleSaved(tender)}
                showTenderNumber={false}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function Header({
  tab,
  setTab,
  savedCount,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  savedCount: number;
}) {
  return (
    <header className="border-b border-line bg-white px-5 pb-3.5 pt-2">
      <div>
        <div className="flex items-center gap-2.5">
          <MenuButton className="md:hidden" />
          <h1 className="text-h2">Saved Tenders</h1>
        </div>
        <p className="mt-1 text-meta text-ink-2">
          Keep track of opportunities you&apos;re interested in.
        </p>
      </div>

      <div role="tablist" aria-label="Saved tender tabs" className="mt-3.5 flex gap-1 rounded-[11px] bg-canvas p-1">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] text-[13.5px] transition-colors',
              tab === t ? 'bg-white font-semibold text-navy shadow-card-sm' : 'font-medium text-ink-2',
            )}
          >
            {t}
            {t === 'All' && (
              <span className="rounded-lg bg-blue-soft px-1.5 text-micro text-blue">{savedCount}</span>
            )}
          </button>
        ))}
      </div>
    </header>
  );
}
