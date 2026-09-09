import type { CompanyProfile } from '@/types/company';
import type { TenderPreferences } from '@/types/preferences';
import type { TenderWithUserState } from '@/types/tender';

/**
 * v0 match engine — deterministic, transparent, honest.
 *
 * Scores tenders against the company profile + tender preferences using only
 * explainable signals (category keywords, province, locality). Every reason
 * chip it produces is TRUE by construction — no black box. When the real AI
 * matching engine lands (wiring phase W3/W4) it replaces the internals of
 * this module; the UI, the ScoreRing and the reason chips stay.
 *
 * Pure module: no 'server-only', no React — unit-testable from plain Node.
 */

export interface MatchReason {
  /** Short human label, e.g. "Construction" or "KwaZulu-Natal". */
  label: string;
  kind: 'category' | 'province' | 'locality';
}

export interface TenderMatch {
  tender: TenderWithUserState;
  score: number;
  reasons: MatchReason[];
}

export interface MatchContext {
  profile?: Partial<CompanyProfile> | null;
  preferences?: Partial<TenderPreferences> | null;
}

/** Coarse preference categories -> keyword stems seen in tender text. */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Construction: ['construction', 'build', 'civil', 'infrastructure', 'roads', 'housing', 'rehabilitation', 'maintenance of'],
  'IT & Technology': ['computer', 'software', 'ict', 'information technology', 'telecom', 'network', 'cyber', 'it equipment'],
  'Professional services': ['consult', 'audit', 'legal services', 'architect', 'professional services', 'design services', 'engineering services'],
  'Security': ['security', 'guarding', 'surveillance'],
  'Cleaning': ['cleaning', 'hygiene', 'janitorial'],
  'Supplies & Delivery': ['supply and delivery', 'supplies', 'delivery of', 'furniture', 'equipment', 'stationery'],
  'Medical': ['medical', 'pharmaceutical', 'health', 'ppe'],
  'Transport & Logistics': ['transport', 'logistics', 'vehicle', 'fleet', 'courier'],
  'Agriculture': ['agricultur', 'farming', 'livestock', 'crops'],
  'Education': ['education', 'school', 'training', 'textbook', 'learning'],
};

/** Weights (sum ≈ 100 before clamping; no single axis dominates). */
const W_CATEGORY = 45;
const W_PROVINCE = 30;
const W_LOCALITY = 15;
const W_ORG_TOKEN = 10;

/** A few tokens from the business name, to catch "same issuer family" hits. */
function orgTokens(profile: Partial<CompanyProfile> | null | undefined): string[] {
  const raw = [profile?.legalName, profile?.tradingName].filter(Boolean).join(' ');
  return raw
    .toLowerCase()
    .replace(/\(pty\)\s*ltd|\(ltd\)|pty|ltd|cc|and|&|\bco\b/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

/** Profile province may be written as a full province name. */
function provinceMatch(profileProvince: string | null | undefined, tenderProvince: string | null | undefined): boolean {
  if (!profileProvince || !tenderProvince) return false;
  return profileProvince.trim().toLowerCase() === tenderProvince.trim().toLowerCase();
}

export function scoreTender(
  tender: TenderWithUserState,
  ctx: MatchContext,
): { score: number; reasons: MatchReason[] } {
  const { profile, preferences } = ctx;
  const reasons: MatchReason[] = [];
  let score = 0;

  const hay = [tender.title, tender.description, tender.categoryRaw, tender.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // 1) Category group (preferences) — the strongest signal.
  const prefsCats = preferences?.categories ?? [];
  for (const cat of prefsCats) {
    const stems = CATEGORY_KEYWORDS[cat] ?? [];
    if (stems.some((s) => hay.includes(s))) {
      score += W_CATEGORY;
      reasons.push({ label: cat, kind: 'category' });
      break;
    }
  }

  // 2) Province (preferences, else profile province).
  const wanted = preferences?.provinces ?? [];
  const wantedHit = wanted.includes(tender.province ?? '');
  const profileHit = provinceMatch(profile?.province, tender.province);
  if (wantedHit || profileHit) {
    score += W_PROVINCE;
    reasons.push({ label: tender.province ?? '', kind: 'province' });
  }

  // 3) Locality — the tender is in the same city/town as the business.
  if (
    profile?.city &&
    tender.location?.toLowerCase().includes(profile.city.trim().toLowerCase())
  ) {
    score += W_LOCALITY;
    reasons.push({ label: `Local: ${profile.city}`, kind: 'locality' });
  }

  // 4) Organisation token overlap (profile name vs tender org/description).
  const tokens = orgTokens(profile);
  if (tokens.length > 0) {
    const orgHay = `${tender.organisation ?? ''} ${tender.description ?? ''}`.toLowerCase();
    const hit = tokens.find((t) => orgHay.includes(t));
    if (hit) {
      score += W_ORG_TOKEN;
      reasons.push({ label: `Matches: ${hit}`, kind: 'category' });
    }
  }

  // No reason at all = no match. A card must never show a number with nothing
  // behind it.
  if (reasons.length === 0) return { score: 0, reasons: [] };

  // Cap at 97 — 100 is reserved for the future AI engine's "certain" tier.
  return { score: Math.min(97, score), reasons };
}

/** Rank tenders best-first; drops tenders with no explainable reason. */
export function scoreTenders(
  tenders: TenderWithUserState[],
  ctx: MatchContext,
  { limit = 10, minScore = 15 }: { limit?: number; minScore?: number } = {},
): TenderMatch[] {
  const scored: TenderMatch[] = [];
  for (const tender of tenders) {
    const { score, reasons } = scoreTender(tender, ctx);
    if (score >= minScore && reasons.length > 0) {
      scored.push({ tender, score, reasons });
    }
  }
  scored.sort((a, b) => b.score - a.score || (a.tender.closingDate < b.tender.closingDate ? -1 : 1));
  return scored.slice(0, limit);
}

/**
 * What the user still needs before matches can be meaningful. Used by the
 * honest empty state ("add your company profile to see matches").
 */
export function matchReadiness(ctx: MatchContext): {
  ready: boolean;
  missing: ('profile' | 'preferences')[];
} {
  const missing: ('profile' | 'preferences')[] = [];
  const hasProfileCity = Boolean(ctx.profile?.city?.trim());
  const hasProfileProvince = Boolean(ctx.profile?.province?.trim());
  if (!hasProfileCity && !hasProfileProvince && !ctx.profile?.legalName?.trim()) {
    missing.push('profile');
  }
  const prefs = ctx.preferences;
  const hasPrefs = Boolean(prefs?.categories?.length || prefs?.provinces?.length);
  if (!hasPrefs) missing.push('preferences');
  return { ready: missing.length === 0, missing };
}
