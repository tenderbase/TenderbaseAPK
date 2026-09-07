import 'server-only';

/**
 * Dependency-free GroqCloud client.
 * Uses Groq's OpenAI-compatible completions API with structured JSON mode.
 */

const BASE = 'https://api.groq.com/openai/v1';

export function getGroqModel(): string {
  const env = process.env.GROQ_MODEL?.trim();
  // Confirmed active production text models on Groq API
  const valid = [
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
    'gemma2-9b-it',
  ];
  if (env && valid.includes(env)) return env;
  return 'llama-3.1-8b-instant';
}

export const GROQ_MODEL = getGroqModel();

const GROQ_FALLBACK_MODELS = [
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

const getApiKey = (): string => process.env.GROQ_API_KEY?.trim() ?? '';

export const isGroqConfigured = (): boolean => getApiKey().length > 0;

export class GroqError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GroqError';
  }
}

export async function generateGroqJson<T>(opts: {
  system?: string;
  user: string;
}): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new GroqError(500, 'GROQ_API_KEY is not set');
  }

  const primaryModel = getGroqModel();
  const modelsToTry = [
    primaryModel,
    ...GROQ_FALLBACK_MODELS.filter((m) => m !== primaryModel),
  ];

  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.user },
  ];

  let lastError: GroqError | null = null;

  for (const model of modelsToTry) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(60_000),
      });
    } catch {
      lastError = new GroqError(504, 'Groq request timed out');
      continue;
    }

    if (res.ok) {
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new GroqError(502, 'Groq returned no content');
      }
      try {
        return JSON.parse(content) as T;
      } catch {
        throw new GroqError(502, 'Groq returned malformed JSON response');
      }
    }

    let msg = `Groq API ${res.status}`;
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      if (err.error?.message) msg = err.error.message;
    } catch {
      /* non-JSON */
    }

    lastError = new GroqError(res.status, msg);

    // If 400 (decommissioned model) or 404 (not found), try next fallback model
    if (res.status === 400 || res.status === 404) {
      continue;
    }
    break;
  }

  throw lastError ?? new GroqError(500, 'Groq request failed');
}
