'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Sparkles, Clock, Bookmark, ChevronRight, Inbox, User, CloudOff } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatisticCard } from '@/components/ui/StatisticCard';
import { TenderCard } from '@/components/tender/TenderCard';
import { CompactTenderCard } from '@/components/tender/CompactTenderCard';
import { DataSourceNotice, LiveDataFooter } from '@/components/ui/DataSourceNotice';
import { MenuButton } from '@/components/nav/MenuButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { firstNameOf, useSavedTenders } from '@/lib/saved-store';
import type { DataSource } from '@/lib/tenders';
import type { TenderWithUserState } from '@/types/tender';

function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export interface DashboardViewProps {
  latest: TenderWithUserState[];
  closingSoon: TenderWithUserState[];
  stats: { open: number; closing: number };
  source: DataSource;
  notice?: string;
}

export function DashboardView({
  latest,
  closingSoon,
  stats,
  source,
  notice,
}: DashboardViewProps) {
  const router = useRouter();
  const { session, count: savedCount, isSaved, toggleSaved } = useSavedTenders();
  const [searchQuery, setSearchQuery] = useState('');
  const withSaved = (t: TenderWithUserState) => ({ ...t, isSaved: isSaved(t.id) });
  const firstName = session.name ? firstNameOf(session.name) : null;
  const errored = source === 'error';

  const handleSearchSubmit = (q: string) => {
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  };

  return (
    <main>
      <header className="sticky top-0 z-30 border-b border-line bg-white px-5 pb-4 pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <div className="min-w-0">
              <p className="text-meta font-medium text-ink-3">
                {greeting()}
                {firstName ? `, ${firstName}` : ''}
              </p>
              <h1 className="mt-0.5 truncate text-[20px] font-bold tracking-[-0.035em]">
                Your tender opportunities
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/alerts"
              aria-label="Alerts"
              className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink"
            >
              <Bell size={21} strokeWidth={1.75} aria-hidden />
            </Link>
            <Link
              href={session.signedIn ? '/profile' : '/login'}
              aria-label={session.signedIn ? 'Your profile' : 'Sign in'}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-navy text-body font-semibold text-white"
            >
              {session.signedIn ? (session.initials ?? 'U') : <User size={19} strokeWidth={2} aria-hidden />}
            </Link>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearchSubmit(searchQuery);
          }}
          className="mt-3.5"
        >
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            onSubmit={handleSearchSubmit}
            placeholder="Search by keyword, organisation or tender number"
          />
        </form>
      </header>

      <div className="px-5 pt-4">
        <DataSourceNotice source={source} notice={notice} />

        {errored ? (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-8 text-center">
            <div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-urgent-bg text-urgent">
              <CloudOff size={24} strokeWidth={1.7} aria-hidden />
            </div>
            <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
              Tenders are unavailable right now
            </h3>
            <p className="mt-1.5 max-w-[260px] text-meta text-ink-2">{notice}</p>
            <button
              type="button"
              onClick={() => router.refresh()}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-navy px-4 text-[14px] font-semibold text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <SectionHeader title="Your opportunities" />
            <div className="flex gap-2.5">
              <StatisticCard label="Open tenders" value={stats.open} icon={Sparkles} tone="navy" />
              <StatisticCard label="Closing soon" value={stats.closing} icon={Clock} tone="amber" />
              <StatisticCard label="Saved" value={savedCount} icon={Bookmark} tone="green" />
            </div>

            <div className="mt-4">
              <SectionHeader title="Latest opportunities" action="See all" onAction={() => router.push('/search')} />
            </div>
            {latest.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No tenders available"
                description="The tender service returned no results. Try again shortly."
              />
            ) : (
              <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
                {latest.slice(0, 4).map((t) => (
                  <TenderCard key={t.id} tender={withSaved(t)} onToggleSave={() => toggleSaved(t)} />
                ))}
              </div>
            )}

            {closingSoon.length > 0 && (
              <>
                <div className="mt-4">
                  <SectionHeader
                    title="Closing soon"
                    action="See all"
                    onAction={() => router.push('/search?closingWithin=7d')}
                  />
                </div>
                <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-2.5 md:space-y-0">
                  {closingSoon.slice(0, 4).map((t) => (
                    <CompactTenderCard key={t.id} tender={t} />
                  ))}
                </div>
              </>
            )}

            <LiveDataFooter source={source} total={stats.open} />
          </>
        )}
      </div>
    </main>
  );
}
