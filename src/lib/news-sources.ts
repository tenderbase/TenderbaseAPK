import { LIMITS } from '@/types/tier';
import type { NewsRailDef, NewsRailId, NewsSourceDef } from '@/types/news';

/**
 * The curated SA source registry (blueprint §5.7: SAnews, Treasury/SARS,
 * eTenders bulletins, industry press) — narrowed to feeds that exist and
 * were reachable at capture time (2026-09-10):
 *
 *   Business       → The Citizen, business desk (national daily)
 *   Government     → SAnews.gov.za              (state news agency)
 *                    + Polity.org.za            (policy & legislation press)
 *   Construction   → Engineering News           (industry press)
 *                    + CCE Online News          (construction press)
 *   Technology     → MyBroadband                (industry press)
 *                    + TechCentral              (industry press)
 *   Finance        → Moneyweb                   (industry press)
 *   SARS & Tax     → Moonstone                  (compliance & regulation press)
 *
 * Two former sources were dropped on 2026-09-10 after production proved
 * them unreachable from the deployed host: BusinessTech (its edge answers
 * our datacenter range with HTTP 403 regardless of User-Agent) and
 * Infrastructure News (every fetch from Render times out). A
 * deterministically failing source is worse than no source: it holds every
 * read of its rail open for the full timeout budget while contributing
 * nothing, so the registry only lists feeds that serve the deployed host.
 *
 * Rail order defines entitlement: guests read the first 2 rails, Basic the
 * first 3 (LIMITS['news-basic'] = 3), Pro everything.
 */

export const NEWS_RAILS: NewsRailDef[] = [
  { id: 'Business', label: 'Business', blurb: 'SA business & industry press.' },
  { id: 'Government', label: 'Government', blurb: 'SAnews.gov.za state news agency.' },
  { id: 'Construction', label: 'Construction', blurb: 'Infrastructure & construction sector press.' },
  { id: 'Technology', label: 'Technology', blurb: 'IT & telecom industry press.' },
  { id: 'Finance', label: 'Finance', blurb: 'Markets, banking & money press.' },
  { id: 'SARS_Tax', label: 'SARS & Tax', blurb: 'Tax, compliance & financial regulation press.' },
];

export const NEWS_SOURCES: NewsSourceDef[] = [
  {
    id: 'citizenbusiness',
    name: 'The Citizen — Business',
    homepage: 'https://www.citizen.co.za/business',
    rssUrl: 'https://www.citizen.co.za/business/feed/',
    rail: 'Business',
    note: 'National daily business desk.',
  },
  {
    id: 'sanews',
    name: 'SAnews.gov.za',
    homepage: 'https://www.sanews.gov.za',
    rssUrl: 'https://www.sanews.gov.za/rss.xml',
    rail: 'Government',
    note: 'South African Government News Agency.',
  },
  {
    id: 'polity',
    name: 'Polity.org.za',
    homepage: 'https://www.polity.org.za',
    rssUrl: 'https://www.polity.org.za/page/south-african-news/feed',
    rail: 'Government',
    note: 'Policy, legislation & government affairs.',
  },
  {
    id: 'engineeringnews',
    name: 'Engineering News',
    homepage: 'https://www.engineeringnews.co.za',
    rssUrl: 'https://www.engineeringnews.co.za/page/construction/feed',
    rail: 'Construction',
    note: 'Construction & engineering sector press.',
  },
  {
    id: 'cconews',
    name: 'CCE Online News',
    homepage: 'https://cceonlinenews.com',
    rssUrl: 'https://cceonlinenews.com/feed',
    rail: 'Construction',
    note: 'Construction industry press.',
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
    id: 'techcentral',
    name: 'TechCentral',
    homepage: 'https://techcentral.co.za',
    rssUrl: 'https://techcentral.co.za/feed',
    rail: 'Technology',
    note: 'SA ICT industry press.',
  },
  {
    id: 'moneyweb',
    name: 'Moneyweb',
    homepage: 'https://www.moneyweb.co.za',
    rssUrl: 'https://www.moneyweb.co.za/feed/',
    rail: 'Finance',
    note: 'SA financial & markets news.',
  },
  {
    id: 'moonstone',
    name: 'Moonstone',
    homepage: 'https://www.moonstone.co.za',
    rssUrl: 'https://www.moonstone.co.za/feed/',
    rail: 'SARS_Tax',
    note: 'Compliance & financial-regulation press.',
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
