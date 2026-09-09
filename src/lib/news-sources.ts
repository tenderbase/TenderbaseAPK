import { LIMITS } from '@/types/tier';
import type { NewsRailDef, NewsRailId, NewsSourceDef } from '@/types/news';

/**
 * The curated SA source registry (blueprint §5.7: SAnews, Treasury/SARS,
 * eTenders bulletins, industry press) — narrowed to feeds that exist and
 * were reachable at capture time (2026-09-09):
 *
 *   Government     → SAnews.gov.za            (state news agency)
 *   Business       → BusinessTech             (industry press)
 *   Construction   → Infrastructure News      (industry press)
 *   Technology     → MyBroadband              (industry press)
 *   Finance        → Moneyweb                 (industry press)
 *
 * Rail order defines entitlement: guests read the first 2 rails, Basic the
 * first 3 (LIMITS['news-basic'] = 3), Pro everything. SARS & Tax has no
 * stable RSS at capture time; its rail renders an honest "no feed connected"
 * state and Pro users can wire one with a custom feed.
 */

export const NEWS_RAILS: NewsRailDef[] = [
  { id: 'Business', label: 'Business', blurb: 'SA business & industry press.' },
  { id: 'Government', label: 'Government', blurb: 'SAnews.gov.za state news agency.' },
  { id: 'Construction', label: 'Construction', blurb: 'Infrastructure & construction sector press.' },
  { id: 'Technology', label: 'Technology', blurb: 'IT & telecom industry press.' },
  { id: 'Finance', label: 'Finance', blurb: 'Markets, banking & money press.' },
  { id: 'SARS_Tax', label: 'SARS & Tax', blurb: 'Tax authority releases — no stable feed yet.' },
];

export const NEWS_SOURCES: NewsSourceDef[] = [
  {
    id: 'sanews',
    name: 'SAnews.gov.za',
    homepage: 'https://www.sanews.gov.za',
    rssUrl: 'https://www.sanews.gov.za/rss.xml',
    rail: 'Government',
    note: 'South African Government News Agency.',
  },
  {
    id: 'businesstech',
    name: 'BusinessTech',
    homepage: 'https://businesstech.co.za',
    rssUrl: 'https://businesstech.co.za/news/feed/',
    rail: 'Business',
    note: 'SA business & technology news.',
  },
  {
    id: 'infrastructurenews',
    name: 'Infrastructure News',
    homepage: 'https://www.infrastructurenews.co.za',
    rssUrl: 'https://www.infrastructurenews.co.za/feed/',
    rail: 'Construction',
    note: 'Construction & service-delivery news.',
  },
  {
    id: 'mybroadband',
    name: 'MyBroadband',
    homepage: 'https://mybroadband.co.za',
    rssUrl: 'https://mybroadband.co.za/news/feed',
    rail: 'Technology',
    note: 'SA IT & tech news.',
  },
  {
    id: 'moneyweb',
    name: 'Moneyweb',
    homepage: 'https://www.moneyweb.co.za',
    rssUrl: 'https://www.moneyweb.co.za/feed/',
    rail: 'Finance',
    note: 'SA financial & markets news.',
  },
];

export function railDef(id: NewsRailId): NewsRailDef {
  return NEWS_RAILS.find((r) => r.id === id) ?? NEWS_RAILS[0];
}

export function railSources(id: NewsRailId): NewsSourceDef[] {
  return NEWS_SOURCES.filter((s) => s.rail === id);
}

export function sourceDef(id: string): NewsSourceDef | null {
  return NEWS_SOURCES.find((s) => s.id === id) ?? null;
}

/**
 * Rails a guest (no account) can read — Business + Government (§5.7 "Guests:
 * Business + Government top 20"). Rail order up to the `news-basic` limit is
 * the free allowance; Basic extends it by one more rail.
 */
export const GUEST_RAIL_COUNT = 2;

export function railIndex(id: NewsRailId): number {
  return NEWS_RAILS.findIndex((r) => r.id === id);
}

/**
 * Rails a tier can open — single source of truth is the entitlement model:
 * the `news-basic` limit (2 guests, 3 Basic) then `news-all` (Pro = all).
 */
export function canReadRailCount(tier: 'free' | 'basic' | 'pro'): number {
  if (tier === 'pro') return NEWS_RAILS.length;
  return LIMITS[tier]['news-basic'] ?? GUEST_RAIL_COUNT;
}
