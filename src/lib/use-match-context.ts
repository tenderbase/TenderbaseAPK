'use client';

import { useEffect, useState } from 'react';
import { loadProfile } from '@/lib/company';
import { fetchProfile } from '@/lib/company-remote';
import { loadPreferences } from '@/lib/preferences';
import { fetchPreferences } from '@/lib/preferences-remote';
import type { CompanyProfile } from '@/types/company';
import type { TenderPreferences } from '@/types/preferences';

/**
 * Loads the signed-in user's profile + preferences once (local mirror merged
 * with the remote Supabase row, remote winning) — the same merge the Today
 * screen uses, shared so the tender-detail match row scores identically.
 */
export interface MatchContextState {
  loading: boolean;
  profile: Partial<CompanyProfile> | null;
  preferences: Partial<TenderPreferences> | null;
}

const EMPTY: MatchContextState = { loading: false, profile: null, preferences: null };

export function useMatchContext(active: boolean): MatchContextState {
  const [state, setState] = useState<MatchContextState>(EMPTY);

  useEffect(() => {
    if (!active) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    setState({ loading: true, profile: null, preferences: null });

    async function run() {
      const [localProfile, remoteProfile, localPrefs, remotePrefs] = await Promise.all([
        loadProfile(),
        fetchProfile(),
        loadPreferences(),
        fetchPreferences(),
      ]);
      if (cancelled) return;
      const profile = remoteProfile ?? (localProfile.legalName ? localProfile : null);
      const preferences = remotePrefs ?? localPrefs;
      setState({ loading: false, profile, preferences });
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [active]);

  return state;
}
