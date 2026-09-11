import type { DocumentEvidence, RequirementCategory, TenderRequirement, TenderRisk } from '@/types/analyst';

/**
 * Phase 1 document-intelligence foundation.
 *
 * This layer is deliberately deterministic: it can identify likely sections
 * and requirement candidates from extracted text without inventing facts.
 * Later AI extraction should enrich these records while preserving evidence.
 */

export type DocumentKind =
  | 'invitation'
  | 'terms'
  | 'scope_of_work'
  | 'specification'
  | 'pricing'
  | 'bbbee'
  | 'cidb'
  | 'tax'
  | 'addendum'
  | 'unknown';

export interface ExtractedDocument {
  documentId: string;
  documentName: string;
  page?: number;
  text: string;
}

export interface DocumentClassification {
  kind: DocumentKind;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
}

export interface DocumentAnalysisDraft {
  classification: DocumentClassification;
  requirements: TenderRequirement[];
  risks: TenderRisk[];
}

const rules: Array<{ kind: DocumentKind; terms: string[] }> = [
  { kind: 'addendum', terms: ['addendum', 'amendment', 'extension of closing date'] },
  { kind: 'pricing', terms: ['bill of quantities', 'boq', 'pricing schedule', 'schedule of rates', 'price schedule'] },
  { kind: 'cidb', terms: ['cidb', 'construction industry development board', 'grading designation'] },
  { kind: 'bbbee', terms: ['b-bbee', 'bbbee', 'broad-based black economic empowerment'] },
  { kind: 'tax', terms: ['sars', 'tax compliance status', 'pin', 'tax clearance'] },
  { kind: 'scope_of_work', terms: ['scope of work', 'scope of works', 'terms of reference', 'deliverables'] },
  { kind: 'specification', terms: ['technical specification', 'specifications', 'minimum specification'] },
  { kind: 'terms', terms: ['terms and conditions', 'conditions of tender', 'special conditions'] },
  { kind: 'invitation', terms: ['invitation to tender', 'invitation for bids', 'request for bids', 'bid invitation'] },
];

const requirementRules: Array<{
  category: RequirementCategory;
  label: string;
  terms: string[];
}> = [
  { category: 'cidb', label: 'CIDB requirement', terms: ['cidb grade', 'cidb grading', 'cidb designation'] },
  { category: 'bbbee', label: 'B-BBEE requirement', terms: ['b-bbee', 'bbbee level', 'bee certificate'] },
  { category: 'tax', label: 'Tax compliance requirement', terms: ['tax compliance status', 'tax clearance', 'sars pin'] },
  { category: 'briefing', label: 'Compulsory briefing or site meeting', terms: ['compulsory briefing', 'compulsory site meeting', 'site inspection is compulsory', 'briefing session is compulsory'] },
  { category: 'documentation', label: 'Mandatory supporting document', terms: ['mandatory document', 'must submit', 'required document', 'proof of'] },
  { category: 'submission', label: 'Submission requirement', terms: ['submit via', 'electronic submission', 'closing time', 'late submissions'] },
  { category: 'pricing', label: 'Pricing schedule', terms: ['bill of quantities', 'pricing schedule', 'schedule of rates', 'priced boq'] },
];

function normalized(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function classifyDocument(documentName: string, text: string): DocumentClassification {
  const haystack = normalized(`${documentName} ${text.slice(0, 20_000)}`);
  const matches = rules
    .map((rule) => ({ rule, hits: rule.terms.filter((term) => haystack.includes(term)) }))
    .filter(({ hits }) => hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length);

  if (matches.length === 0) return { kind: 'unknown', confidence: 'low', reasons: [] };

  const best = matches[0];
  return {
    kind: best.rule.kind,
    confidence: best.hits.length >= 2 ? 'high' : matches.length >= 2 ? 'medium' : 'low',
    reasons: best.hits.map((hit) => `Matched “${hit}”.`),
  };
}

function evidence(document: ExtractedDocument, snippet: string): DocumentEvidence {
  return {
    documentId: document.documentId,
    documentName: document.documentName,
    ...(document.page == null ? {} : { page: document.page }),
    text: snippet.slice(0, 500),
  };
}

function snippetAround(text: string, term: string): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(term.toLowerCase());
  if (index < 0) return term;
  const start = Math.max(0, index - 180);
  const end = Math.min(text.length, index + term.length + 320);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

/**
 * Extracts conservative requirement candidates. Every result is needs_review
 * until company profile matching or a later AI/evidence pass verifies it.
 */
export function extractRequirementCandidates(document: ExtractedDocument): TenderRequirement[] {
  const text = normalized(document.text);
  const found = requirementRules.filter((rule) => rule.terms.some((term) => text.includes(term)));

  return found.map((rule, index) => {
    const term = rule.terms.find((candidate) => text.includes(candidate)) ?? rule.terms[0];
    return {
      id: `${document.documentId}:requirement:${index + 1}`,
      category: rule.category,
      title: rule.label,
      description: `The tender documents contain language relating to ${rule.label.toLowerCase()}. Verify the exact condition before treating it as a pass/fail requirement.`,
      mandatory: /mandatory|must submit|required|compulsory/.test(snippetAround(document.text, term).toLowerCase()),
      status: 'needs_review',
      evidence: [evidence(document, snippetAround(document.text, term))],
    };
  });
}

export function extractRiskCandidates(document: ExtractedDocument): TenderRisk[] {
  const text = normalized(document.text);
  const risks: TenderRisk[] = [];

  const riskTerms: Array<{ title: string; severity: TenderRisk['severity']; terms: string[] }> = [
    { title: 'Late submissions may be disqualified', severity: 'high', terms: ['late submissions will not be accepted', 'late bids will not be considered'] },
    { title: 'Compulsory briefing or site meeting', severity: 'high', terms: ['compulsory briefing', 'compulsory site meeting', 'compulsory site inspection'] },
    { title: 'Mandatory requirement needs verification', severity: 'medium', terms: ['mandatory', 'must submit', 'compulsory'] },
  ];

  for (const rule of riskTerms) {
    const term = rule.terms.find((candidate) => text.includes(candidate));
    if (!term) continue;
    risks.push({
      id: `${document.documentId}:risk:${risks.length + 1}`,
      title: rule.title,
      detail: `Potential bid risk detected from the tender wording. Confirm the exact condition in the source document before making a bid/no-bid decision.`,
      severity: rule.severity,
      evidence: [evidence(document, snippetAround(document.text, term))],
    });
  }

  return risks;
}

export function analyseExtractedDocument(document: ExtractedDocument): DocumentAnalysisDraft {
  return {
    classification: classifyDocument(document.documentName, document.text),
    requirements: extractRequirementCandidates(document),
    risks: extractRiskCandidates(document),
  };
}
