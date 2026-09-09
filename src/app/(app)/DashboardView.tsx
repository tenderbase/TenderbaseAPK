'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, Sparkles, Clock, ChevronRight, Inbox, User, CloudOff,
  Compass, ArrowRight, Building2, TrendingUp,
} from 'lucide-react';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatisticCard } from '@/components/ui/StatisticCard';
import { TenderCard } from '@/components/tender/TenderCard';
import { CompactTenderCard } from '@/components/tender/CompactTenderCard';
import { DataSourceNotice, LiveDataFooter } from '@/components/ui/DataSourceNotice';
import { MenuButton } from '@/components/nav/MenuButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import { MatchCard, MatchSheet } from '@/components/tender/MatchCard';
import { LockedPanel } from '@/components/tier/LockedPanel';
import { useSavedTenders, firstNameOf } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { loadProfile } from '@/lib/company';
import { fetchProfile } from '@/lib/company-remote';
import { loadPreferences } from '@/lib/preferences';
import { fetchPreferences } from '@/lib/preferences-remote';
import { calculateCompleteness } from '@/types/company';
import { tenderApi } from '@/lib/api';
import { matchReadiness, scoreTenders, type TenderMatch } from '@/lib/matches';
import { getStatus, daysUntil } from '@/lib/format';
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
  /** Real facet categories for the guest home quick chips. */
  guestCategories?: { name: string; count: number }[];
}

interface QualityInfo {
  percent: number;
  missing: string[];
}

/**
 * Home = "Today" for signed-in users (matches, brief, radar) and a
 * Discover-first landing for guests. Matches are computed in the client with
 * the transparent v0 scorer against the user's own profile + preferences —
 * every reason chip is true; when no profile/preferences exist the screen
 * says exactly that instead of inventing matches.
 */
export function DashboardView({
  latest,
  closingSoon,
  stats,
  source,
  notice,
  guestCategories = [],
}: DashboardViewProps) {
  const router = useRouter();
  const { session, saved, count: savedCount, isSaved, toggleSaved } = useSavedTenders();
  const { can } = useTier();
  const [searchQuery, setSearchQuery] = useState('');

  // Matches state (client-scored from the user's own data).
  const [matches, setMatches] = useState<TenderMatch[] | null>(null);
  const [quality, setQuality] = useState<QualityInfo | null>(null);
  const [ready, setReady] = useState<{ ready: boolean; missing: ('profile' | 'preferences')[] } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<TenderMatch | null>(null);

  const signedIn = session.signedIn;
  const errored = source === 'error';
  const firstName = session.name ? firstNameOf(session.name) : null;
  const withSaved = (t: TenderWithUserState) => ({ ...t, isSaved: isSaved(t.id) });

  // Personal matching pass: profile + prefs -> score the latest catalogue.
  useEffect(() => {
    if (!signedIn) {
      setMatches(null);
      setQuality(null);
      setReady(null);
      return;
    }
    let cancelled = false;
    async function run() {
      const [localProfile, remoteProfile, localPrefs, remotePrefs] = await Promise.all([
        loadProfile(),
        fetchProfile(),
        loadPreferences(),
        fetchPreferences(),
      ]);
      const profile = remoteProfile ?? (localProfile.legalName ? localProfile : null);
      const preferences = remotePrefs ?? localPrefs;
      const effectiveProfile = profile ?? (localProfile.legalName ? localProfile : null);
      const completeness = calculateCompleteness(effectiveProfile ?? localProfile);
      if (!cancelled) {
        setQuality({
          percent: completeness.percent,
          missing: completeness.missing.slice(0, 2).map((m) => m.label),
        });
        setReady(matchReadiness({ profile, preferences }));
      }
      try {
        // v0: score the newest catalogue page (up to the API's max limit).
        const page = await tenderApi.list({ sort: 'newest', limit: 100 });
        if (cancelled) return;
        const ranked = scoreTenders(page.results, { profile, preferences }, { limit: 10, minScore: 15 });
        setMatches(ranked);
      } catch {
        if (!cancelled) setMatches([]);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const handleSearchSubmit = (q: string) => {
    const trimmed = q.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  };

  // Saved tenders closing within 7 days — the personal deadline radar.
  const savedClosingSoon = saved
    .map((r) => r.tender)
    .filter((t) => ['urgent', 'closing_soon'].includes(getStatus(t)))
    .sort((a, b) => daysUntil(a.closingDate) - daysUntil(b.closingDate))
    .slice(0, 4);

  const showReasonsLocked = !can('matches-reasons');

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
                {signedIn ? 'Your tender opportunities' : 'TenderBase'}
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
              href={signedIn ? '/profile' : '/login'}
              aria-label={signedIn ? 'Your profile' : 'Sign in'}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-navy text-body font-semibold text-white"
            >
              {signedIn ? (session.initials ?? 'U') : <User size={19} strokeWidth={2} aria-hidden />}
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
        ) : !signedIn ? (
          <GuestHome
            stats={stats}
            latest={latest}
            closingSoon={closingSoon}
            source={source}
            guestCategories={guestCategories}
            withSaved={withSaved}
            onToggleSave={(t) => toggleSaved(t)}
          />
        ) : (
          <>
            {/* Morning brief — every number real */}
            <Link
              href="/briefing"
              className="flex items-center gap-2.5 rounded-[12px] border border-line bg-canvas px-3 py-2.5"
            >
              <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px] bg-white text-navy shadow-card-sm">
                <Sparkles size={16} strokeWidth={2.1} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-meta font-semibold text-navy">Your weekly briefing</span>
                <span className="mt-px block truncate text-[11.5px] text-ink-2">
                  {stats.open.toLocaleString('en-ZA')} open · {stats.closing} closing this week ·{' '}
                  {savedCount} saved{matches ? ` · ${matches.length} matching now` : ''}
                </span>
              </span>
              <ChevronRight size={16} strokeWidth={2.3} className="text-navy" aria-hidden />
            </Link>

            {/* Match-quality strip until the profile is complete */}
            {quality && quality.percent < 100 && (
              <Link
                href="/profile/company"
                className="mt-2.5 flex items-center gap-2.5 rounded-[12px] border border-blue-line bg-blue-soft px-3 py-2.5"
              >
                <Building2 size={16} strokeWidth={2} className="shrink-0 text-blue" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-navy">
                    Sharpen your matches — profile {quality.percent}% complete
                  </span>
                  <span className="mt-px block truncate text-[11.5px] text-blue">
                    {quality.missing.length > 0
                      ? `Add ${quality.missing.join(' and ').toLowerCase()} to score higher`
                      : 'More detail means better matches'}
                  </span>
                </span>
                <ChevronRight size={15} strokeWidth={2.2} className="shrink-0 text-blue" aria-hidden />
              </Link>
            )}

            <SectionHeader title="Today's Matches" className="mt-5" />

            {matches === null ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-line bg-white p-3.5">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-14 w-14 rounded-full" />
                      <div className="flex-1 space-y-2 pt-1">
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-3.5 w-1/3" />
                        <Skeleton className="h-5 w-24 rounded-md" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !ready?.ready ? (
              <MatchesSetupCard missing={ready?.missing ?? []} />
            ) : matches.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-7 text-center">
                <div className="mb-3 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-canvas text-ink-3">
                  <Compass size={22} strokeWidth={1.7} aria-hidden />
                </div>
                <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
                  Nothing matched the latest tenders
                </h3>
                <p className="mt-1.5 max-w-[270px] text-meta text-ink-2">
                  New tenders are published daily. Widen your preferences and this list updates automatically.
                </p>
                <Link
                  href="/profile/preferences"
                  className="mt-4 inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-navy px-4 text-[14px] font-semibold text-white"
                >
                  Edit preferences
                  <ArrowRight size={15} strokeWidth={2.2} aria-hidden />
                </Link>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {matches.slice(0, can('matches-full') ? 6 : 3).map((m) => (
                    <MatchCard key={m.tender.id} match={m} onOpen={setSelectedMatch} />
                  ))}
                </div>

                {!can('matches-full') && matches.length > 3 && (
                  <>
                    <p className="mb-2 mt-4 text-center text-caption text-ink-3">
                      Basic shows your top 3 daily
                    </p>
                    <LockedPanel
                      feature="matches-full"
                      label={`See all ${matches.length} matches`}
                      reason="Full ranked matches with reasons are part of Pro."
                    >
                      <div className="space-y-2.5">
                        {matches.slice(3, 6).map((m) => (
                          <MatchCard key={m.tender.id} match={m} onOpen={setSelectedMatch} />
                        ))}
                      </div>
                    </LockedPanel>
                  </>
                )}

                {showReasonsLocked && (
                  <p className="mt-2 text-center text-caption text-ink-3">
                    Tap any match to see why it fits you — reason chips unlock with Pro.
                  </p>
                )}
              </>
            )}

            {/* Saved closing soon — the personal radar */}
            {savedClosingSoon.length > 0 && (
              <>
                <div className="mt-5">
                  <SectionHeader title="Your saved · closing soon" action="Saved" onAction={() => router.push('/saved')} />
                </div>
                <div className="space-y-2.5">
                  {savedClosingSoon.map((t) => (
                    <CompactTenderCard key={t.id} tender={t} />
                  ))}
                </div>
              </>
            )}

            {/* The catalogue keeps working for signed-in users too */}
            {closingSoon.length > 0 && (
              <>
                <div className="mt-5">
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

            <div className="mt-5">
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

            <LiveDataFooter source={source} total={stats.open} />
          </>
        )}
      </div>

      <MatchSheet match={selectedMatch} onClose={() => setSelectedMatch(null)} />
    </main>
  );
}

/** Honest pre-matches card: what to add before scoring means anything. */
function MatchesSetupCard({ missing }: { missing: ('profile' | 'preferences')[] }) {
  const router = useRouter();
  const needProfile = missing.includes('profile');
  const needPrefs = missing.includes('preferences');
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-7 text-center">
      <div className="mb-3 flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-blue-soft text-navy">
        <TrendingUp size={22} strokeWidth={1.8} aria-hidden />
      </div>
      <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
        Matches start with your business
      </h3>
      <p className="mt-1.5 max-w-[270px] text-meta text-ink-2">
        {needProfile && needPrefs
          ? 'Add your company profile and tender preferences and TenderBase will rank every new tender for you.'
          : needProfile
            ? 'Add your company profile (province, location, name) so tenders can be matched to you.'
            : 'Choose the categories and provinces you work in and matches will start appearing.'}
      </p>
      <div className="mt-4 flex gap-2.5">
        {needProfile && (
          <Link
            href="/profile/company"
            className="inline-flex h-11 items-center justify-center rounded-md bg-navy px-4 text-[14px] font-semibold text-white"
          >
            Set up company profile
          </Link>
        )}
        {needPrefs && (
          <button
            type="button"
            onClick={() => router.push('/profile/preferences')}
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-[14px] font-semibold text-ink"
          >
            Set preferences
          </button>
        )}
      </div>
    </div>
  );
}

/** Guest landing — Discover first, honest, no fake personalisation. */
function GuestHome({
  stats,
  latest,
  closingSoon,
  source,
  guestCategories,
  withSaved,
  onToggleSave,
}: {
  stats: { open: number; closing: number };
  latest: TenderWithUserState[];
  closingSoon: TenderWithUserState[];
  source: DataSource;
  guestCategories: { name: string; count: number }[];
  withSaved: (t: TenderWithUserState) => TenderWithUserState;
  onToggleSave: (t: TenderWithUserState) => void;
}) {
  const router = useRouter();
  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden rounded-[16px] bg-navy px-4 py-5 text-white">
        <h2 className="text-[22px] font-bold leading-[1.15] tracking-[-0.03em]">
          Find the SA tenders that fit your business
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-blue-soft/85">
          {stats.open.toLocaleString('en-ZA')} open opportunities from National Treasury eTenders — search free, no account needed.
        </p>
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => router.push('/search')}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-white text-[14px] font-bold text-navy"
          >
            Browse tenders
            <ArrowRight size={15} strokeWidth={2.3} aria-hidden />
          </button>
          <Link
            href="/login?next=/"
            className="flex h-11 flex-1 items-center justify-center rounded-md border border-white/30 text-[14px] font-semibold text-white"
          >
            Sign in free
          </Link>
        </div>
      </section>

      {/* Real catalogue pulse */}
      <div className="mt-3 flex gap-2.5">
        <StatisticCard label="Open tenders" value={stats.open} icon={Compass} tone="navy" />
        <StatisticCard label="Closing this week" value={stats.closing} icon={Clock} tone="amber" />
      </div>

      {/* Top categories from the live facets */}
      {guestCategories.length > 0 && (
        <div className="mt-4">
          <SectionHeader title="Browse by category" action="All categories" onAction={() => router.push('/search')} />
          <div className="flex flex-wrap gap-2">
            {guestCategories.map((c) => (
              <Chip
                key={c.name}
                label={c.name}
                onClick={() => router.push(`/search?category=${encodeURIComponent(c.name)}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Free-account value — honest */}
      <section className="mt-5 rounded-lg border border-blue-line bg-blue-soft px-4 py-3.5">
        <p className="text-[14px] font-semibold text-navy">Free account = your own radar</p>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-2">
          Save tenders, set categories &amp; provinces, and get matched to what fits you. Pro adds deep AI
          summaries and instant-match push when you need more.
        </p>
        <Link href="/login" className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-bold text-blue">
          Create your free account
          <ArrowRight size={14} strokeWidth={2.3} aria-hidden />
        </Link>
      </section>

      {closingSoon.length > 0 && (
        <>
          <div className="mt-5">
            <SectionHeader title="Closing soon" action="See all" onAction={() => router.push('/search?closingWithin=7d')} />
          </div>
          <div className="space-y-2.5 md:grid md:grid-cols-2 md:gap-2.5 md:space-y-0">
            {closingSoon.slice(0, 4).map((t) => (
              <CompactTenderCard key={t.id} tender={t} />
            ))}
          </div>
        </>
      )}

      <div className="mt-5">
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
            <TenderCard key={t.id} tender={withSaved(t)} onToggleSave={() => onToggleSave(t)} />
          ))}
        </div>
      )}

      <LiveDataFooter source={source} total={stats.open} />
    </>
  );
}
