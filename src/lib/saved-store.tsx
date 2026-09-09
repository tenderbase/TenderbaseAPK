'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase-config';
import {
  deleteSavedTender,
  fetchSavedRows,
  persistSavedTender,
  type SavedRow,
} from '@/lib/saved-remote';
import type { TenderWithUserState } from '@/types/tender';

/**
 * One source of truth for "is this tender saved" and the signed-in identity,
 * shared by every screen in the authenticated shell.
 *
 * Behaviour contract (honesty rules):
 *  - Guests see nothing pre-filled; tapping save sends them to /login with a
 *    `next` back to where they were. A bookmark that silently forgets on the
 *    next screen is a lie — better to ask for an account.
 *  - Signed-in users get optimistic local updates + Postgres persistence
 *    (RLS-protected `saved_tenders`). Remote failures are logged; the UI state
 *    still reflects the intent so a transient network blip never eats a tap.
 *  - With Supabase unconfigured, the app is a guest experience end to end.
 */

export interface SessionIdentity {
  signedIn: boolean;
  loading: boolean;
  name: string | null;
  email: string | null;
  initials: string | null;
}

interface SavedContextValue {
  session: SessionIdentity;
  /** Rows newest-first. */
  saved: SavedRow[];
  count: number;
  isSaved: (tenderId: string) => boolean;
  /** Save/unsave. Guests are routed to sign-in instead of faking success. */
  toggleSaved: (tender: TenderWithUserState) => void;
}

const SavedContext = createContext<SavedContextValue | null>(null);

function initialsFor(name: string | null | undefined, email: string | null | undefined): string | null {
  const from = name?.trim();
  if (from) {
    return from
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }
  const at = email?.trim();
  if (at) return at[0]?.toUpperCase() ?? null;
  return null;
}

export function SavedProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] = useState<SessionIdentity>({
    signedIn: false,
    loading: true,
    name: null,
    email: null,
    initials: null,
  });
  const [saved, setSaved] = useState<SavedRow[]>([]);

  // Resolve the session once per mount.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured) {
        if (!cancelled) setSession({ signedIn: false, loading: false, name: null, email: null, initials: null });
        return;
      }
      try {
        const { data } = await createClient().auth.getUser();
        if (cancelled) return;
        const user = data.user;
        if (!user) {
          setSession({ signedIn: false, loading: false, name: null, email: null, initials: null });
          return;
        }
        const meta = user.user_metadata ?? {};
        const name = (meta.full_name as string) ?? (meta.name as string) ?? null;
        const email = user.email ?? null;
        setSession({
          signedIn: true,
          loading: false,
          name,
          email,
          initials: initialsFor(name, email),
        });
        setSaved(await fetchSavedRows());
      } catch {
        if (!cancelled) {
          setSession({ signedIn: false, loading: false, name: null, email: null, initials: null });
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSaved = useCallback(
    (tender: TenderWithUserState) => {
      // Guests: route to sign-in with a way back. No silent fake success.
      if (!session.signedIn) {
        const here =
          typeof window !== 'undefined'
            ? window.location.pathname + window.location.search
            : pathname;
        const next = here && here !== '/login' ? `?next=${encodeURIComponent(here)}` : '';
        router.push(`/login${next}`);
        return;
      }

      const isOn = saved.some((r) => r.tenderId === tender.id);
      setSaved((prev) =>
        isOn ? prev.filter((r) => r.tenderId !== tender.id) : [{ tenderId: tender.id, savedAt: new Date().toISOString(), tender }, ...prev],
      );
      if (isOn) {
        void deleteSavedTender(tender.id);
      } else {
        void persistSavedTender(tender);
      }
    },
    [session.signedIn, saved, pathname, router],
  );

  const value = useMemo<SavedContextValue>(
    () => ({
      session,
      saved,
      count: saved.length,
      isSaved: (tenderId: string) => saved.some((r) => r.tenderId === tenderId),
      toggleSaved,
    }),
    [session, saved, toggleSaved],
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSavedTenders(): SavedContextValue {
  const ctx = useContext(SavedContext);
  if (!ctx) {
    throw new Error('useSavedTenders must be used inside <SavedProvider>');
  }
  return ctx;
}

/** First-name-only greeting name ("Thabo" from "Thabo Nkosi"). */
export function firstNameOf(name: string | null): string | null {
  return name?.split(/\s+/)[0] || null;
}
