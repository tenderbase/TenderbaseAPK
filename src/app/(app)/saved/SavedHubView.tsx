'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bookmark, BookmarkPlus, Building2, ChevronRight, Crown, FileText, LogIn,
  PlayCircle, Search, Trash2,
} from 'lucide-react';
import { TenderCard } from '@/components/tender/TenderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Meter } from '@/components/ui/Meter';
import { Skeleton } from '@/components/ui/Skeleton';
import { getStatus, daysUntil, formatFileSize } from '@/lib/format';
import { useSavedTenders } from '@/lib/saved-store';
import { useSavedSearches } from '@/lib/saved-searches-store';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { tenderApi } from '@/lib/api';
import { summarize, searchUrlFor, toListParams, type SavedSearchDef } from '@/lib/saved-searches';
import { docsOfSaved, orgsOfSaved, type SavedDocEntry, type SavedOrganisation, SAVED_HUB_TABS, type SavedHubTab } from '@/lib/saved-hub';
import { cn } from '@/lib/cn';
import { MenuButton } from '@/components/nav/MenuButton';

/**
 * Saved hub (blueprint §5.6): Tenders · Searches · Documents · Organisations,
 * each with real counts from real data. Tenders and saved searches sync to
 * the account (`saved_tenders`, `saved_searches`); Documents and
 * Organisations are derived live from your saved tenders. Nothing here is
 * invented.
 */
export function SavedHubView({ initialTab }: { initialTab: SavedHubTab }) {
  const router = useRouter();
  const [tab, setTab] = useState<SavedHubTab>(initialTab);
  const { session, saved } = useSavedTenders();
  const searches = useSavedSearches();

  const setTabSafe = (t: SavedHubTab) => {
    setTab(t);
    router.replace(`/saved?tab=${t}`, { scroll: false });
  };

  if (session.loading) {
    return <Shell tab={tab} onTab={setTabSafe} counts={{ tenders: 0, searches: 0, documents: 0, organisations: 0 }}><div className="px-5 pt-3.5" /></Shell>;
  }

  if (!session.signedIn) {
    return (
      <Shell tab={tab} onTab={setTabSafe} counts={{ tenders: 0, searches: 0, documents: 0, organisations: 0 }}>
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
      </Shell>
    );
  }

  const docs = docsOfSaved(saved);
  const orgs = orgsOfSaved(saved);
  const counts: Record<SavedHubTab, number> = {
    tenders: saved.length,
    searches: searches.count,
    documents: docs.length,
    organisations: orgs.length,
  };

  return (
    <Shell tab={tab} onTab={setTabSafe} counts={counts}>
      {tab === 'tenders' && <TendersPanel saved={saved} />}
      {tab === 'searches' && <SearchesPanel />}
      {tab === 'documents' && <DocumentsPanel docs={docs} hasTenders={saved.length > 0} />}
      {tab === 'organisations' && <OrganisationsPanel orgs={orgs} hasTenders={saved.length > 0} />}
    </Shell>
  );
}

/* ---------------- shell with hub tabs ---------------- */

function Shell({
  tab,
  onTab,
  counts,
  children,
}: {
  tab: SavedHubTab;
  onTab: (t: SavedHubTab) => void;
  counts: Record<SavedHubTab, number>;
  children: React.ReactNode;
}) {
  const labels: { id: SavedHubTab; label: string }[] = [
    { id: 'tenders', label: 'Tenders' },
    { id: 'searches', label: 'Searches' },
    { id: 'documents', label: 'Documents' },
    { id: 'organisations', label: 'Organisations' },
  ];
  return (
    <main className="pb-24">
      <header className="border-b border-line bg-white px-5 pb-3 pt-2">
        <div>
          <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Saved</h1>
          </div>
          <p className="mt-1 text-meta text-ink-2">Your tenders, searches and issuers — one place.</p>
        </div>
        <div role="tablist" aria-label="Saved hub" className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
          {labels.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => onTab(t.id)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors',
                  active ? 'border-navy bg-navy font-semibold text-white' : 'border-line bg-white font-medium text-ink-2',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'rounded-lg px-1.5 text-[11px] font-bold tabular-nums',
                    active ? 'bg-white/20 text-white' : 'bg-canvas text-ink-3',
                  )}
                >
                  {counts[t.id]}
                </span>
              </button>
            );
          })}
        </div>
      </header>
      <div className="px-5 pt-3.5">{children}</div>
    </main>
  );
}

/* ---------------- Tenders ---------------- */

const TENDER_TABS = ['All', 'Closing Soon', 'Recently Saved'] as const;
type TenderTab = (typeof TENDER_TABS)[number];

function TendersPanel({ saved }: { saved: ReturnType<typeof useSavedTenders>['saved'] }) {
  const router = useRouter();
  const [tab, setTab] = useState<TenderTab>('All');
  const { tier, isPro } = useTier();
  const { openUpgrade } = useUpgrade();
  const { toggleSaved } = useSavedTenders();
  const savedCap = tier === 'free' ? 0 : 50;

  const visible = saved
    .filter((t) => (tab === 'Closing Soon' ? ['urgent', 'closing_soon'].includes(getStatus(t.tender)) : true))
    .sort((a, b) =>
      tab === 'Recently Saved'
        ? +new Date(b.savedAt) - +new Date(a.savedAt)
        : daysUntil(a.tender.closingDate) - daysUntil(b.tender.closingDate),
    );

  return (
    <>
      {!isPro && saved.length > 0 && (
        <div className="mb-4 rounded-[14px] border border-line bg-white p-3.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold text-ink">
              {saved.length >= savedCap ? 'Saved-tender limit reached' : 'Saved tenders'}
            </p>
            <button
              type="button"
              onClick={() => openUpgrade('saved', { why: 'Pro saved tenders are unlimited — keep every opportunity in one place.' })}
              className="flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-[#7a610f]"
            >
              <Crown size={13} strokeWidth={2.2} aria-hidden />
              Go Pro
            </button>
          </div>
          <Meter used={saved.length} max={savedCap} label={`${saved.length} of ${savedCap} on Basic`} className="mt-2" />
        </div>
      )}

      <div role="tablist" aria-label="Saved tender views" className="mb-3.5 flex gap-1 rounded-[11px] bg-canvas p-1">
        {TENDER_TABS.map((t) => (
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
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title={saved.length === 0 ? 'No saved tenders yet' : `Nothing ${tab.toLowerCase()}`}
          description={saved.length === 0 ? "Tap the bookmark on any tender and it'll appear here, ready for your deadline reminders." : 'Try another view, or save more tenders from search.'}
          actionLabel="Explore tenders"
          onAction={() => router.push('/search')}
        />
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-3 md:space-y-0">
          {visible.map(({ tender }) => (
            <TenderCard key={tender.id} tender={tender} onToggleSave={() => toggleSaved(tender)} showTenderNumber={false} />
          ))}
        </div>
      )}
    </>
  );
}

/* ---------------- Searches ---------------- */

function SearchesPanel() {
  const router = useRouter();
  const searches = useSavedSearches();
  const { isPro, limit } = useTier();
  const cap = limit('saved-searches') ?? 3;

  if (searches.count === 0) {
    return (
      <>
        <EmptyState
          icon={Search}
          title="No saved searches yet"
          description="Run a search in Discover — keyword, category, province, open-only — then save it here to re-run in one tap."
          actionLabel="Search tenders"
          onAction={() => router.push('/search')}
        />
        <p className="mt-3 text-center text-caption leading-[17px] text-ink-3">
          Saved searches sync to your account — save on one device, run them on any.
        </p>
      </>
    );
  }

  return (
    <>
      {!isPro && (
        <div className="mb-3.5 rounded-[12px] border border-line bg-white px-3.5 py-2.5">
          <Meter used={searches.count} max={cap} label={`${searches.count} of ${cap} searches on Basic`} />
        </div>
      )}
      <ul className="space-y-3">
        {searches.list.map((s) => (
          <SavedSearchCard key={s.id} search={s} />
        ))}
      </ul>
      <p className="mt-3 text-center text-caption leading-[17px] text-ink-3">
        Synced to your account. Notify-on-new-results is still on the roadmap.
      </p>
    </>
  );
}

function SavedSearchCard({ search }: { search: SavedSearchDef }) {
  const router = useRouter();
  const { remove } = useSavedSearches();
  const [count, setCount] = useState<number | null>(null);
  const chips = summarize(search.params);

  useEffect(() => {
    let cancelled = false;
    setCount(null);
    void tenderApi
      .list(toListParams(search.params))
      .then((p) => {
        if (!cancelled) setCount(p.total);
      })
      .catch(() => {
        if (!cancelled) setCount(-1);
      });
    return () => {
      cancelled = true;
    };
  }, [search.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <li className="rounded-[14px] border border-line bg-white px-3.5 py-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-blue-soft text-navy">
          <Search size={16} strokeWidth={2} aria-hidden />
        </span>
        <Link href={searchUrlFor(search.params)} className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.015em] text-ink">{search.name}</span>
          <span className="mt-1 flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={`${c.kind}:${c.label}`} className="inline-flex h-[20px] max-w-full items-center truncate rounded-[6px] bg-canvas px-1.5 text-[11px] font-medium text-ink-2">
                {c.label}
              </span>
            ))}
          </span>
          <span className="mt-1.5 block text-caption text-ink-3">
            {count === null ? (
              <span className="inline-flex items-center gap-1.5">
                <Skeleton className="h-3 w-14" />
                counting…
              </span>
            ) : count < 0 ? (
              'Count unavailable right now'
            ) : (
              <>
                <span className="font-semibold text-ink">{count.toLocaleString('en-ZA')}</span> open {count === 1 ? 'tender' : 'tenders'} right now
              </>
            )}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => remove(search.id)}
          aria-label={`Delete saved search ${search.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-ink-3 hover:bg-urgent-bg hover:text-urgent"
        >
          <Trash2 size={15} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div className="mt-2.5 flex gap-2 border-t border-line pt-2.5">
        <Link
          href={searchUrlFor(search.params)}
          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-navy text-[13px] font-semibold text-white"
        >
          <PlayCircle size={15} strokeWidth={2} aria-hidden />
          Run now
        </Link>
      </div>
    </li>
  );
}

/* ---------------- Documents ---------------- */

function DocumentsPanel({ docs, hasTenders }: { docs: SavedDocEntry[]; hasTenders: boolean }) {
  const router = useRouter();
  if (docs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No documents yet"
        description={hasTenders ? 'Your saved tenders have not published documents yet — papers land here the moment they do.' : 'Save a tender with a bid pack and its documents will collect here, ready to open.'}
        actionLabel="Explore tenders"
        onAction={() => router.push('/search')}
      />
    );
  }
  // Group by tender, newest-saved first (input order is newest first).
  const groups: { tenderTitle: string; tenderId: string; docs: SavedDocEntry[] }[] = [];
  for (const d of docs) {
    const g = groups.find((x) => x.tenderId === d.tenderId);
    if (g) g.docs.push(d);
    else groups.push({ tenderTitle: d.tenderTitle, tenderId: d.tenderId, docs: [d] });
  }
  return (
    <ul className="space-y-3">
      {groups.map((g) => (
        <li key={g.tenderId} className="rounded-[14px] border border-line bg-white px-3.5 py-3">
          <button
            type="button"
            onClick={() => router.push(`/tenders/${g.tenderId}`)}
            className="flex w-full items-center justify-between gap-2 text-left"
          >
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{g.tenderTitle}</span>
            <ChevronRight size={15} strokeWidth={2.1} className="shrink-0 text-ink-3" aria-hidden />
          </button>
          <ul className="mt-2 space-y-1.5">
            {g.docs.map((d) => (
              <li key={d.doc.id}>
                <a
                  href={d.doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-[10px] bg-canvas px-2.5 py-2"
                >
                  <FileText size={15} strokeWidth={1.9} className="shrink-0 text-navy" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{d.doc.name}</span>
                  <span className="shrink-0 text-[11px] text-ink-3">
                    {d.doc.fileType}
                    {d.doc.sizeBytes ? ` · ${formatFileSize(d.doc.sizeBytes)}` : ''}
                    {d.doc.isAddendum ? ' · Addendum' : ''}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Organisations ---------------- */

function OrganisationsPanel({ orgs, hasTenders }: { orgs: SavedOrganisation[]; hasTenders: boolean }) {
  const router = useRouter();
  if (orgs.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No issuers yet"
        description={hasTenders ? 'The organisations behind your saved tenders will appear here.' : 'Save tenders and the organisations issuing them collect here.'}
        actionLabel="Explore tenders"
        onAction={() => router.push('/search')}
      />
    );
  }
  return (
    <ul className="space-y-2.5">
      {orgs.map((o) => (
        <li key={o.name}>
          <button
            type="button"
            onClick={() => router.push(`/search?q=${encodeURIComponent(o.name)}`)}
            className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3 text-left"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-navy">
              <Building2 size={16} strokeWidth={1.9} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-semibold tracking-[-0.015em] text-ink">{o.name}</span>
              <span className="mt-px block text-caption text-ink-3">
                {o.savedCount} saved {o.savedCount === 1 ? 'tender' : 'tenders'}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-blue">
              <BookmarkPlus size={14} strokeWidth={2} aria-hidden />
              Find more
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
