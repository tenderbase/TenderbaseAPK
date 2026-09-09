'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell, BellOff, BellRing, Bookmark, ChevronRight, Crown,
  Newspaper, Settings, ShieldCheck, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { MenuButton } from '@/components/nav/MenuButton';
import { useSavedTenders } from '@/lib/saved-store';
import { useAlerts } from '@/lib/alerts-store';
import { useTier } from '@/lib/tier-store';
import { useMatchContext } from '@/lib/use-match-context';
import { tenderApi } from '@/lib/api';
import { scoreTenders } from '@/lib/matches';
import { formatRelative } from '@/lib/format';
import {
  sortEntries, tabCounts, type AlertEntry, type AlertKind,
} from '@/lib/alerts';
import type { TenderWithUserState } from '@/types/tender';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'matches', label: 'Matches' },
  { id: 'tenders', label: 'Tenders' },
  { id: 'news', label: 'News' },
  { id: 'system', label: 'System' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const MATCH_BASELINE_KEY = 'tb_alerts_match_baseline_v1';
const MATCH_ALERT_SCORE = 65;

/** Icon + tone per alert kind (blueprint §5.8 row taxonomy). */
const KIND_STYLE: Record<AlertKind, { icon: typeof Bell; tone: string }> = {
  match: { icon: Sparkles, tone: 'bg-ai-bg text-ai' },
  closing: { icon: BellRing, tone: 'bg-soon-bg text-soon' },
  system: { icon: ShieldCheck, tone: 'bg-canvas text-ink-2' },
};

/**
 * Alerts centre (blueprint §5.8).
 *
 * Groups: All · Matches · Tenders · News · System, each with real unread
 * bubbles. Rows are REAL in-app events derived from live data: saved tenders
 * entering their last 7 days, tenders newly scoring ≥65 as matches, and the
 * Pro-trial expiry. "Closes today" pins to the top, red-tinted, and can
 * never be lost in the list. Actions are real: open a row (marks read +
 * deep-links to the tender), mark all as read, mute a whole type.
 * While the inbox is genuinely empty (first sign-in), three clearly-labelled
 * example rows explain what will arrive — they vanish the moment a real
 * event lands. No invented rows, ever.
 */
export default function AlertsPage() {
  const router = useRouter();
  const { session, saved } = useSavedTenders();
  const alerts = useAlerts();
  const { trial } = useTier();
  const [tab, setTab] = useState<TabId>('all');
  const [examplesDismissed, setExamplesDismissed] = useState(false);

  const signedIn = session.signedIn;
  const today = new Date();

  // Live "days left" per saved tender — the pinned cluster reads this at
  // render time, so urgency can never go stale inside a session.
  const daysLeftOf = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const row of saved) {
      const t = row.tender;
      const status = t.lifecycleStatus?.toLowerCase();
      if (status === 'cancelled' || status === 'complete' || !t.closingDate) {
        map.set(t.id, null);
        continue;
      }
      const ms = new Date(t.closingDate).getTime() - today.getTime();
      map.set(t.id, ms < 0 ? null : Math.ceil(ms / 86_400_000));
    }
    return (id: string) => map.get(id) ?? null;
  }, [saved, today]);

  // Detect NEW high-scoring matches (≥65): first visit sets a silent
  // baseline; later visits log whatever is genuinely new since it.
  const ctx = useMatchContext(signedIn);
  const baselineLogged = useRef(false);
  useEffect(() => {
    if (!signedIn || ctx.loading) return;
    if (!ctx.profile && !ctx.preferences) return;
    let cancelled = false;
    async function detect() {
      try {
        const page = await tenderApi.list({ sort: 'newest', limit: 100 });
        if (cancelled) return;
        const ranked = scoreTenders(page.results, { profile: ctx.profile, preferences: ctx.preferences }, { limit: 8, minScore: MATCH_ALERT_SCORE });
        const current = ranked.map((m) => m.tender.id);

        let stored: { date: string; ids: string[] } | null = null;
        try {
          const raw = window.localStorage.getItem(MATCH_BASELINE_KEY);
          stored = raw ? (JSON.parse(raw) as { date: string; ids: string[] }) : null;
        } catch {
          stored = null;
        }

        const newIds = stored ? current.filter((id) => !(stored?.ids ?? []).includes(id)) : [];
        const fresh: AlertEntry[] = newIds.map((id) => {
          const m = ranked.find((r) => r.tender.id === id)!;
          return {
            id: `match:${id}`,
            kind: 'match' as const,
            tenderId: id,
            title: m.tender.title,
            body: `${m.score}% match for your business`,
            createdAt: new Date().toISOString(),
            read: false,
            score: m.score,
          };
        });
        if (fresh.length > 0) alerts.log(fresh);

        // Roll the baseline forward (same-day repeat visits stay silent).
        try {
          window.localStorage.setItem(
            MATCH_BASELINE_KEY,
            JSON.stringify({ date: today.toISOString().slice(0, 10), ids: current }),
          );
        } catch {
          /* storage unavailable */
        }
        baselineLogged.current = true;
      } catch {
        /* catalogue unreachable — match detection simply waits for next visit */
      }
    }
    void detect();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, ctx.loading, ctx.profile, ctx.preferences, today]);

  const counts = useMemo(() => tabCounts(alerts.entries, alerts.muted), [alerts.entries, alerts.muted]);

  // Rows shown for the active tab, pinned by urgency, newest first.
  const rows = useMemo(() => {
    if (tab === 'news') return [];
    const kind: AlertKind | 'all' =
      tab === 'matches' ? 'match' : tab === 'tenders' ? 'closing' : tab === 'system' ? 'system' : 'all';
    return sortEntries(
      alerts.entries.filter((e) => (kind === 'all' ? !alerts.muted.includes(e.kind) : e.kind === kind && !alerts.muted.includes(kind))),
      today,
      daysLeftOf,
    );
  }, [tab, alerts.entries, alerts.muted, today, daysLeftOf]);

  const closingToday = rows.filter((e) => e.kind === 'closing' && e.tenderId !== null && daysLeftOf(e.tenderId) === 0);
  const rest = rows.filter((e) => !closingToday.includes(e));

  const hasRealRows = alerts.entries.length > 0;
  const showExamples = signedIn && !hasRealRows && !examplesDismissed && tab === 'all';

  return (
    <main className="pb-24">
      <header className="border-b border-line bg-white px-5 pb-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MenuButton className="md:hidden" />
            <h1 className="text-h2">Alerts</h1>
          </div>
          <Link
            href="/profile/notifications"
            aria-label="Notification settings"
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink"
          >
            <Settings size={18} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>

        {/* Tab group with real unread bubbles */}
        <div role="tablist" aria-label="Alert groups" className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5">
          {TABS.map((t) => {
            const activeTab = tab === t.id;
            const bubble =
              t.id === 'all' ? counts.all : t.id === 'matches' ? counts.matches : t.id === 'tenders' ? counts.tenders : t.id === 'system' ? counts.system : 0;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab}
                onClick={() => setTab(t.id)}
                className={cn(
                  'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] transition-colors',
                  activeTab ? 'border-navy bg-navy font-semibold text-white' : 'border-line bg-white font-medium text-ink-2',
                )}
              >
                {t.label}
                {bubble > 0 && (
                  <span
                    className={cn(
                      'flex h-4 min-w-4 items-center justify-center rounded-lg px-1 text-[9.5px] font-bold',
                      activeTab ? 'bg-white text-navy' : 'bg-urgent text-white',
                    )}
                  >
                    {bubble}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-5 pt-3.5">
        {/* Channel legend — everything in this inbox is in-app today */}
        <div className="mb-3 flex items-start gap-2 rounded-[12px] bg-canvas px-3 py-2">
          <Bell size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
          <p className="flex-1 text-[11.5px] leading-[16px] text-ink-2">
            Every alert here is in-app. Push and email arrive with the notifications release —
          </p>
          <Link href="/profile/notifications" className="shrink-0 text-[11.5px] font-bold text-blue">
            manage
          </Link>
        </div>

        {/* Guests: honest sign-in gate instead of an invented inbox */}
        {!signedIn && (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-8 text-center">
            <div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-canvas text-ink-3">
              <Bell size={24} strokeWidth={1.7} aria-hidden />
            </div>
            <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
              Alerts follow your account
            </h3>
            <p className="mt-1.5 max-w-[280px] text-meta text-ink-2">
              When a saved tender approaches closing, or a new tender matches your business,
              the alert appears here — for free.
            </p>
            <button
              type="button"
              onClick={() => router.push('/login?next=/alerts')}
              className="mt-4 flex h-[46px] items-center justify-center gap-2 rounded-md bg-navy px-7 text-body font-semibold text-white"
            >
              <Bookmark size={18} strokeWidth={2} aria-hidden />
              Sign in free
            </button>
          </div>
        )}

        {signedIn && tab === 'news' && (
          <div className="flex flex-col items-center rounded-lg border border-dashed border-line bg-white px-5 py-8 text-center">
            <div className="mb-3.5 flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-canvas text-ink-3">
              <Newspaper size={24} strokeWidth={1.7} aria-hidden />
            </div>
            <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
              News alerts arrive with the news release
            </h3>
            <p className="mt-1.5 max-w-[300px] text-meta text-ink-2">
              Story digests for your sectors, and instant pushes when news touches your business.
              Until then your News feed and bookmarks are live.
            </p>
            <Link
              href="/news"
              className="mt-4 inline-flex h-[46px] items-center justify-center gap-2 rounded-md border border-line bg-white px-7 text-body font-semibold text-navy"
            >
              Open News
            </Link>
          </div>
        )}

        {/* Empty-but-signed-in: example rows, clearly labelled, disappear at first real event */}
        {showExamples && (
          <div>
            <div className="flex items-start gap-2 rounded-[12px] border border-ai-line bg-ai-bg px-3 py-2.5">
              <Sparkles size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-ai" aria-hidden />
              <p className="text-[12px] leading-[17px] text-ink-2">
                Nothing has happened yet, so here is what an alert looks like. These are examples —
                they disappear the moment a real event lands.
              </p>
            </div>

            <h2 className="mb-1.5 mt-4 px-0.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
              Examples
            </h2>
            <ul className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
              {[
                { kind: 'match' as const, title: 'New match: supply of laptops for a national dept', meta: '87% match · just now' },
                { kind: 'closing' as const, title: 'Saved tender closes in 3 days', meta: 'RFQ-8821 · Durban' },
                { kind: 'system' as const, title: 'Your Pro trial ends soon', meta: 'Upgrade to keep unlimited AI' },
              ].map((ex) => (
                <li key={ex.title} className="flex items-center gap-3 py-3 opacity-80">
                  <ExampleIcon kind={ex.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium leading-[19px] tracking-[-0.015em] text-ink">
                      {ex.title}
                    </span>
                    <span className="mt-px block text-caption text-ink-3">{ex.meta}</span>
                  </span>
                  <span className="shrink-0 rounded-[5px] bg-canvas px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] text-ink-3">
                    Example
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setExamplesDismissed(true)}
              className="mt-2.5 w-full text-center text-[12px] font-semibold text-ink-3"
            >
              Hide examples
            </button>
          </div>
        )}

        {/* Mark-all-read: only offered when real unread rows exist */}
        {signedIn && tab !== 'news' && counts[tab === 'all' ? 'all' : tab] > 0 && (
          <button
            type="button"
            onClick={alerts.markAllReadNow}
            className="mb-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-line bg-white py-2.5 text-[13px] font-semibold text-navy"
          >
            <BellRing size={15} strokeWidth={2} aria-hidden />
            Mark all as read
          </button>
        )}

        {/* Pinned urgency cluster — never lost in the list (§5.8) */}
        {closingToday.length > 0 && tab !== 'news' && (
          <section aria-label="Closing today" className="mb-4 overflow-hidden rounded-[14px] border border-urgent/30">
            <div className="flex items-center gap-1.5 bg-urgent px-3.5 py-2">
              <BellRing size={13} strokeWidth={2.2} className="text-white" aria-hidden />
              <h2 className="text-[12px] font-bold uppercase tracking-[0.06em] text-white">Closing today</h2>
            </div>
            <ul className="divide-y divide-line bg-white">
              {closingToday.map((e) => (
                <AlertRow key={e.id} entry={e} liveDaysLeft={0} />
              ))}
            </ul>
          </section>
        )}

        {/* Rows grouped by kind (All) or the tab's single kind */}
        {signedIn && tab !== 'news' && rest.length > 0 && (
          <TabBody tab={tab} rows={rest} muted={alerts.muted} onToggleMute={alerts.mute} />
        )}

        {/* Genuinely-empty signed-in state for real tabs */}
        {signedIn && tab !== 'news' && !showExamples && rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-line bg-white px-5 py-7 text-center">
            <Bell size={20} strokeWidth={1.7} className="mx-auto text-ink-3" aria-hidden />
            <p className="mx-auto mt-2 max-w-[270px] text-meta leading-[19px] text-ink-2">
              {tab === 'matches'
                ? 'When a tender scores 65%+ for your business for the first time, it will land here.'
                : tab === 'tenders'
                  ? 'Saving a tender opens its 7-day closing window — alerts start the moment it enters.'
                  : tab === 'system'
                    ? 'Trial and account notices will appear here.'
                    : 'Nothing here yet — save a tender or let a match happen and this fills up.'}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------- group bodies ---------- */

function TabBody({
  tab,
  rows,
  muted,
  onToggleMute,
}: {
  tab: TabId;
  rows: AlertEntry[];
  muted: AlertKind[];
  onToggleMute: (kind: AlertKind) => void;
}) {
  if (tab === 'matches' || tab === 'tenders' || tab === 'system') {
    return <KindSection kind={tab === 'matches' ? 'match' : tab === 'tenders' ? 'closing' : 'system'} rows={rows} muted={muted.includes(tab === 'matches' ? 'match' : tab === 'tenders' ? 'closing' : 'system')} onToggleMute={onToggleMute} />;
  }
  // All: one section per kind that actually has rows.
  const kinds: { kind: AlertKind; label: string; sub: string }[] = [
    { kind: 'match', label: 'Matches', sub: 'New tenders that fit your business' },
    { kind: 'closing', label: 'Saved tenders', sub: 'Deadlines approaching' },
    { kind: 'system', label: 'System', sub: 'Account & trial notices' },
  ];
  return (
    <>
      {kinds.map((k) => {
        const kindRows = rows.filter((r) => r.kind === k.kind);
        const isMuted = muted.includes(k.kind);
        if (kindRows.length === 0 && !isMuted) return null;
        return (
          <KindSection
            key={k.kind}
            kind={k.kind}
            label={k.label}
            rows={kindRows}
            muted={isMuted}
            onToggleMute={onToggleMute}
          />
        );
      })}
    </>
  );
}

function KindSection({
  kind,
  label,
  sub,
  rows,
  muted,
  onToggleMute,
}: {
  kind: AlertKind;
  label?: string;
  sub?: string;
  rows: AlertEntry[];
  muted: boolean;
  onToggleMute: (kind: AlertKind) => void;
}) {
  const name = label ?? (kind === 'match' ? 'Matches' : kind === 'closing' ? 'Saved tenders' : 'System');
  if (muted) {
    return (
      <div className="mb-3 flex items-center justify-between rounded-[12px] border border-line bg-white px-3.5 py-3">
        <span className="flex items-center gap-2.5 text-[13.5px] text-ink-3">
          <BellOff size={15} strokeWidth={2} aria-hidden />
          {name} muted
        </span>
        <button type="button" onClick={() => onToggleMute(kind)} className="text-[13px] font-bold text-blue">
          Unmute
        </button>
      </div>
    );
  }
  if (rows.length === 0) return null;
  return (
    <section className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between px-0.5">
        <h2 className="text-micro font-semibold uppercase tracking-[0.07em] text-ink-3">
          {name}
          {sub && <span className="ml-2 font-normal normal-case tracking-normal text-ink-3/70">{sub}</span>}
        </h2>
        <button
          type="button"
          onClick={() => onToggleMute(kind)}
          aria-label={`Mute ${name.toLowerCase()}`}
          className="text-ink-3 transition-colors hover:text-ink"
        >
          <BellOff size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <GroupedRows rows={rows} />
    </section>
  );
}

/** Two+ rows about one tender collapse into a thread card (§5.8 thread). */
function GroupedRows({ rows }: { rows: AlertEntry[] }) {
  const threads = useMemo(() => {
    const byTender = new Map<string, AlertEntry[]>();
    const singles: AlertEntry[] = [];
    for (const r of rows) {
      if (r.tenderId) {
        const arr = byTender.get(r.tenderId) ?? [];
        arr.push(r);
        byTender.set(r.tenderId, arr);
      } else {
        singles.push(r);
      }
    }
    for (const arr of byTender.values()) {
      if (arr.length === 1) {
        singles.push(arr[0]);
      }
    }
    const multi = [...byTender.entries()].filter(([, arr]) => arr.length > 1);
    return { singles, multi };
  }, [rows]);

  return (
    <div className="space-y-2.5">
      {threads.multi.map(([tenderId, arr]) => (
        <ThreadCard key={tenderId} tenderId={tenderId} entries={arr} />
      ))}
      {threads.singles.map((e) => (
        <AlertRow key={e.id} entry={e} />
      ))}
    </div>
  );
}

function ThreadCard({ tenderId, entries }: { tenderId: string; entries: AlertEntry[] }) {
  const [open, setOpen] = useState(true);
  const first = entries[0];
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3.5 py-3 text-left"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink-2">
          <BellRing size={15} strokeWidth={2} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-semibold tracking-[-0.015em] text-ink">{first.title}</span>
          <span className="mt-px block text-caption text-ink-3">
            {entries.length} alerts · thread
          </span>
        </span>
        <span className={cn('text-caption font-semibold text-blue transition-transform', open && 'rotate-90')}>
          <ChevronRight size={15} strokeWidth={2.2} aria-hidden />
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-line border-t border-line">
          {entries.map((e) => (
            <li key={e.id}>
              <AlertRow entry={e} dense />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------- row ---------- */

function AlertRow({ entry, dense = false, liveDaysLeft }: { entry: AlertEntry; dense?: boolean; liveDaysLeft?: number }) {
  const { markReadById } = useAlerts();
  const router = useRouter();
  const meta = useMemo(() => {
    if (entry.kind === 'match') return `${entry.body} · ${formatRelative(entry.createdAt)}`;
    if (entry.kind === 'closing' && liveDaysLeft !== undefined) {
      const word = liveDaysLeft === 0 ? 'Closes today' : `Closes in ${liveDaysLeft} days`;
      return `${word} · ${formatRelative(entry.createdAt)}`;
    }
    return `${entry.body} · ${formatRelative(entry.createdAt)}`;
  }, [entry, liveDaysLeft]);

  const style = KIND_STYLE[entry.kind];
  const Icon = style.icon;
  const urgent = liveDaysLeft === 0;
  const target = entry.kind === 'system' ? '/pro' : entry.tenderId ? `/tenders/${entry.tenderId}` : null;
  const isTrial = entry.kind === 'system' && entry.id === 'system:trial-ending';

  return (
    <button
      type="button"
      onClick={() => {
        if (!entry.read) markReadById(entry.id);
        if (target) router.push(target);
      }}
      className={cn(
        'flex w-full items-center gap-3 text-left',
        dense ? 'px-3.5 py-2.5' : 'px-3.5 py-3',
        urgent && 'bg-urgent-bg/60',
        isTrial && 'bg-pro-soft/60',
      )}
    >
      <span className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]', style.tone)}>
        {isTrial ? <Crown size={15} strokeWidth={2.1} className="text-[#7a610f]" aria-hidden /> : <Icon size={15} strokeWidth={2} aria-hidden />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[14px] leading-[19px] tracking-[-0.015em] text-ink', !entry.read && 'font-semibold')}>
          {entry.title}
        </span>
        <span className={cn('mt-px block text-caption text-ink-3', urgent && 'font-medium text-urgent')}>{meta}</span>
      </span>
      {!entry.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue" aria-label="Unread" />}
    </button>
  );
}

function ExampleIcon({ kind }: { kind: AlertKind }) {
  const style = KIND_STYLE[kind];
  const Icon = style.icon;
  return (
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]', style.tone)}>
      <Icon size={15} strokeWidth={2} aria-hidden />
    </span>
  );
}
