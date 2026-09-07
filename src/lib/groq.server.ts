import 'server-only';

/**
 * Dependency-free GroqCloud client.
 * Uses Groq's OpenAI-compatible completions API with structured JSON mode.
 */

const BASE = 'https://api.groq.com/openai/v1';

export const GROQ_MODEL = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
const API_KEY = process.env.GROQ_API_KEY ?? '';

export const isGroqConfigured = (): boolean => API_KEY.length > 0;

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
  if (!isGroqConfigured()) {
    throw new GroqError(500, 'GROQ_API_KEY is not set');
  }

  const messages = [
    ...(opts.system ? [{ role: 'system', content: opts.system }] : []),
    { role: 'user', content: opts.user },
  ];

  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    let msg = `Groq API ${res.status}`;
    try {
      const err = (await res.json()) as { error?: { message?: string } };
      if (err.error?.message) msg = err.error.message;
    } catch {
      /* non-JSON */
    }
    throw new GroqError(res.status, msg);
  }

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
