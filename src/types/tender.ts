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

/**
 * The app's own coarse taxonomy (13 values) used for badges and saved search
 * preferences. The ingestion API has 62 categories — `deriveCategory()` in
 * `lib/adapt.ts` maps between the two, and `categoryRaw` keeps the verbatim
 * upstream value for querying and for the detail screen.
 */
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

/**
 * Lifecycle state as the ingestion API reports it. Distinct from
 * `TenderStatus`, which is the display state derived in `lib/format.ts`.
 */
export type LifecycleStatus = 'active' | 'complete' | 'cancelled' | (string & {});

/**
 * Derived, never stored: computed from `closingDate` by `getStatus()`, except
 * that a tender the API reports as `cancelled` is cancelled no matter what its
 * closing date says. Bidders lose real money treating those as "Open".
 */
export type TenderStatus = 'open' | 'closing_soon' | 'urgent' | 'closed' | 'cancelled';

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
  /** App taxonomy (13 values), derived from `categoryRaw` by `deriveCategory()`. */
  category: Category;
  /**
   * Verbatim upstream category, e.g. 'Supplies: Computer Equipment'. This is
   * the string `/tenders?category=` filters on — never send `category`.
   */
  categoryRaw?: string;
  province: Province;
  /** Short locality for cards, e.g. 'Durban, KwaZulu-Natal' */
  location: string;
  /** Verbatim eTenders address, e.g. '1 Jones Road - Kempton Park - 1632'. */
  locationFull?: string | null;
  /** Estimated value in ZAR cents. Null when the organisation withholds it. */
  valueCents: number | null;
  publishedDate: string;
  closingDate: string;
  sourceUrl: string | null;
  documents: TenderDocument[];
  contactInformation: ContactInformation | null;
  /** Upstream lifecycle; absent/unknown means "trust the closing date". */
  lifecycleStatus?: LifecycleStatus | null;
  /** CIDB grading (e.g. '1GB') when the organisation published one. */
  cidbGrade?: string | null;
  /** When the ingestion pipeline first saw this record. */
  firstSeenAt?: string | null;
}

/** A tender enriched with per-user state. Returned by authenticated endpoints. */
export interface TenderWithUserState extends Tender {
  isSaved: boolean;
  savedAt: string | null;
  matchScore: number | null;
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
  | 'value_desc';

export interface SearchResponse {
  results: TenderWithUserState[];
  total: number;
}
