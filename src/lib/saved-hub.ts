import type { SavedRow } from '@/lib/saved-remote';
import type { TenderDocument } from '@/types/tender';

/**
 * Saved-hub helpers — real aggregations over the saved-tender store for the
 * hub's Documents and Organisations tabs. Pure, plain-Node testable.
 */

export interface SavedDocEntry {
  doc: TenderDocument;
  tenderId: string;
  tenderTitle: string;
}

/** Every document attached to saved tenders, in one flat list. */
export function docsOfSaved(saved: SavedRow[]): SavedDocEntry[] {
  const out: SavedDocEntry[] = [];
  for (const row of saved) {
    for (const doc of row.tender.documents ?? []) {
      out.push({ doc, tenderId: row.tender.id, tenderTitle: row.tender.title });
    }
  }
  return out;
}

export interface SavedOrganisation {
  name: string;
  savedCount: number;
  /** Most recent saved tender id from this issuer (for the link target). */
  tenderId: string;
}

/** Distinct issuers among saved tenders, with real saved counts. */
export function orgsOfSaved(saved: SavedRow[]): SavedOrganisation[] {
  const map = new Map<string, SavedOrganisation>();
  for (const row of saved) {
    const name = row.tender.organisation?.trim();
    if (!name) continue;
    const found = map.get(name);
    if (found) {
      found.savedCount += 1;
    } else {
      map.set(name, { name, savedCount: 1, tenderId: row.tender.id });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------- hub tabs (pure, so the server page can validate ?tab=) ----------

export const SAVED_HUB_TABS = ['tenders', 'searches', 'documents', 'organisations'] as const;
export type SavedHubTab = (typeof SAVED_HUB_TABS)[number];

export function isSavedHubTab(value: string | undefined): value is SavedHubTab {
  return !!value && (SAVED_HUB_TABS as readonly string[]).includes(value);
}
