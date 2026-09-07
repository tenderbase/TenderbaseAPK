import 'server-only';

/**
 * Minimal Gemini client for the Google AI Studio (Generative Language) API.
 *
 * Deliberately dependency-free: the official SDK pulls in a large tree for
 * what is two HTTP calls, and this keeps the Capacitor bundle small.
 *
 * `server-only` guarantees the key can never be imported into a client
 * component — critical, since the APK bundle is trivially unzipped.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Free-tier default. As of 2026 the free tier covers Flash and Flash-Lite;
 * 2.5 Pro is capped so low (single-digit RPM, tens of requests/day) that it is
 * unusable for anything but a manual test.
 */
export function getGeminiModel(): string {
  const env = process.env.GEMINI_MODEL?.trim();
  if (!env) return 'gemini-1.5-flash';
  const valid = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash-8b',
  ];
  if (valid.includes(env)) return env;
  return 'gemini-1.5-flash';
}

export const GEMINI_MODEL = getGeminiModel();

const API_KEY = process.env.GEMINI_API_KEY ?? '';

export const isGeminiConfigured = (): boolean => API_KEY.length > 0;

export class GeminiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

/** JSON-schema subset Gemini accepts for structured output. */
export interface ResponseSchema {
  type: 'OBJECT' | 'ARRAY' | 'STRING' | 'INTEGER' | 'NUMBER' | 'BOOLEAN';
  properties?: Record<string, ResponseSchema>;
  items?: ResponseSchema;
  required?: string[];
  description?: string;
  enum?: string[];
}

interface GeneratePart {
  text?: string;
  file_data?: { mime_type: string; file_uri: string };
}

interface GenerateOptions {
  parts: GeneratePart[];
  schema: ResponseSchema;
  system?: string;
  /**
   * Gemini 2.5 "thinking" tokens. 0 disables, which roughly halves latency and
   * token spend. Enabled only for the match rubric, which needs reasoning.
   */
  thinkingBudget?: number;
  temperature?: number;
  signal?: AbortSignal;
}

function headers(): Record<string, string> {
  // Note: the key goes in x-goog-api-key. Newer AI Studio keys ("AQ.…") are
  // NOT OAuth tokens — sending them as `Authorization: Bearer` returns 401.
  return { 'x-goog-api-key': API_KEY, 'Content-Type': 'application/json' };
}

/**
 * Structured generation with retry.
 *
 * The free tier returns 503 UNAVAILABLE fairly often under load, and 429 when
 * the per-minute quota is hit, so transient failures are the normal case
 * rather than the exception. Retries use exponential backoff with jitter.
 */
export async function generateJson<T>(opts: GenerateOptions): Promise<T> {
  if (!isGeminiConfigured()) {
    throw new GeminiError(500, 'GEMINI_API_KEY is not set');
  }

  const model = getGeminiModel();

  const body = {
    contents: [{ parts: opts.parts }],
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: opts.schema,
      temperature: opts.temperature ?? 0.2,
      ...(opts.thinkingBudget && opts.thinkingBudget > 0
        ? { thinkingConfig: { thinkingBudget: opts.thinkingBudget } }
        : {}),
    },
  };

  const MAX_ATTEMPTS = 4;
  let lastError: GeminiError | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(2 ** attempt * 1000, 8000) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
    }

    let res: Response;
    try {
      res = await fetch(`${BASE}/models/${model}:generateContent`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: opts.signal ?? AbortSignal.timeout(120_000),
      });
    } catch (e) {
      lastError = new GeminiError(504, 'Gemini request timed out', true);
      continue;
    }

    if (res.ok) {
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
      };
      const candidate = json.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (!text) {
        // MAX_TOKENS / SAFETY produce an empty candidate.
        throw new GeminiError(
          502,
          `Gemini returned no content (finishReason: ${candidate?.finishReason ?? 'unknown'})`,
        );
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        throw new GeminiError(502, 'Gemini returned malformed JSON');
      }
    }

    let message = `Gemini API ${res.status}`;
    let dailyCap = false;
    try {
      const err = (await res.json()) as {
        error?: {
          message?: string;
          details?: { violations?: { quotaId?: string }[] }[];
        };
      };
      if (err.error?.message) message = err.error.message;
      // Distinguish the per-DAY cap from the per-minute one. Retrying a daily
      // cap is pointless and just burns time; per-minute is worth a backoff.
      dailyCap = Boolean(
        err.error?.details?.some((d) =>
          d.violations?.some((v) => /PerDay/i.test(v.quotaId ?? '')),
        ),
      );
    } catch {
      /* non-JSON */
    }

    if (res.status === 429 && dailyCap) {
      throw new GeminiError(429, 'DAILY_QUOTA_EXCEEDED: ' + message, false);
    }

    // 429 (per-minute), 503 overloaded, 5xx transient — all worth retrying.
    const retryable = res.status === 429 || res.status >= 500;
    lastError = new GeminiError(res.status, message, retryable);
    if (!retryable) throw lastError;
  }

  throw lastError ?? new GeminiError(500, 'Gemini request failed');
}

// ---------------------------------------------------------------------------
// Files API — required for PDFs
// ---------------------------------------------------------------------------

/**
 * Uploads a PDF and returns its file URI.
 *
 * Inline base64 (`inline_data`) is the documented alternative but proved
 * unreliable for real eTenders PDFs — 1.2 MB documents returned persistent
 * 503s, while the resumable Files API upload succeeded first time. Use this.
 *
 * Uploaded files expire after ~48h on Google's side, so we never treat the URI
 * as durable storage.
 */
export async function uploadPdf(
  bytes: ArrayBuffer,
  displayName: string,
): Promise<{ uri: string; mimeType: string }> {
  if (!isGeminiConfigured()) throw new GeminiError(500, 'GEMINI_API_KEY is not set');

  const size = bytes.byteLength;

  const start = await fetch(`${BASE.replace('/v1beta', '')}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      ...headers(),
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(size),
      'X-Goog-Upload-Header-Content-Type': 'application/pdf',
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  });

  if (!start.ok) {
    throw new GeminiError(start.status, `Gemini upload init failed (${start.status})`);
  }

  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new GeminiError(502, 'Gemini did not return an upload URL');

  const finish = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(size),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: bytes,
    cache: 'no-store',
    signal: AbortSignal.timeout(120_000),
  });

  if (!finish.ok) {
    throw new GeminiError(finish.status, `Gemini upload failed (${finish.status})`);
  }

  const json = (await finish.json()) as {
    file?: { uri: string; mimeType: string; state?: string };
  };
  if (!json.file?.uri) throw new GeminiError(502, 'Gemini upload returned no file URI');

  return { uri: json.file.uri, mimeType: json.file.mimeType };
}

/** Fetches a source PDF. Guards against huge files and non-PDF responses. */
export async function fetchPdf(
  url: string,
  maxBytes = 20 * 1024 * 1024,
): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;

    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > maxBytes) return null;

    // eTenders sometimes serves an HTML error page with a .pdf URL.
    const magic = new Uint8Array(buf.slice(0, 5));
    const isPdf = String.fromCharCode(...magic) === '%PDF-';
    return isPdf ? buf : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

export interface PdfPage {
  page: number;
  text: string;
}

/**
 * Extracts text per page, so citations can reference a real page number.
 *
 * This is the PRIMARY path for summarisation. Gemini's native PDF ingestion
 * works but the free tier returns 503 for document requests far too often to
 * depend on, and a 100-page tender costs ~27k tokens per call. Extracting
 * text locally is faster, quota-cheap, and keeps page provenance intact.
 *
 * Returns [] for scanned/image-only PDFs, which have no text layer — the
 * caller then falls back to Gemini's native PDF reading, which does OCR.
 */
export async function extractPdfPages(bytes: ArrayBuffer): Promise<PdfPage[]> {
  try {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      const result = await parser.getText();
      const pages = (result.pages ?? []) as { num?: number; text?: string }[];

      if (pages.length > 0) {
        return pages
          .map((p, i) => ({ page: p.num ?? i + 1, text: (p.text ?? '').trim() }))
          .filter((p) => p.text.length > 0);
      }
      // Some builds only return the concatenated text.
      const all = (result.text ?? '').trim();
      return all ? [{ page: 1, text: all }] : [];
    } finally {
      await parser.destroy();
    }
  } catch (e) {
    console.error('[pdf] extraction failed:', e);
    return [];
  }
}

/**
 * Flattens pages into a token-budgeted, page-tagged prompt.
 *
 * Tender PDFs run to 100+ pages (~190k characters) but the decision-relevant
 * content — advert, conditions, evaluation criteria — is almost always at the
 * front. We take a generous prefix rather than the whole document to stay well
 * inside the free tier's per-minute token limit.
 */
export function buildPagedContext(pages: PdfPage[], maxChars = 120_000): string {
  const parts: string[] = [];
  let used = 0;
  for (const p of pages) {
    const block = `\n\n[PAGE ${p.page}]\n${p.text}`;
    if (used + block.length > maxChars) break;
    parts.push(block);
    used += block.length;
  }
  return parts.join('');
}
