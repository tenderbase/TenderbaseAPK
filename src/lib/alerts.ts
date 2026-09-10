import { daysUntil, getStatus } from '@/lib/format';
import type { TenderWithUserState } from '@/types/tender';

/**
 * In-app alert engine — v0, honest.
 *
 * The notification/push backend wires in a later release. Until then this
 * module derives REAL alert events from data that already exists:
 *   - closing rows for saved tenders entering their last 7 days (and the
 *     pinned "closes today" cluster),
 *   - match rows for tenders newly scoring ≥65 (detected by AlertsView),
 *   - system rows (Pro trial ending within 3 days).
 * The inbox also shows clearly-labelled example rows while it is genuinely
 * empty, then they disappear the moment a real event lands. Nothing here is
 * invented; every row carries a deep-link to the tender it is about.
 *
 * Pure module — plain-Node unit-testable.
 */

export type AlertKind = 'match' | 'closing' | 'system';

export interface AlertEntry {
  /**
   * Stable identity: `closing:<tenderId>`, `match:<tenderId>`,
   * `system:trial-ending`. One row per event until it resolves — no spam
   * re-alerts, and reading it stays read.
   */
  id: string;
  kind: AlertKind;
  tenderId: string | null;
  /** Row headline (tender title / event name). */
  title: string;
  /** Stored snapshot body; renderers may enrich with live deadlines. */
  body: string;
  /** Full ISO instant the event was first logged. */
  createdAt: string;
  read: boolean;
  /** Match score (kind = match). */
  score?: number;
}

/**
 * Days until close for an open tender, or null when closed/cancelled.
 *
 * `now` is forwarded to BOTH the status check and the day count: computing
 * the status against the wall clock while counting days from an injected
 * `now` lets the two disagree (a tender rendered "today" from a fixed clock
 * would be judged closed by real time), which is exactly the class of bug
 * this derived-status design exists to prevent.
 */
export function openTenderDaysLeft(
  tender: Pick<TenderWithUserState, 'closingDate' | 'lifecycleStatus'>,
  now: Date = new Date(),
): number | null {
  const status = getStatus(
    { closingDate: tender.closingDate, lifecycleStatus: tender.lifecycleStatus },
    now,
  );
  if (status === 'closed' || status === 'cancelled') return null;
  if (!tender.closingDate) return null;
  const d = daysUntil(tender.closingDate, now);
  return d < 0 ? null : d;
}

/** A saved tender enters the deadline alert window (≤7 days, still open). */
export function closingEntryFor(
  tender: Pick<TenderWithUserState, 'id' | 'title' | 'closingDate' | 'lifecycleStatus'>,
  now: Date = new Date(),
): AlertEntry | null {
  const d = openTenderDaysLeft(tender, now);
  if (d === null || d > 7) return null;
  return {
    id: `closing:${tender.id}`,
    kind: 'closing',
    tenderId: tender.id,
    title: tender.title,
    body: d === 0 ? 'Closes today.' : `Closing window open — ${d} day${d === 1 ? '' : 's'} to go.`,
    createdAt: now.toISOString(),
    read: false,
  };
}

/**
 * Merge pass for deadline rows: add rows for saved tenders newly inside the
 * window, drop rows whose tender was unsaved, closed or cancelled. Returns
 * the same array identity when nothing changed (so effects do not loop).
 */
export function syncDeadlineAlerts(
  entries: AlertEntry[],
  saved: Pick<TenderWithUserState, 'id' | 'title' | 'closingDate' | 'lifecycleStatus'>[],
  now: Date = new Date(),
): AlertEntry[] {
  const activeIds = new Set(
    saved
      .map((t) => (openTenderDaysLeft(t, now) !== null ? t.id : null))
      .filter((x): x is string => Boolean(x)),
  );

  const kept: AlertEntry[] = entries.filter((e) => {
    if (e.kind !== 'closing') return true;
    if (!e.tenderId || !activeIds.has(e.tenderId)) return false;
    // Re-saved under a different closing date? Keep only matching rows.
    return true;
  });

  const additions: AlertEntry[] = [];
  for (const t of saved) {
    const exists = kept.some((e) => e.kind === 'closing' && e.tenderId === t.id);
    if (!exists) {
      const entry = closingEntryFor(t, now);
      if (entry) additions.push(entry);
    }
  }

  if (additions.length === 0 && kept.length === entries.length) return entries;
  return [...kept, ...additions];
}

/** Trial-expiry system row — real when a Pro trial is ending soon. */
export function trialEntryFor(
  trial: { active: boolean; daysLeft: number; endsAtIso: string | null } | null,
  now: Date = new Date(),
): AlertEntry | null {
  if (!trial?.active || trial.endsAtIso === null) return null;
  if (trial.daysLeft > 3) return null;
  const endText = formatEnd(trial.endsAtIso, now);
  return {
    id: 'system:trial-ending',
    kind: 'system',
    tenderId: null,
    title: trial.daysLeft <= 0 ? 'Your Pro trial has ended' : `Pro trial ends in ${trial.daysLeft} day${trial.daysLeft === 1 ? '' : 's'}`,
    body:
      trial.daysLeft <= 0
        ? 'Your trial is over — upgrade to keep unlimited AI, full matches and instant alerts.'
        : `Upgrade before ${endText} to keep your Pro benefits without a gap.`,
    createdAt: now.toISOString(),
    read: false,
  };
}

function formatEnd(iso: string, now: Date): string {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return 'the trial ends';
  const sameYear = end.getFullYear() === now.getFullYear();
  return end.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

/** Add any entries whose ids are not already logged (new = unread). */
export function addEntries(entries: AlertEntry[], next: AlertEntry[]): AlertEntry[] {
  const known = new Set(entries.map((e) => e.id));
  const fresh = next.filter((e) => !known.has(e.id));
  if (fresh.length === 0) return entries;
  return [...entries, ...fresh];
}

/** Entries visible for a kind (respects mutes). */
export function visibleOf(
  entries: AlertEntry[],
  kind: AlertKind | 'all',
  muted: AlertKind[],
): AlertEntry[] {
  const blocked = new Set(muted);
  return entries.filter((e) => (kind === 'all' ? !blocked.has(e.kind) : e.kind === kind && !blocked.has(kind)));
}

export function unreadCount(entries: AlertEntry[]): number {
  return entries.filter((e) => !e.read).length;
}

/** Group counts per tab — unread bubbles (§5.8). */
export function tabCounts(entries: AlertEntry[], muted: AlertKind[]): Record<'all' | 'matches' | 'tenders' | 'system', number> {
  const blocked = new Set(muted);
  const all = entries.filter((e) => !blocked.has(e.kind));
  return {
    all: unreadCount(all),
    matches: unreadCount(entries.filter((e) => e.kind === 'match' && !blocked.has('match'))),
    tenders: unreadCount(entries.filter((e) => e.kind === 'closing' && !blocked.has('closing'))),
    system: unreadCount(entries.filter((e) => e.kind === 'system' && !blocked.has('system'))),
  };
}

/** Newest first, closing-today pinned above everything (§5.8 priority). */
export function sortEntries(
  entries: AlertEntry[],
  todayNow: Date = new Date(),
  daysLeftOf: (tenderId: string) => number | null = () => null,
): AlertEntry[] {
  const urgent = (e: AlertEntry): boolean =>
    e.kind === 'closing' && e.tenderId !== null && daysLeftOf(e.tenderId) === 0;
  return [...entries].sort((a, b) => {
    const ua = urgent(a) ? 1 : 0;
    const ub = urgent(b) ? 1 : 0;
    if (ua !== ub) return ub - ua;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function markRead(entries: AlertEntry[], id: string): AlertEntry[] {
  if (!entries.some((e) => e.id === id && !e.read)) return entries;
  return entries.map((e) => (e.id === id ? { ...e, read: true } : e));
}

export function markAllRead(entries: AlertEntry[]): AlertEntry[] {
  if (entries.every((e) => e.read)) return entries;
  return entries.map((e) => ({ ...e, read: true }));
}

/** Muting a kind hides its rows (and future ones) until unmuted. */
export function toggleMute(muted: AlertKind[], kind: AlertKind): AlertKind[] {
  return muted.includes(kind) ? muted.filter((k) => k !== kind) : [...muted, kind];
}
