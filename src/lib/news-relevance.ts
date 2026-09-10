import { CATEGORY_KEYWORDS } from '@/lib/matches';
import type { CompanyProfile } from '@/types/company';
import type { TenderPreferences } from '@/types/preferences';
import { CATEGORIES, type Category } from '@/types/tender';
import type { NewsItem } from '@/types/news';

/**
 * "Relevant to me" + cross-links — honest v0 relevance for news.
 *
 * Until the AI ranking engine lands (wiring phase), relevance is
 * deterministic and explainable: a story matches when its text hits the
 * reader's preference categories, provinces or company-name tokens — the
 * same transparent signals the tender scorer uses. The toggle's header line
 * ("4 of 12 stories touch Construction in KZN") is a real count from this
 * module. Pure + client-safe, unit-tested from plain Node.
 */

/** Some CATEGORY_KEYWORDS keys differ from the app taxonomy names. */
const KEY_ALIASES: Partial<Record<Category, string>> = {
  'Professional Services': 'Professional services',
  'Supply & Delivery': 'Supplies & Delivery',
  Healthcare: 'Medical',
  Transport: 'Transport & Logistics',
};

const WORDS: Record<Category, string[]> = {
  Construction: CATEGORY_KEYWORDS.Construction,
  'IT & Technology': CATEGORY_KEYWORDS['IT & Technology'],
  Security: CATEGORY_KEYWORDS.Security,
  Cleaning: CATEGORY_KEYWORDS.Cleaning,
  Transport: CATEGORY_KEYWORDS['Transport & Logistics'],
  'Professional Services': CATEGORY_KEYWORDS['Professional services'],
  'Supply & Delivery': CATEGORY_KEYWORDS['Supplies & Delivery'],
  Healthcare: CATEGORY_KEYWORDS.Medical,
  Engineering: ['engineering', 'structural', 'geotechnical', 'electrical engineer', 'mechanical engineer'],
  Consulting: ['consulting', 'consultancy', 'advisory'],
  Marketing: ['marketing', 'branding', 'advertising', 'communications campaign'],
  Agriculture: CATEGORY_KEYWORDS.Agriculture,
  Other: [],
};

const CATEGORY_ORDER: Category[] = [...CATEGORIES];

/** First app-category whose keyword stems appear in the text (or null). */
export function storyCategory(hay: string): Category | null {
  for (const cat of CATEGORY_ORDER) {
    const stems = WORDS[cat];
    if (stems.some((s) => hay.includes(s))) return cat;
  }
  return null;
}

function orgTokens(profile: Partial<CompanyProfile> | null | undefined): string[] {
  const raw = [profile?.legalName, profile?.tradingName].filter(Boolean).join(' ');
  return raw
    .toLowerCase()
    .replace(/\(pty\)\s*ltd|\(ltd\)|pty|ltd|cc|and|&|\bco\b/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

export interface RelevanceResult {
  matched: boolean;
  /** Human labels for the "why": category / province / company token. */
  reasons: string[];
  /** Tender-category hit for cross-links; null when the story is generic. */
  category: Category | null;
}

export interface RelevantNewsItem extends NewsItem {
  matched: boolean;
  matchReasons: string[];
  category: Category | null;
}

export interface MatchContextLite {
  profile?: Partial<CompanyProfile> | null;
  preferences?: Partial<TenderPreferences> | null;
}

export function relevantToProfile(
  item: Pick<NewsItem, 'title' | 'dek'>,
  ctx: MatchContextLite,
): RelevanceResult {
  const hay = `${item.title} ${item.dek}`.toLowerCase();
  const reasons: string[] = [];

  const prefsCats = ctx.preferences?.categories ?? [];
  for (const cat of prefsCats) {
    const stems = WORDS[cat as Category] ?? [];
    if (stems.some((s) => hay.includes(s))) {
      reasons.push(cat);
      break;
    }
  }

  const provinces = [
    ...(ctx.preferences?.provinces ?? []),
    ctx.profile?.province,
  ].filter((p): p is string => Boolean(p?.trim()));
  const provinceHit = provinces.find((p) => hay.includes(p.toLowerCase()));
  if (provinceHit) reasons.push(provinceHit);

  const tokens = orgTokens(ctx.profile);
  const tokenHit = tokens.find((t) => hay.includes(t));
  if (tokenHit) reasons.push(`Mentions ${tokenHit}`);

  const matched = reasons.length > 0;
  return { matched, reasons, category: storyCategory(hay) };
}

/** Rank a feed for the reader: matched first, then newest; real counts. */
export function rankNewsFeed(
  items: NewsItem[],
  ctx: MatchContextLite,
): { items: RelevantNewsItem[]; matchedTotal: number; total: number } {
  const enriched: RelevantNewsItem[] = items.map((it) => {
    const r = relevantToProfile(it, ctx);
    return { ...it, matched: r.matched, matchReasons: r.reasons, category: r.category };
  });
  enriched.sort((a, b) => {
    if (a.matched !== b.matched) return a.matched ? -1 : 1;
    if (a.publishedAt === b.publishedAt) return 0;
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return a.publishedAt < b.publishedAt ? 1 : -1;
  });
  return { items: enriched, matchedTotal: enriched.filter((i) => i.matched).length, total: enriched.length };
}

/**
 * Cross-link picker: which verbatim facet category should a story's
 * "N open tenders" card deep-link to? Uses the live facet counts grouped by
 * app taxonomy: count = group total, link = the group's busiest verbatim
 * name (that is what `/search?category=` filters on).
 */
export interface FacetEntry {
  name: string;
  count: number;
  group: string;
}

export function pickCrossLink(
  category: Category,
  facets: FacetEntry[],
): { count: number; linkName: string } | null {
  if (category === 'Other') return null;
  const inGroup = facets.filter((f) => f.group === category);
  if (inGroup.length === 0) return null;
  const total = inGroup.reduce((s, f) => s + f.count, 0);
  if (total <= 0) return null;
  const busiest = [...inGroup].sort((a, b) => b.count - a.count)[0];
  return { count: total, linkName: busiest.name };
}
