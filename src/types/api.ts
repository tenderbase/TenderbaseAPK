/**
 * Wire types for the TenderBase Ingestion API.
 * Source: https://tenderbase-api-rqrh.onrender.com
 *
 * The contract below was established by probing the live service on
 * 2026-09-08 — `/docs/json` ships an empty `paths: {}`, so there is no
 * machine-readable spec to generate from. Each note records what was actually
 * observed, not what was assumed.
 *
 * Two properties make this feed different from the one it replaces:
 *
 *  1. It is **camelCase** and already close to our domain model — the API
 *     advertises itself as "mirrored to 100% app-compatible contract shapes".
 *  2. It is **public** — no `X-API-Key`, no auth header. Every probe below
 *     succeeded unauthenticated.
 *
 * Never use these types in components; map to the domain model in
 * `src/lib/adapt.ts` first. That boundary is what stops upstream churn from
 * rippling through the UI.
 */

/**
 * Upstream lifecycle state, distinct from our derived display status.
 * Verified values: `active` (396), `complete` (9), `cancelled` (3) — the
 * counts come from `/stats`. Kept open with `| string` because the enum is not
 * published anywhere and a new state must not break the build.
 */
export type ApiLifecycleStatus = 'active' | 'complete' | 'cancelled' | (string & {});

/**
 * MIME type, uppercased by upstream: `APPLICATION/PDF`,
 * `APPLICATION/VND.OPENXMLFORMATS-OFFICEDOCUMENT.WORDDOCUMENT`.
 * Not the `pdf` / `xlsx` label the UI wants — see `deriveFileType()`.
 */
export interface ApiDocument {
  id: string;
  name: string;
  fileType: string;
  /** Always 0 in the current feed; the UI must not render "0 KB". */
  sizeBytes: number;
  /** Always `''` in the current feed. */
  updatedAt: string;
  /** Direct eTenders download URL, already absolute and signed by blob name. */
  url: string;
  isAddendum: boolean;
}

/**
 * Upstream nests contact details under `contactInformation` AND repeats them
 * as flat `contactName` / `contactEmail` / `contactPhone` columns. The two
 * agreed in every sampled record; `adaptContact()` prefers the nested object
 * and falls back to the flat fields.
 */
export interface ApiContactInformation {
  name: string | null;
  email: string | null;
  telephone: string | null;
}

/** Present on `/tenders/:id` only. Empty in every sampled record. */
export interface ApiAmendment {
  id?: string | number;
  field?: string;
  from?: string | null;
  to?: string | null;
  detectedAt?: string;
  [key: string]: unknown;
}

export interface ApiTender {
  /** CUID, e.g. `cmtt6lx56000142xs7i6g1dkg`. Strings now — not numeric ids. */
  id: string;
  /** eTenders reference, e.g. `169585`. */
  tenderNumber: string | null;
  /**
   * WARNING: usually a reference CODE ("RFQ12214 RE-ISSUE", "NB096",
   * "ZNQ59/26/27"), not a readable subject. `description` holds the real
   * subject. See `deriveTitle()` in adapt.ts.
   */
  title: string;
  /** The real subject line, frequently ALL CAPS. */
  description: string | null;
  organisation: string | null;
  /**
   * One of 62 normalised upstream categories, e.g. `Services: Professional`,
   * `Supplies: Computer Equipment`. NOT the app's 13-value `Category` enum —
   * `deriveCategory()` maps between them. Filter with the verbatim string.
   */
  category: string | null;
  /**
   * Display name, and it matches `/provinces` exactly: the 9 provinces plus
   * `National` (45 records). No nulls observed — unlike the previous feed,
   * where 59% were null.
   */
  province: string | null;
  /**
   * Verbatim eTenders locality, ` - ` delimited and postal-code terminated:
   * `King Shaka International Airport - La Mercy - Durban - 4000`.
   * Too long for a card — `deriveLocation()` shortens it.
   */
  location: string | null;
  /**
   * ZAR cents. `null` in every sampled record: the feed does not carry value.
   * Passed through untouched so the UI renders "Not disclosed", never "R0".
   */
  valueCents: number | null;
  /** Date only, no time: `2026-09-08`. */
  publishedDate: string | null;
  /** Full ISO instant: `2026-09-21T16:00:00.000Z`. */
  closingDate: string | null;
  sourceUrl: string | null;
  documents: ApiDocument[];
  contactInformation: ApiContactInformation | null;
  /**
   * Per-user state. Always `false` / `null` from this API — it has no notion
   * of our Supabase user, so the saved-tenders layer must overwrite it.
   */
  isSaved: boolean;
  savedAt: string | null;
  matchScore: number | null;
  status: ApiLifecycleStatus;
  /** CIDB grading, e.g. `1GB`. Null in every sampled record. */
  cidbGrade: string | null;
  cidbGradeRaw: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  /** When the ingest pipeline first saw the record. Full ISO instant. */
  firstSeenAt: string | null;
}

export interface ApiTenderDetail extends ApiTender {
  amendments: ApiAmendment[];
}

/**
 * Sort values accepted by `/tenders`. Probed by sending an invalid value,
 * which returns the enum verbatim:
 * `Expected 'latest' | 'closing' | 'closing_desc' | 'published_asc'`.
 *
 * `closing` is ASCENDING by closing date and includes already-closed records
 * first — pair it with `closingAfter` to get "closing soon".
 */
export type ApiSort = 'latest' | 'closing' | 'closing_desc' | 'published_asc';

/**
 * Query params for `GET /tenders`.
 *
 * Established by sending deliberately invalid values for ~22 candidate names.
 * Only these five are type-checked upstream:
 *   `page` (number), `limit` (number),
 *   `closingBefore` / `closingAfter` / `publishedAfter` (datetime).
 * Verified as filtering: `q`, `province`, `category`, `status`, `sort`.
 * Verified as IGNORED: `closingWithin`, `hasDocuments`, `organisation`,
 * `municipality`, `search`, `has_documents`, `closing_within`.
 * Unknown params are silently dropped rather than rejected, so a typo fails
 * open into an unfiltered result set — this list is the only guard.
 */
export interface ApiTenderQuery {
  page?: number;
  limit?: number;
  /** Full-text search. Matches `description` (case-insensitive), not just title. */
  q?: string;
  /** Exact display name, e.g. `KwaZulu-Natal` — slugs match nothing. */
  province?: string;
  /** Exact upstream category, e.g. `Construction`. */
  category?: string;
  /** `active` | `complete` | `cancelled`. */
  status?: string;
  sort?: ApiSort;
  /** ISO datetime. Inclusive upper bound on closing date. */
  closingBefore?: string;
  /** ISO datetime. Inclusive lower bound on closing date. */
  closingAfter?: string;
  /** ISO datetime. */
  publishedAfter?: string;
}

/** Every envelope carries this; it is the upstream's own live/mock flag. */
export type ApiSource = 'live' | 'mock' | (string & {});

export interface ApiTenderListResponse {
  results: ApiTender[];
  total: number;
  page: number;
  totalPages: number;
  source: ApiSource;
}

export interface ApiTenderDetailResponse {
  tender: ApiTenderDetail;
  source: ApiSource;
}

/** `GET /categories` — 62 entries, pre-sorted by count descending. */
export interface ApiCategoryFacet {
  category: string;
  count: number;
}

export interface ApiCategoriesResponse {
  categories: ApiCategoryFacet[];
  total: number;
  source: ApiSource;
}

/** `GET /provinces` — 10 entries (9 provinces + National). */
export interface ApiProvinceFacet {
  province: string;
  count: number;
}

export interface ApiProvincesResponse {
  provinces: ApiProvinceFacet[];
  total: number;
  source: ApiSource;
}

export interface ApiStats {
  totalTenders: number;
  activeTenders: number;
  completedTenders: number;
  cancelledTenders: number;
  /** Upstream's own "expiring soon" window; its length is not documented. */
  expiringSoonTenders: number;
  categoriesCount: number;
  provincesCount: number;
  latestPublishedDate: string | null;
  uptimeSeconds: number;
}

export interface ApiStatsResponse {
  stats: ApiStats;
  source: ApiSource;
}

/**
 * Zod validation failure from `/tenders`:
 * `{ "error": "Invalid query", "issues": ["page: Expected number, received nan"] }`
 */
export interface ApiValidationError {
  error: string;
  issues: string[];
}

/** Fastify's default 404/500 body: `{ message, error, statusCode }`. */
export interface ApiHttpError {
  message: string;
  error: string;
  statusCode: number;
}
