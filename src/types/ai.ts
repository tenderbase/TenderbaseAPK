/**
 * Client-safe AI result types.
 *
 * These live apart from `src/lib/ai.ts` because that module imports
 * `server-only`; a client component importing a type from it would drag the
 * server module (and the API key) into the browser bundle. Types only here.
 */

export type AiSource = 'groq' | 'mock' | 'unavailable';

export interface AiCitationRef {
  index: number;
  documentId: string;
  documentName: string;
  pageRange: string | null;
}

export interface AiSummaryResult {
  overview: string;
  keyPoints: { text: string; citationIndex: number | null }[];
  citations: AiCitationRef[];
  generatedAt: string;
  model: string;
  source: AiSource;
  degraded?: boolean;
  notice?: string;
}

export interface AiMatchFactor {
  key: string;
  label: string;
  score: number;
  note: string;
}

export interface AiMatchResult {
  score: number;
  factors: AiMatchFactor[];
  warnings: { text: string; citationIndex: number | null }[];
  source: AiSource;
  model: string;
  notice?: string;
}
