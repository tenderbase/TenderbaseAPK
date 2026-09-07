/**
 * Wire types for the South African Tender API.
 * Source: https://tenderbased-production.up.railway.app/openapi.json (OpenAPI 3.1.0)
 *
 * These mirror the upstream payload EXACTLY — snake_case, nullable where the
 * spec says nullable. Never use them in components; map to the domain model in
 * `src/lib/adapt.ts` first. That boundary is what stops upstream churn from
 * rippling through the UI.
 */

export interface ApiDocument {
  id: number;
  title: string | null;
  url: string;
  type: string | null;
  filename: string | null;
  mime_type: string | null;
  file_size: number | null;
}

export interface ApiAmendment {
  id: number;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  detected_at: string;
}

/** Upstream lifecycle status. Distinct from our derived display status. */
export type ApiStatus =
  | 'ACTIVE'
  | 'AMENDED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'EXPIRED';

export type ApiDeadlineState = 'ACTIVE' | 'CLOSING_SOON' | 'CLOSED' | string;

export interface ApiTender {
  id: number;
  source: string;
  /** Often the eTenders reference, e.g. "168713". */
  tender_number: string | null;
  ocid: string | null;
  /**
   * WARNING: in the live eTenders feed this is usually a reference CODE
   * ("20/2026 LLM"), not a readable title. `description` holds the real
   * subject. See `deriveTitle()` in adapt.ts.
   */
  title: string;
  description: string | null;
  organisation: string | null;
  province: string | null;
  municipality: string | null;
  category: string | null;
  categories: string[];
  tender_type: string | null;
  status: ApiStatus;
  deadline_state: ApiDeadlineState;
  advertised_date: string | null;
  closing_date: string | null;
  closing_time: string | null;
  closing_at: string | null;
  submission_method: string | null;
  source_url: string | null;
  is_sample: boolean;
  documents: ApiDocument[];
}

export interface ApiTenderDetail extends ApiTender {
  amendments: ApiAmendment[];
}

export interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface ApiPaginated<T> {
  data: T[];
  pagination: ApiPaginationMeta;
}

export interface ApiFacetValue {
  name: string;
  count: number;
}

export interface ApiFacets {
  provinces: ApiFacetValue[];
  categories: ApiFacetValue[];
  sources: ApiFacetValue[];
}

export interface ApiTaxonomyItem {
  id: number;
  slug: string;
  name: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; request_id: string };
}

/** Sort values the API accepts. Anything else is a 400. */
export type ApiSort = 'newest' | 'closing' | 'updated' | 'relevance';

export interface ApiTenderQuery {
  page?: number;
  /** Hard-capped at 100 upstream; larger values 422. */
  limit?: number;
  category?: string;
  province?: string;
  municipality?: string;
  organisation?: string;
  source?: string;
  status?: string;
  search?: string;
  sort?: ApiSort;
  /** Window such as '24h' or '7d'. */
  closing_within?: string;
  closing_before?: string;
  closing_after?: string;
  advertised_after?: string;
  advertised_before?: string;
  has_documents?: boolean;
  document_type?: string;
}
