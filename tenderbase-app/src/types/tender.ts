/**
 * TenderBase domain model.
 * Mirrors the TenderBase API / Supabase `tenders` table.
 */

export const PROVINCES = [
  'KwaZulu-Natal',
  'Gauteng',
  'Western Cape',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  /** Upstream scope for tenders advertised nationally, not a real province. */
  'National',
] as const;
export type Province = (typeof PROVINCES)[number];

export const CATEGORIES = [
  'Construction',
  'IT & Technology',
  'Security',
  'Cleaning',
  'Transport',
  'Professional Services',
  'Supply & Delivery',
  'Healthcare',
  'Engineering',
  'Consulting',
  'Marketing',
  'Agriculture',
  /** Fallback for feed categories with no app equivalent. */
  'Other',
] as const;
export type Category = (typeof CATEGORIES)[number];

/** Derived from closingDate — never stored, always computed. */
export type TenderStatus = 'open' | 'closing_soon' | 'urgent' | 'closed';

export interface TenderDocument {
  id: string;
  name: string;
  /** e.g. 'pdf' | 'xlsx' */
  fileType: string;
  sizeBytes: number;
  updatedAt: string;
  /** Signed URL resolved at request time — never hardcoded. */
  url: string;
  isAddendum: boolean;
}

export interface ContactInformation {
  department: string | null;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
}

export interface Tender {
  id: string;
  tenderNumber: string;
  title: string;
  description: string;
  organisation: string;
  category: Category;
  province: Province;
  /** Free-text locality, e.g. 'Durban, KwaZulu-Natal' */
  location: string;
  /** Estimated value in ZAR cents. Null when the organisation withholds it. */
  valueCents: number | null;
  publishedDate: string;
  closingDate: string;
  sourceUrl: string | null;
  documents: TenderDocument[];
  contactInformation: ContactInformation | null;
}

/** A tender enriched with per-user state. Returned by authenticated endpoints. */
export interface TenderWithUserState extends Tender {
  isSaved: boolean;
  savedAt: string | null;
  /** 0–100. Present only when AI matching is enabled for the user. */
  matchScore: number | null;
}

// ---------- AI ----------

export interface AiCitation {
  /** 1-based marker rendered in the summary text. */
  index: number;
  documentId: string;
  documentName: string;
  pageRange: string | null;
}

export interface TenderSummary {
  tenderId: string;
  overview: string;
  keyPoints: { text: string; citationIndex: number | null }[];
  citations: AiCitation[];
  generatedAt: string;
  model: string;
}

export type MatchFactorKey =
  | 'category'
  | 'province'
  | 'value'
  | 'compliance'
  | 'timeToBid';

export interface MatchFactor {
  key: MatchFactorKey;
  label: string;
  /** 0–100 contribution score. */
  score: number;
  /** Short human explanation, e.g. 'Exact match'. */
  note: string;
}

export interface MatchExplanation {
  tenderId: string;
  score: number;
  factors: MatchFactor[];
  /** Disqualification risks surfaced before bidding. */
  warnings: { text: string; citationIndex: number | null }[];
}

// ---------- search ----------

export interface TenderFilters {
  query?: string;
  categories?: Category[];
  provinces?: Province[];
  statuses?: TenderStatus[];
  organisation?: string;
  minValueCents?: number;
  maxValueCents?: number;
  closingBefore?: string;
  closingAfter?: string;
}

export type SortOption =
  | 'closing_soon'
  | 'newest'
  | 'value_desc'
  | 'ai_match';

export interface SearchResponse {
  results: TenderWithUserState[];
  total: number;
  /** Filters the AI parsed out of a natural-language query, for display. */
  interpretedFilters?: TenderFilters;
}
