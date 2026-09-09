/**
 * News domain model (blueprint §5.7).
 *
 * Rails are the horizontal category rail: Business · Government · SARS &
 * Tax · Construction · Technology · Finance — plus the Pro "Custom" action
 * chip for user-added feeds. Each rail is fed by one or more curated SA
 * sources (registered in `lib/news-sources.ts`).
 */

export const NEWS_RAIL_IDS = [
  'Business',
  'Government',
  'Construction',
  'Technology',
  'Finance',
  'SARS_Tax',
] as const;
export type NewsRailId = (typeof NEWS_RAIL_IDS)[number];

export interface NewsRailDef {
  id: NewsRailId;
  /** Chip label, e.g. "Business". */
  label: string;
  blurb: string;
}

export interface NewsSourceDef {
  id: string;
  /** Display name, e.g. "SAnews.gov.za". */
  name: string;
  homepage: string;
  /** RSS/Atom URL fetched live when the deployment has network. */
  rssUrl: string;
  rail: NewsRailId;
  /** One line of provenance for the sources sheet. */
  note: string;
}

/** A single story as the app renders it (feed row, reader, bookmarks). */
export interface NewsItem {
  /**
   * `<sourceId>:<hash-of-url>` — stable across live refetches and the
   * fixtures, so bookmarks keep working when data provenance switches.
   */
  id: string;
  sourceId: string;
  title: string;
  /** Short real summary from the feed. May be '' when the feed omits it. */
  dek: string;
  /** Absolute link to the story on the publisher's site. */
  url: string;
  /** ISO instant; null when the feed does not publish one (sorted last). */
  publishedAt: string | null;
}

/** Per-source fetch status shown in the sources sheet. */
export interface NewsFeedStatus {
  sourceId: string;
  name: string;
  ok: boolean;
  /** 'live' | 'fixture' | 'error' — why the content shown came to be. */
  mode: 'live' | 'fixture' | 'error';
  itemCount: number;
}

export interface NewsRailEnvelope {
  rail: NewsRailId;
  items: NewsItem[];
  total: number;
  /** Overall provenance: live if any feed was reached live this fetch. */
  source: 'live' | 'fixture' | 'error';
  /** Honest caption when not everything is live (partial/outage/capture). */
  notice?: string;
  feeds: NewsFeedStatus[];
}
