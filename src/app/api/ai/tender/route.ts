import { NextResponse } from 'next/server';
import { getServerTier } from '@/lib/tier-server';
import { getUser } from '@/lib/supabase-server';

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const analysisSchema = {
  type: 'object',
  properties: {
    executiveSummary: { type: 'string' },
    requirements: { type: 'array', items: { type: 'string' } },
    eligibility: { type: 'array', items: { type: 'string' } },
    risks: { type: 'array', items: { type: 'string' } },
    recommendation: { type: 'string' },
    questions: { type: 'array', items: { type: 'string' } },
  },
  required: ['executiveSummary', 'requirements', 'eligibility', 'risks', 'recommendation', 'questions'],
};

type TenderPayload = {
  id?: string;
  tenderNumber?: string;
  title?: string;
  description?: string;
  organisation?: string;
  category?: string;
  categoryRaw?: string;
  province?: string;
  location?: string;
  locationFull?: string | null;
  valueCents?: number | null;
  publishedDate?: string;
  closingDate?: string;
  sourceUrl?: string | null;
  cidbGrade?: string | null;
  contactInformation?: { department: string | null; contactPerson: string | null; email: string | null; phone: string | null } | null;
  documents?: Array<{ name: string; fileType: string; sizeBytes: number; isAddendum: boolean }>;
};

type HistoryItem = { role: 'user' | 'assistant'; content: string };

function cleanTender(tender: TenderPayload) {
  return {
    tenderNumber: tender.tenderNumber,
    title: tender.title,
    description: tender.description,
    organisation: tender.organisation,
    category: tender.category,
    categoryRaw: tender.categoryRaw,
    province: tender.province,
    location: tender.location,
    locationFull: tender.locationFull,
    valueZar: tender.valueCents == null ? null : tender.valueCents / 100,
    publishedDate: tender.publishedDate,
    closingDate: tender.closingDate,
    cidbGrade: tender.cidbGrade,
    contactInformation: tender.contactInformation,
    documents: (tender.documents ?? []).map((d) => ({
      name: d.name,
      fileType: d.fileType,
      sizeBytes: d.sizeBytes,
      isAddendum: d.isAddendum,
    })),
  };
}

function modelText(response: any): string {
  const step = Array.isArray(response?.steps)
    ? [...response.steps].reverse().find((s: any) => s?.type === 'model_output')
    : null;
  const content = step?.content;
  if (!Array.isArray(content)) return '';
  const textPart = content.find((p: any) => p?.type === 'text');
  return typeof textPart?.text === 'string' ? textPart.text : '';
}

async function callGemini(input: string, responseFormat?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini is not configured. Add GEMINI_API_KEY to the server environment.');
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    input,
    store: false,
    generation_config: { max_output_tokens: 1400 },
  };
  if (responseFormat) body.response_format = responseFormat;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
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
    if (tier.tier !== 'pro') return NextResponse.json({ error: 'TenderBase AI analysis is available on Pro.' }, { status: 403 });

    const body = await request.json();
    const tender = cleanTender(body?.tender ?? {});
    const operation = body?.operation === 'followup' ? 'followup' : 'analysis';

    if (operation === 'followup') {
      const question = String(body?.question ?? '').trim();
      if (!question) return NextResponse.json({ error: 'Ask a question first.' }, { status: 400 });
      const history = Array.isArray(body?.history) ? (body.history as HistoryItem[]).slice(-6) : [];
      const prompt = `You are TenderBase AI, a South African public-procurement bid analyst. Answer only from the tender data below and the conversation. Never invent facts. If the data does not contain the answer, say so clearly and tell the user what document or information is needed. Be concise, practical and decision-oriented.\n\nTENDER DATA:\n${JSON.stringify(tender)}\n\nCONVERSATION:\n${JSON.stringify(history)}\n\nUSER QUESTION:\n${question}`;
      const response = await callGemini(prompt, { type: 'text', mime_type: 'text/plain' });
      return NextResponse.json({ answer: modelText(response), model: MODEL });
    }

    const prompt = `You are TenderBase AI, an expert South African public-procurement bid analyst. Analyse the tender data below for a professional bidder. Use only supplied facts. Do not fabricate requirements, eligibility, values, deadlines, document contents, or legal conclusions. Clearly distinguish an observed fact from a recommendation or risk inference. Focus on whether the opportunity is worth pursuing, what must be checked, and what could cause a failed submission.\n\nTENDER DATA:\n${JSON.stringify(tender)}\n\nReturn the requested structured analysis.`;
    const response = await callGemini(prompt, { type: 'text', mime_type: 'application/json', schema: analysisSchema });
    const text = modelText(response);
    let analysis: unknown;
    try {
      analysis = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Gemini returned an invalid analysis response.' }, { status: 502 });
    }
    return NextResponse.json({ analysis, model: MODEL });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI request failed.';
    const status = message.includes('not configured') ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
