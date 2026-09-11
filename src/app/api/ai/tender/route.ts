import { NextResponse } from 'next/server';
import { getServerTier } from '@/lib/tier-server';
import { getUser } from '@/lib/supabase-server';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const analysisSchema = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['bid', 'review', 'skip'] },
    fitScore: { type: 'number' },
    whyItMatters: { type: 'string' },
    eligibility: { type: 'array', items: { type: 'string' } },
    effort: { type: 'string' },
    risks: { type: 'array', items: { type: 'string' } },
    nextActions: { type: 'array', items: { type: 'string' } },
    buyerIntelligence: { type: 'array', items: { type: 'string' } },
    relatedSignals: { type: 'array', items: { type: 'string' } },
  },
  required: ['decision', 'fitScore', 'whyItMatters', 'eligibility', 'effort', 'risks', 'nextActions', 'buyerIntelligence', 'relatedSignals'],
};

type TenderPayload = {
  id?: string; tenderNumber?: string; title?: string; description?: string; organisation?: string;
  category?: string; categoryRaw?: string; province?: string; location?: string; locationFull?: string | null;
  valueCents?: number | null; publishedDate?: string; closingDate?: string; sourceUrl?: string | null;
  cidbGrade?: string | null;
  contactInformation?: { department: string | null; contactPerson: string | null; email: string | null; phone: string | null } | null;
  documents?: Array<{ name: string; fileType: string; sizeBytes: number; isAddendum: boolean }>;
};

function cleanTender(tender: TenderPayload) {
  return {
    tenderNumber: tender.tenderNumber, title: tender.title, description: tender.description,
    organisation: tender.organisation, category: tender.category, categoryRaw: tender.categoryRaw,
    province: tender.province, location: tender.location, locationFull: tender.locationFull,
    valueZar: tender.valueCents == null ? null : tender.valueCents / 100,
    publishedDate: tender.publishedDate, closingDate: tender.closingDate, cidbGrade: tender.cidbGrade,
    contactInformation: tender.contactInformation,
    documents: (tender.documents ?? []).map((d) => ({ name: d.name, fileType: d.fileType, sizeBytes: d.sizeBytes, isAddendum: d.isAddendum })),
  };
}

function modelText(response: any): string {
  const step = Array.isArray(response?.steps) ? [...response.steps].reverse().find((s: any) => s?.type === 'model_output') : null;
  const content = step?.content;
  if (!Array.isArray(content)) return '';
  const textPart = content.find((p: any) => p?.type === 'text');
  return typeof textPart?.text === 'string' ? textPart.text : '';
}

async function callGemini(input: string, responseFormat?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Gemini is not configured. Add GEMINI_API_KEY to the server environment.');
  const body: Record<string, unknown> = { model: MODEL, input, store: false, generation_config: { max_output_tokens: 1600 } };
  if (responseFormat) body.response_format = responseFormat;
  const response = await fetch(GEMINI_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body), cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('Gemini API error', response.status, data);
    throw new Error(typeof data?.error?.message === 'string' ? data.error.message : `Gemini request failed (${response.status})`);
  }
  return data;
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    const tier = await getServerTier();
    if (!user) return NextResponse.json({ error: 'Sign in to use TenderBase AI.' }, { status: 401 });
    if (tier.tier !== 'pro') return NextResponse.json({ error: 'Tender Intelligence is available on Pro.' }, { status: 403 });

    const body = await request.json();
    if (body?.operation !== 'analysis') return NextResponse.json({ error: 'Unsupported AI operation.' }, { status: 400 });

    const tender = cleanTender(body?.tender ?? {});
    const prompt = `You are TenderBase Intelligence, an expert South African public-procurement bid analyst. This is a decision-support brief, not a chat response. Analyse only the supplied public tender notice data. Never invent requirements, eligibility, values, deadlines, document contents, buyer history, legal conclusions or company-specific fit. If something is unknown, say unknown or needs owner verification.\n\nReturn:\n- decision: bid only when the supplied facts support a strong pursue signal; review when important facts are missing; skip only when the supplied facts show a material mismatch or blocker.\n- fitScore: 0-100 based only on evidence in the payload; do not imply knowledge of the user's business if none is supplied.\n- whyItMatters: concise commercial rationale grounded in the opportunity.\n- eligibility: concrete gates stated in the notice/data, otherwise items to verify.\n- effort: practical estimate based on visible scope, documents, deadline and complexity; label as an estimate.\n- risks: submission, timing, eligibility or information risks visible from the data.\n- nextActions: ordered actions the owner should take next.\n- buyerIntelligence: only observations about the named buyer contained in this tender; do not fabricate award history.\n- relatedSignals: patterns visible in this tender such as category, province, CIDB or addendum signals; do not invent related tenders.\n\nTENDER DATA:\n${JSON.stringify(tender)}\n\nKeep each list concise and operational.`;

    const response = await callGemini(prompt, { type: 'text', mime_type: 'application/json', schema: analysisSchema });
    const text = modelText(response);
    let analysis: unknown;
    try { analysis = JSON.parse(text); } catch { return NextResponse.json({ error: 'Gemini returned an invalid intelligence response.' }, { status: 502 }); }
    return NextResponse.json({ analysis, model: MODEL });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed.';
    const status = message.includes('not configured') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
