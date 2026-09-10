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
import { useMatchContext } from '@/lib/use-match-context';
import { reconcileSettings } from '@/lib/sync-core';
import { fetchMutedAlertKinds, persistMutedAlertKinds } from '@/lib/alert-settings-remote';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  persistNotifications,
} from '@/lib/notifications-remote';
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
  unread: number;
  markReadById: (id: string) => void;
  markAllReadNow: () => void;
  log: (entries: AlertEntry[]) => void;
  mute: (kind: AlertKind) => void;
  unmute: (kind: AlertKind) => void;
}

const AlertsContext = createContext<AlertsContextValue | null>(null);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { session, saved } = useSavedTenders();
  const { tier, trial } = useTier();
  const signedIn = session.signedIn && !session.loading;

  const [entries, setEntries] = useState<AlertEntry[]>(() => load<AlertEntry[]>(STORE_KEY, []));
  const [muted, setMuted] = useState<AlertKind[]>(() => load<AlertKind[]>(MUTE_KEY, []));
  const hydrated = useRef(false);
  const remoteHydrated = useRef(false);
  const mutedSynced = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    save(STORE_KEY, entries);
  }, [entries]);
  useEffect(() => {
    save(MUTE_KEY, muted);
  }, [muted]);

  // Hydrate the inbox from Postgres on sign-in. Local entries are retained
  // because deadline/match detection can happen before the first network read.
  useEffect(() => {
    if (!signedIn || !isSupabaseConfigured || remoteHydrated.current) return;
    let cancelled = false;
    void fetchNotifications().then((remote) => {
      if (cancelled || !remote) return;
      setEntries((prev) => {
        const merged = addEntries(remote, prev);
        return merged.length === prev.length ? prev : merged;
      });
      remoteHydrated.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) remoteHydrated.current = false;
  }, [signedIn]);

  // Mute-list sync.
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
      if (unresolved) return;
      if (push) {
        const ok = await persistMutedAlertKinds(adopt ?? []);
        if (cancelled || !ok) return;
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
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !mutedSynced.current || !isSupabaseConfigured) return;
    void persistMutedAlertKinds(muted);
  }, [muted, signedIn]);

  // Re-derive real deadline/system rows from live saved data.
  useEffect(() => {
    const now = new Date();
    let next = syncDeadlineAlerts(entries, saved.map((r) => r.tender), now);
    const system = trialEntryFor(tier === 'pro' ? trial : null, now);
    if (system && !next.some((e) => e.id === system.id)) {
      next = addEntries(next, [system]);
    }
    if (next !== entries) {
      setEntries(next);
      if (signedIn && isSupabaseConfigured) {
        const additions = next.filter((e) => !entries.some((old) => old.id === e.id));
        if (additions.length > 0) void persistNotifications(additions);
      }
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved, tier, trial.active, trial.daysLeft, session.signedIn]);

  const markReadById = useCallback((id: string) => {
    setEntries((prev) => markRead(prev, id));
    if (signedIn && isSupabaseConfigured) void markNotificationRead(id);
  }, [signedIn]);

  const markAllReadNow = useCallback(() => {
    setEntries((prev) => markAllRead(prev));
    if (signedIn && isSupabaseConfigured) void markAllNotificationsRead();
  }, [signedIn]);

  const log = useCallback((fresh: AlertEntry[]) => {
    if (fresh.length === 0) return;
    setEntries((prev) => addEntries(prev, fresh));
    if (signedIn && isSupabaseConfigured) void persistNotifications(fresh);
  }, [signedIn]);

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
