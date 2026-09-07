import 'server-only';

import {
  generateJson,
  isGeminiConfigured,
  getGeminiModel,
  GeminiError,
  type ResponseSchema,
} from '@/lib/gemini.server';
import {
  generateGroqJson,
  isGroqConfigured,
  getGroqModel,
  GroqError,
} from '@/lib/groq.server';
import {
  buildPagedContext,
  extractPdfPages,
  fetchPdf,
} from '@/lib/pdf.server';
import { getTender } from '@/lib/tenders';
import { withCache } from '@/lib/ai-cache';
import { MOCK_SUMMARY, MOCK_MATCH } from '@/lib/mock-data';
import { daysUntil, normaliseCase } from '@/lib/format';
import type { TenderWithUserState } from '@/types/tender';

export type { AiSource, AiSummaryResult, AiMatchResult } from '@/types/ai';
import type { AiSource, AiSummaryResult, AiMatchResult } from '@/types/ai';

const SUMMARY_SCHEMA: ResponseSchema = {
  type: 'OBJECT',
  properties: {
    overview: {
      type: 'STRING',
      description: 'Two or three sentences on what is being procured and by whom.',
    },
    keyPoints: {
      type: 'ARRAY',
      description: 'Between 3 and 6 decision-relevant facts.',
      items: {
        type: 'OBJECT',
        properties: {
          text: { type: 'STRING' },
          page: {
            type: 'INTEGER',
            description: 'Page number in the source PDF. Use 0 if unknown.',
          },
        },
        required: ['text', 'page'],
      },
    },
  },
  required: ['overview', 'keyPoints'],
};

const SYSTEM_PROMPT = `You summarise South African government tender documents for small contractors deciding whether to bid.

Rules:
- Use ONLY the supplied document. Never infer, never fill gaps with general knowledge.
- If a fact is not in the document, omit it. Do not write "not specified".
- Give the exact page number for every key point.
- Prioritise, in order: what is being procured; compulsory briefing sessions;
  mandatory compliance (CIDB grading, B-BBEE, PSIRA, tax clearance, CSD registration);
  the evaluation formula (80/20 or 90/10); submission deadline and method; contract duration.
- Quote figures, dates and reference numbers exactly as written.
- Write plain British English. Expand acronyms on first use.
- Never give advice on whether to bid, and never estimate a contract value that is not stated.`;

export async function summariseTender(tenderId: string): Promise<AiSummaryResult> {
  return withCache(
    `summary-${tenderId}`,
    () => generateSummary(tenderId),
    (r) => r.source === 'gemini' || r.source === 'groq',
  );
}

async function generateGeminiSummary(
  tender: TenderWithUserState,
  doc: { id: string; name: string; fileType: string },
  pages: { page: number; text: string }[],
): Promise<AiSummaryResult> {
  const parts = [
    {
      text: `Tender document: ${doc.name}\nEach section is tagged with its page number.\n${buildPagedContext(pages)}`,
    },
  ];

  const data = await generateJson<{
    overview: string;
    keyPoints: { text: string; page: number }[];
  }>({
    system: SYSTEM_PROMPT,
    parts: [
      ...parts,
      {
        text: `Summarise this tender.

Known metadata (do not contradict it):
- Organisation: ${tender.organisation}
- Tender number: ${tender.tenderNumber}
- Closing date: ${tender.closingDate || 'not stated'}`,
      },
    ],
    schema: SUMMARY_SCHEMA,
  });

  const rawPoints = Array.isArray(data?.keyPoints) ? data.keyPoints : [];
  const keyPoints = rawPoints
    .map((p) => ({
      text: String(p?.text ?? '').trim(),
      page: typeof p?.page === 'number' ? p.page : parseInt(String(p?.page ?? 0), 10) || 0,
    }))
    .filter((p) => p.text.length > 0);

  const pageNumbers = [
    ...new Set(keyPoints.map((p) => p.page).filter((p) => p > 0)),
  ].sort((a, b) => a - b);

  const citations = pageNumbers.map((page, i) => ({
    index: i + 1,
    documentId: doc.id,
    documentName: doc.name,
    pageRange: `Page ${page} · ${doc.fileType}`,
  }));

  return {
    overview: typeof data?.overview === 'string' && data.overview.trim() ? data.overview.trim() : `${tender.title}, advertised by ${tender.organisation}.`,
    keyPoints: keyPoints.map((p) => ({
      text: p.text,
      citationIndex: p.page > 0 ? pageNumbers.indexOf(p.page) + 1 : null,
    })),
    citations,
    generatedAt: new Date().toISOString(),
    model: getGeminiModel(),
    source: 'gemini',
  };
}

async function generateGroqSummary(
  tender: TenderWithUserState,
  doc: { id: string; name: string; fileType: string },
  pages: { page: number; text: string }[],
): Promise<AiSummaryResult> {
  const pagedText = buildPagedContext(pages);
  const prompt = `Summarise this South African government tender.
Return a JSON object with exactly these fields:
{
  "overview": "Two or three sentences on what is being procured and by whom.",
  "keyPoints": [
    { "text": "fact statement", "page": 1 }
  ]
}

Document text:
${pagedText}

Known metadata:
- Organisation: ${tender.organisation}
- Tender number: ${tender.tenderNumber}
- Closing date: ${tender.closingDate || 'not stated'}`;

  const data = await generateGroqJson<{
    overview: string;
    keyPoints: { text: string; page: number }[];
  }>({
    system: SYSTEM_PROMPT,
    user: prompt,
  });

  const rawPoints = Array.isArray(data?.keyPoints) ? data.keyPoints : [];
  const keyPoints = rawPoints
    .map((p) => ({
      text: String(p?.text ?? '').trim(),
      page: typeof p?.page === 'number' ? p.page : parseInt(String(p?.page ?? 0), 10) || 0,
    }))
    .filter((p) => p.text.length > 0);

  const pageNumbers = [
    ...new Set(keyPoints.map((p) => p.page).filter((p) => p > 0)),
  ].sort((a, b) => a - b);

  const citations = pageNumbers.map((page, i) => ({
    index: i + 1,
    documentId: doc.id,
    documentName: doc.name,
    pageRange: `Page ${page} · ${doc.fileType}`,
  }));

  const overview =
    typeof data?.overview === 'string' && data.overview.trim()
      ? data.overview.trim()
      : tender.description
        ? normaliseCase(tender.description).slice(0, 400)
        : `${tender.title}, advertised by ${tender.organisation}.`;

  return {
    overview,
    keyPoints: keyPoints.map((p) => ({
      text: p.text,
      citationIndex: p.page > 0 ? pageNumbers.indexOf(p.page) + 1 : null,
    })),
    citations,
    generatedAt: new Date().toISOString(),
    model: getGroqModel(),
    source: 'groq',
  };
}

async function generateSummary(tenderId: string): Promise<AiSummaryResult> {
  if (!isGeminiConfigured() && !isGroqConfigured()) {
    return {
      ...MOCK_SUMMARY,
      source: 'mock',
      notice: 'AI provider key not set — showing a sample summary.',
    };
  }

  const result = await getTender(tenderId);
  if (!result) throw new Error('Tender not found');
  const tender = result.tender;

  const doc = tender.documents.find(
    (d) => /pdf/i.test(d.fileType) || /\.pdf$/i.test(d.name),
  );

  if (!doc) return metadataSummary(tender, 'No documents were published with this tender.');

  const pdf = await fetchPdf(doc.url);
  if (!pdf) {
    return metadataSummary(
      tender,
      'The tender document could not be downloaded from eTenders.',
    );
  }

  const pages = await extractPdfPages(pdf);

  // If Groq is configured, try Groq
  if (isGroqConfigured()) {
    try {
      return await generateGroqSummary(tender, doc, pages);
    } catch (e) {
      console.error('[ai] groq summary failed:', e);
      if (isGeminiConfigured()) {
        try {
          return await generateGeminiSummary(tender, doc, pages);
        } catch (geminiErr) {
          console.error('[ai] gemini summary fallback also failed:', geminiErr);
        }
      }
      const notice =
        e instanceof GroqError
          ? `Groq API error (${e.status}): ${e.message}`
          : 'Groq service error.';
      return metadataSummary(tender, notice);
    }
  }

  // If Gemini is configured, try Gemini
  if (isGeminiConfigured()) {
    try {
      return await generateGeminiSummary(tender, doc, pages);
    } catch (e) {
      console.error('[ai] gemini summary failed:', e);
      const notice =
        e instanceof GeminiError
          ? `Gemini API error (${e.status}): ${e.message}`
          : 'Gemini service error.';
      return metadataSummary(tender, notice);
    }
  }

  return metadataSummary(tender, 'No AI provider available.');
}

function metadataSummary(tender: TenderWithUserState, why: string): AiSummaryResult {
  const days = tender.closingDate ? daysUntil(tender.closingDate) : null;
  const points: { text: string; citationIndex: number | null }[] = [
    { text: `Advertised by ${tender.organisation}.`, citationIndex: null },
    { text: `Reference number ${tender.tenderNumber}.`, citationIndex: null },
  ];
  if (days !== null) {
    points.push({
      text:
        days < 0
          ? 'The closing date has passed.'
          : `Closes in ${days} ${days === 1 ? 'day' : 'days'}.`,
      citationIndex: null,
    });
  }
  if (tender.location !== 'Location not specified') {
    points.push({ text: `Location: ${tender.location}.`, citationIndex: null });
  }

  return {
    overview: tender.description
      ? normaliseCase(tender.description).slice(0, 400)
      : `${tender.title}, advertised by ${tender.organisation}.`,
    keyPoints: points,
    citations: [],
    generatedAt: new Date().toISOString(),
    model: isGroqConfigured() ? getGroqModel() : getGeminiModel(),
    source: 'unavailable',
    degraded: true,
    notice: `${why} This summary uses listing metadata only — open the tender documents before bidding.`,
  };
}

// ---------------------------------------------------------------------------
// Match scoring
// ---------------------------------------------------------------------------

export interface CompanyProfile {
  categories: string[];
  provinces: string[];
  cidbGrading: string | null;
  bbbeeLevel: number | null;
}

export const DEFAULT_PROFILE: CompanyProfile = {
  categories: ['IT & Technology', 'Supply & Delivery'],
  provinces: ['KwaZulu-Natal'],
  cidbGrading: null,
  bbbeeLevel: 2,
};

export async function matchTender(
  tenderId: string,
  profile: CompanyProfile = DEFAULT_PROFILE,
): Promise<AiMatchResult> {
  return withCache(
    `match-${tenderId}`,
    () => computeMatch(tenderId, profile),
    (r) => r.source === 'gemini' || r.source === 'groq',
  );
}

async function computeMatch(
  tenderId: string,
  profile: CompanyProfile,
): Promise<AiMatchResult> {
  const result = await getTender(tenderId);
  if (!result) throw new Error('Tender not found');
  const tender = result.tender;

  const categoryHit = profile.categories.includes(tender.category);
  const provinceHit =
    profile.provinces.includes(tender.province) || tender.province === 'National';
  const days = tender.closingDate ? daysUntil(tender.closingDate) : null;

  const timeScore =
    days === null ? 50 : days < 0 ? 0 : days >= 21 ? 100 : days >= 14 ? 85 : days >= 7 ? 65 : days >= 3 ? 40 : 15;

  const factors = [
    {
      key: 'category',
      label: `Category — ${tender.category}`,
      score: categoryHit ? 100 : 30,
      note: categoryHit ? 'Matches your profile' : 'Outside your categories',
    },
    {
      key: 'province',
      label: `Province — ${tender.province}`,
      score: provinceHit ? 100 : 40,
      note: tender.province === 'National' ? 'Open nationally' : provinceHit ? 'In your region' : 'Outside your region',
    },
    {
      key: 'timeToBid',
      label: 'Time to prepare bid',
      score: timeScore,
      note: days === null ? 'No closing date' : days < 0 ? 'Closed' : `${days} days remaining`,
    },
    {
      key: 'documents',
      label: 'Documents available',
      score: tender.documents.length > 0 ? 100 : 25,
      note:
        tender.documents.length > 0
          ? `${tender.documents.length} available`
          : 'None published',
    },
  ];

  const weights: Record<string, number> = {
    category: 0.35,
    province: 0.25,
    timeToBid: 0.25,
    documents: 0.15,
  };
  const score = Math.round(
    factors.reduce((sum, f) => sum + f.score * (weights[f.key] ?? 0), 0),
  );

  let warnings: { text: string; citationIndex: number | null }[] = [];
  let source: AiSource = 'unavailable';

  const doc = tender.documents.find((d) => /pdf/i.test(d.fileType));
  if ((isGroqConfigured() || isGeminiConfigured()) && doc) {
    try {
      const pdf = await fetchPdf(doc.url);
      if (pdf) {
        const pages = await extractPdfPages(pdf);
        const contextText = buildPagedContext(pages, 60_000);

        let warningSuccess = false;

        if (isGroqConfigured()) {
          try {
            const data = await generateGroqJson<{ warnings: { text: string; page: number }[] }>({
              system:
                'You identify disqualification risks in South African tender documents. Report ONLY requirements stated in the document that a bidder could fail on: compulsory briefing attendance, CIDB grading, PSIRA registration, tax clearance, CSD registration, B-BBEE certificates, sureties, site inspections. Never invent requirements. Return an empty array if none are stated.',
              user: `List the mandatory requirements a bidder could be disqualified for missing. Return JSON object with schema {"warnings": [{"text": "requirement", "page": 1}]}.\n\nDocument text:\n${contextText}`,
            });
            const rawWarnings = Array.isArray(data?.warnings) ? data.warnings : [];
            warnings = rawWarnings
              .slice(0, 4)
              .map((w) => ({
                text: String(w?.text ?? '').trim(),
                citationIndex: null,
              }))
              .filter((w) => w.text.length > 0);
            source = 'groq';
            warningSuccess = true;
          } catch (groqErr) {
            console.error('[ai] groq match warnings failed:', groqErr);
          }
        }

        if (!warningSuccess && isGeminiConfigured()) {
          try {
            const data = await generateJson<{ warnings: { text: string; page: number }[] }>({
              system:
                'You identify disqualification risks in South African tender documents. Report ONLY requirements stated in the document that a bidder could fail on: compulsory briefing attendance, CIDB grading, PSIRA registration, tax clearance, CSD registration, B-BBEE certificates, sureties, site inspections. Never invent requirements. Return an empty array if none are stated.',
              parts: [
                { text: contextText },
                { text: 'List the mandatory requirements a bidder could be disqualified for missing.' },
              ],
              schema: {
                type: 'OBJECT',
                properties: {
                  warnings: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: { text: { type: 'STRING' }, page: { type: 'INTEGER' } },
                      required: ['text', 'page'],
                    },
                  },
                },
                required: ['warnings'],
              },
            });
            const rawWarnings = Array.isArray(data?.warnings) ? data.warnings : [];
            warnings = rawWarnings
              .slice(0, 4)
              .map((w) => ({
                text: String(w?.text ?? '').trim(),
                citationIndex: null,
              }))
              .filter((w) => w.text.length > 0);
            source = 'gemini';
            warningSuccess = true;
          } catch (geminiErr) {
            console.error('[ai] gemini match warnings failed:', geminiErr);
          }
        }
      }
    } catch (e) {
      console.error('[ai] match warnings failed:', e);
    }
  }

  if (warnings.length === 0 && days !== null && days >= 0 && days <= 7) {
    warnings.push({
      text: `Only ${days} ${days === 1 ? 'day' : 'days'} remain before closing. Confirm all compliance documents are current before starting.`,
      citationIndex: null,
    });
  }

  const model =
    source === 'groq'
      ? getGroqModel()
      : source === 'gemini'
        ? getGeminiModel()
        : isGroqConfigured()
          ? getGroqModel()
          : getGeminiModel();

  return {
    score,
    factors,
    warnings,
    source,
    model,
  };
}

export { MOCK_MATCH };
