import type { CompanyProfile } from '@/types/company';
import type { TenderPreferences } from '@/types/preferences';
import type { TenderWithUserState } from '@/types/tender';
import type { FitAnalysis, FitSignal } from '@/types/analyst';
import { scoreTender } from '@/lib/matches';

/**
 * Premium opportunity scoring facade.
 *
 * The existing deterministic matcher remains the source of truth for the
 * signals we can currently verify. This layer adds explicit confidence,
 * deadline/document context and a stable contract for the future document/AI
 * analyst. It deliberately does not invent CIDB, B-BBEE or monetary matches
 * when the tender has not published those facts.
 */

const ENGINE_VERSION = 'opportunity-v1';

export interface OpportunityContext {
  profile?: Partial<CompanyProfile> | null;
  preferences?: Partial<TenderPreferences> | null;
  now?: Date;
}

function daysToClose(closingDate: string | null | undefined, now: Date): number | null {
  if (!closingDate) return null;
  const t = new Date(closingDate).getTime();
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - now.getTime()) / 86_400_000);
}

function signal(
  kind: FitSignal['kind'],
  label: string,
  detail: string,
  impact: FitSignal['impact'],
  points?: number,
): FitSignal {
  return { kind, label, detail, impact, ...(points === undefined ? {} : { points }) };
}

/**
 * Produces a richer, explainable fit object without pretending document-level
 * requirements are known. Score remains anchored to the existing matcher.
 */
export function analyseOpportunity(
  tender: TenderWithUserState,
  context: OpportunityContext = {},
): FitAnalysis {
  const now = context.now ?? new Date();
  const base = scoreTender(tender, context);
  const positives: FitSignal[] = [];
  const concerns: FitSignal[] = [];
  const missingProfileData: string[] = [];

  for (const reason of base.reasons) {
    if (reason.kind === 'category') {
      positives.push(signal('category', reason.label, 'Matches a business category or relevant tender wording.', 'positive'));
    } else if (reason.kind === 'province') {
      positives.push(signal('province', reason.label, 'Matches your preferred or company province.', 'positive'));
    } else if (reason.kind === 'locality') {
      positives.push(signal('locality', reason.label, 'Tender locality overlaps your company location.', 'positive'));
    }
  }

  const days = daysToClose(tender.closingDate, now);
  if (days !== null) {
    if (days < 0) {
      concerns.push(signal('deadline', 'Tender closed', 'The published closing date has passed.', 'negative'));
    } else if (days <= 3) {
      concerns.push(signal('deadline', 'Closing very soon', `Only ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'}`} remain.`, 'negative'));
    } else if (days <= 7) {
      concerns.push(signal('deadline', 'Closing within 7 days', `${days} days remain to prepare the submission.`, 'neutral'));
    }
  } else {
    concerns.push(signal('deadline', 'Deadline not verified', 'A valid closing date is not available in the tender record.', 'negative'));
  }

  if (tender.documents.length > 0) {
    positives.push(signal('documents', `${tender.documents.length} document${tender.documents.length === 1 ? '' : 's'} available`, 'A tender pack is available for deeper review.', 'positive'));
  } else {
    concerns.push(signal('documents', 'No tender documents attached', 'Document-level requirements cannot be verified yet.', 'negative'));
  }

  if (!context.profile?.province?.trim()) missingProfileData.push('Company province');
  if (!context.profile?.city?.trim()) missingProfileData.push('Company city');
  if (!context.profile?.cidbGrading?.trim()) missingProfileData.push('CIDB grading');
  if (context.profile?.bbbeeLevel == null) missingProfileData.push('B-BBEE level');

  const confidence =
    base.score >= 80 && tender.documents.length > 0 ? 'high' :
    base.score >= 45 ? 'medium' :
    'low';

  return {
    score: base.score,
    confidence,
    positives,
    concerns,
    missingProfileData,
    calculatedAt: now.toISOString(),
    engineVersion: ENGINE_VERSION,
  };
}

export function rankOpportunities(
  tenders: TenderWithUserState[],
  context: OpportunityContext = {},
  options: { limit?: number; minimumScore?: number } = {},
) {
  const limit = options.limit ?? 20;
  const minimumScore = options.minimumScore ?? 15;

  return tenders
    .map((tender) => ({ tender, fit: analyseOpportunity(tender, context) }))
    .filter(({ fit }) => fit.score >= minimumScore)
    .sort((a, b) => b.fit.score - a.fit.score || a.tender.closingDate.localeCompare(b.tender.closingDate))
    .slice(0, limit);
}
