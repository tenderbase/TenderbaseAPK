import 'server-only';

/**
 * Minimal Gemini client for Google AI Studio (Generative Language) API.
 * Uses `x-goog-api-key` header and `?key=` query string for max compatibility.
 */

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function getGeminiModel(): string {
  const env = process.env.GEMINI_MODEL?.trim();
  if (!env) return 'gemini-1.5-flash';
  const valid = [
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest',
    'gemini-1.5-flash-8b',
  ];
  if (valid.includes(env)) return env;
  return 'gemini-1.5-flash';
}

export const GEMINI_MODEL = getGeminiModel();

const getApiKey = (): string => process.env.GEMINI_API_KEY?.trim() ?? '';

export const isGeminiConfigured = (): boolean => getApiKey().length > 0;

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
  temperature?: number;
  signal?: AbortSignal;
}

function headers(key: string): Record<string, string> {
  return {
    'x-goog-api-key': key,
    'Content-Type': 'application/json',
  };
}

const FALLBACK_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
];

export async function generateJson<T>(opts: GenerateOptions): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new GeminiError(500, 'GEMINI_API_KEY is not set');
  }

  const primaryModel = getGeminiModel();
  const modelsToTry = [
    primaryModel,
    ...FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  const body = {
    contents: [{ parts: opts.parts }],
    ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: opts.schema,
      temperature: opts.temperature ?? 0.2,
    },
  };

  let lastError: GeminiError | null = null;

  for (const model of modelsToTry) {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) {
        const delay = Math.min(2 ** attempt * 1000, 6000) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
      }

      let res: Response;
      try {
        const url = `${BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
        res = await fetch(url, {
          method: 'POST',
          headers: headers(apiKey),
          body: JSON.stringify(body),
          cache: 'no-store',
          signal: opts.signal ?? AbortSignal.timeout(120_000),
        });
      } catch {
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

      if (res.status === 404) {
        lastError = new GeminiError(404, message, false);
        break; // try next fallback model
      }

      const retryable = res.status === 429 || res.status >= 500;
      lastError = new GeminiError(res.status, message, retryable);
      if (!retryable) break;
    }
  }

  throw lastError ?? new GeminiError(500, 'Gemini request failed');
}
