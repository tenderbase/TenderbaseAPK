'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Sparkles, Clock, Bookmark, ChevronRight, Inbox } from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatisticCard } from '@/components/ui/StatisticCard';
import { TenderCard } from '@/components/tender/TenderCard';
import { CompactTenderCard } from '@/components/tender/CompactTenderCard';
import { DataSourceNotice, LiveDataFooter } from '@/components/ui/DataSourceNotice';
import { MenuButton } from '@/components/nav/MenuButton';
import { EmptyState } from '@/components/ui/EmptyState';
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
  stats: { newThisWeek: number; closingSoon: number; saved: number };
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
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const toggleSave = (id: string) => setSaved((p) => ({ ...p, [id]: !p[id] }));
  const withSaved = (t: TenderWithUserState) => ({ ...t, isSaved: saved[t.id] ?? t.isSaved });

  return (
    <main>
      <header className="border-b border-line bg-white px-5 pb-4 pt-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <div className="min-w-0">
              <p className="text-meta font-medium text-ink-3">{greeting()}, Sipho</p>
              <h1 className="mt-0.5 truncate text-[20px] font-bold tracking-[-0.035em]">
                Your tender opportunities
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href="/alerts"
              aria-label="Alerts, 3 unread"
              className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink"
            >
              <Bell size={21} strokeWidth={1.75} aria-hidden />
              <span className="absolute right-2 top-[7px] h-2 w-2 rounded-full border-[1.6px] border-white bg-urgent" />
            </Link>
            <Link
              href="/profile"
              aria-label="Your profile"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-navy text-body font-semibold text-white"
            >
              SM
            </Link>
          </div>
        </div>

        <div className="mt-3.5">
          <SearchBar readOnly placeholder="Search tenders..." onFocus={() => router.push('/search')} />
        </div>
      </header>

      <div className="px-5 pt-4">
        <DataSourceNotice source={source} notice={notice} />

        <SectionHeader title="Your opportunities" />
        <div className="flex gap-2.5">
          <StatisticCard label="Open tenders" value={stats.newThisWeek} icon={Sparkles} tone="navy" />
          <StatisticCard label="Closing soon" value={stats.closingSoon} icon={Clock} tone="amber" />
          <StatisticCard label="Saved" value={stats.saved} icon={Bookmark} tone="green" />
        </div>

        <Link
          href="/briefing"
          className="mt-3 flex items-center gap-2.5 rounded-[12px] bg-canvas px-3 py-2.5 border border-line"
        >
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-white text-navy border border-line">
            <Sparkles size={16} strokeWidth={2.1} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-meta font-semibold text-navy">Your weekly briefing is ready</span>
            <span className="mt-px block text-[11.5px] text-ink-2">
              {stats.newThisWeek.toLocaleString('en-ZA')} open · {stats.closingSoon} closing this week
            </span>
          </span>
          <ChevronRight size={16} strokeWidth={2.3} className="text-navy" aria-hidden />
        </Link>

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
              <TenderCard key={t.id} tender={withSaved(t)} onToggleSave={toggleSave} />
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

        <LiveDataFooter source={source} total={stats.newThisWeek} />
      </div>
    </main>
  );
}
