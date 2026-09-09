'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  addEntries,
  markAllRead,
  markRead,
  syncDeadlineAlerts,
  toggleMute,
  trialEntryFor,
  unreadCount,
  type AlertEntry,
  type AlertKind,
} from '@/lib/alerts';
import { useSavedTenders } from '@/lib/saved-store';
import { useTier } from '@/lib/tier-store';
import { reconcileSettings } from '@/lib/sync-core';
import { fetchMutedAlertKinds, persistMutedAlertKinds } from '@/lib/alert-settings-remote';
import { isSupabaseConfigured } from '@/lib/supabase-config';

const STORE_KEY = 'tb_alerts_v1';
const MUTE_KEY = 'tb_alerts_muted_v1';

function load<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — state still lives for this session */
  }
}

interface AlertsContextValue {
  entries: AlertEntry[];
  muted: AlertKind[];
  /** Real events only — the nav bubble and inbox counts come from here. */
  unread: number;
  markReadById: (id: string) => void;
  markAllReadNow: () => void;
  /** Log freshly-detected events (new matches…). New ids = unread. */
  log: (entries: AlertEntry[]) => void;
  mute: (kind: AlertKind) => void;
  unmute: (kind: AlertKind) => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

/**
 * In-app alerts store — real events only (deadline rows for saved tenders,
 * trial-expiry system row). Match rows are logged by AlertsView once it
 * detects new high scorers; nothing here invents content.
 *
 * Entries persist on this device (the inbox re-derives its deadline rows
 * from the synced saved list; event read-state stays per device). The muted
 * kinds, however, sync to `alert_settings` (migration 0005): once an
 * account row exists it wins on sign-in, a first sign-in pushes this
 * device's mutes, and every toggle writes straight through.
 */
export function AlertsProvider({ children }: { children: ReactNode }) {
  const { session, saved } = useSavedTenders();
  const { tier, trial } = useTier();
  const signedIn = session.signedIn && !session.loading;

  const [entries, setEntries] = useState<AlertEntry[]>(() => load<AlertEntry[]>(STORE_KEY, []));
  const [muted, setMuted] = useState<AlertKind[]>(() => load<AlertKind[]>(MUTE_KEY, []));
  const hydrated = useRef(false);
  const mutedSynced = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    save(STORE_KEY, entries);
  }, [entries]);
  useEffect(() => {
    save(MUTE_KEY, muted);
  }, [muted]);

  // Mute-list sync: adopt the account row once it exists; push this
  // device's list on a first sync. Undefined (fetch failed) is retried on
  // the next 'online' event rather than treated as "no row".
  useEffect(() => {
    if (!signedIn || !isSupabaseConfigured) {
      mutedSynced.current = false;
      return;
    }
    if (mutedSynced.current) return;
    let cancelled = false;
    const attempt = async () => {
      if (mutedSynced.current || cancelled) return;
      const remote = await fetchMutedAlertKinds();
      if (cancelled) return;
      const { adopt, push, unresolved } = reconcileSettings(mutedRef.current, remote);
      if (unresolved) return; // fetch failed — retry on next 'online', touch nothing
      if (push) {
        const ok = await persistMutedAlertKinds(adopt ?? []);
        if (cancelled) return;
        if (!ok) return;
      }
      mutedSynced.current = true;
      setMuted(adopt ?? []);
    };
    void attempt();
    const onOnline = () => void attempt();
    window.addEventListener('online', onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  // Toggles write through to the account once the merge has run.
  useEffect(() => {
    if (!signedIn || !mutedSynced.current || !isSupabaseConfigured) return;
    void persistMutedAlertKinds(muted);
  }, [muted, signedIn]);

  // Re-derive deadline + trial rows whenever saves, tier or the session
  // change (or once at mount). Pure merge — identity-stable when nothing
  // changed, so this effect cannot loop.
  useEffect(() => {
    const now = new Date();
    let next = syncDeadlineAlerts(entries, saved.map((r) => r.tender), now);
    const system = trialEntryFor(tier === 'pro' ? trial : null, now);
    if (system && !next.some((e) => e.id === system.id)) {
      next = addEntries(next, [system]);
    }
    if (next !== entries) setEntries(next);
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, tier, trial.active, trial.daysLeft, session.signedIn]);

  const markReadById = useCallback((id: string) => {
    setEntries((prev) => markRead(prev, id));
  }, []);

  const markAllReadNow = useCallback(() => {
    setEntries((prev) => markAllRead(prev));
  }, []);

  const log = useCallback((fresh: AlertEntry[]) => {
    if (fresh.length === 0) return;
    setEntries((prev) => addEntries(prev, fresh));
  }, []);

  const mute = useCallback((kind: AlertKind) => {
    setMuted((prev) => toggleMute(prev, kind));
  }, []);

  const unmute = useCallback((kind: AlertKind) => {
    setMuted((prev) => prev.filter((k) => k !== kind));
  }, []);

  const value = useMemo<AlertsContextValue>(
    () => ({
      entries,
      muted,
      unread: unreadCount(entries.filter((e) => !muted.includes(e.kind))),
      markReadById,
      markAllReadNow,
      log,
      mute,
      unmute,
    }),
    [entries, muted, markReadById, markAllReadNow, log, mute, unmute],
  );

  return <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>;
}

export function useAlerts(): AlertsContextValue {
  const ctx = useContext(AlertsContext);
  if (!ctx) throw new Error('useAlerts must be used inside AlertsProvider');
  return ctx;
}
