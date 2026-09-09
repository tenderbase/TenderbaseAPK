import type {
  ApiCategoriesResponse,
  ApiContactInformation,
  ApiDocument,
  ApiLifecycleStatus,
  ApiProvincesResponse,
  ApiTender,
  ApiTenderDetail,
} from '@/types/api';
import {
  CATEGORIES,
  PROVINCES,
  type Category,
  type ContactInformation,
  type Province,
  type Tender,
  type TenderDocument,
  type TenderWithUserState,
} from '@/types/tender';

/**
 * Anti-corruption layer: TenderBase Ingestion API payloads -> domain model.
 *
 * The new feed is camelCase and already close to `Tender`, which makes it
 * tempting to pass straight through. Don't. Every transform below exists
 * because of something observed in the live data on 2026-09-08:
 *
 *  - `title` is a reference code ("NB096"); the subject lives in `description`
 *  - `description` is usually ALL CAPS, sometimes prefixed by the same code
 *  - `category` is one of 62 upstream values, not the app's 13
 *  - `location` is a ` - ` delimited address ending in a postal code
 *  - `documents[].fileType` is a MIME string, `sizeBytes` is always 0
 *  - `status` is a lifecycle state that can contradict the closing date
 *  - `valueCents` is always null — the feed carries no money
 */

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

/** Codes like "NB096", "RFQ12214 RE-ISSUE", "SPU/B/WKLF/032/26". */
function looksLikeReferenceCode(s: string): boolean {
  const t = s.trim();
  if (t.length < 25 && /[0-9]/.test(t) && t.split(' ').length <= 4) return true;
  if (/^[A-Z0-9][A-Z0-9/\-.\s]*$/.test(t) && t.split(' ').length <= 3) return true;
  return false;
}

/**
 * SA procurement acronyms and proper nouns that sentence-casing would
 * otherwise flatten. Sourced from the live feed, not guessed.
 */
const PRESERVE_UPPER =
  /\b(sa|rsa|kzn|it|ict|hiv|aids|ppe|grap|sbd|cidb|bbbee|b-bbee|vat|rfq|rfp|rfi|rfb|sme|smme|nda|eskom|sanral|prasa|transnet|sars|sita|dut|ukzn|tvet|acsa|gps|cctv|hvac|led|pvc|popia|nec3|ecc|dod|saaf|o\.r|tambo)\b/gi;

/** Place names and organisations that arrive in ALL CAPS from eTenders. */
const PROPER_NOUNS: Record<string, string> = {
  'king phalo': 'King Phalo',
  'king shaka': 'King Shaka',
  'or tambo': 'O.R. Tambo',
  'o.r tambo': 'O.R. Tambo',
  'kwazulu-natal': 'KwaZulu-Natal',
  kwazulu: 'KwaZulu',
  natal: 'Natal',
  durban: 'Durban',
  ethekwini: 'eThekwini',
  pietermaritzburg: 'Pietermaritzburg',
  pretoria: 'Pretoria',
  'cape town': 'Cape Town',
  'port elizabeth': 'Port Elizabeth',
  gqeberha: 'Gqeberha',
  johannesburg: 'Johannesburg',
  bloemfontein: 'Bloemfontein',
  polokwane: 'Polokwane',
  mbombela: 'Mbombela',
  mahikeng: 'Mahikeng',
  kimberley: 'Kimberley',
  qumbu: 'Qumbu',
  tsolo: 'Tsolo',
  hammanskraal: 'Hammanskraal',
  'kempton park': 'Kempton Park',
  ekhuruleni: 'Ekhuruleni',
  'la mercy': 'La Mercy',
  lilani: 'Lilani',
  artscape: 'Artscape',
  mhlontlo: 'Mhlontlo',
  aruba: 'Aruba',
};

function toSentenceCase(s: string): string {
  const letters = s.replace(/[^A-Za-z]/g, '');
  const upperRatio =
    letters.length === 0
      ? 0
      : letters.split('').filter((c) => c === c.toUpperCase()).length / letters.length;
  // Only rewrite genuinely shouted text; mixed-case descriptions are left alone
  // because upstream capitalisation there is deliberate.
  if (upperRatio < 0.7) return s;

  let out = s
    .toLowerCase()
    .replace(/(^\w|[.!?]\s+\w)/g, (m) => m.toUpperCase())
    .replace(PRESERVE_UPPER, (m) => m.toUpperCase());

  for (const [lower, proper] of Object.entries(PROPER_NOUNS)) {
    out = out.replace(new RegExp(`\\b${lower.replace(/\./g, '\\.')}\\b`, 'gi'), proper);
  }
  return out;
}

function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const i = cut.lastIndexOf(' ');
  return `${(i > max * 0.6 ? cut.slice(0, i) : cut).replace(/[,;:.\-\s]+$/, '')}…`;
}

/**
 * eTenders repeats the reference code at the start of the description
 * ("SPU/B/WKLF/032/26: SUPPLY, DELIVER AND …"). Strip it, or the derived title
 * leads with the same code we just rejected.
 */
function stripLeadingReference(desc: string, codes: (string | null | undefined)[]): string {
  let out = desc.trim();
  for (const code of codes) {
    const c = code?.trim();
    if (!c) continue;
    const escaped = c.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const re = new RegExp(`^${escaped}\\s*[:\\-–]?\\s*`, 'i');
    if (re.test(out)) {
      out = out.replace(re, '');
      break;
    }
  }
  return out;
}

/** "Request for quotation : Stationery" -> "Stationery". */
function stripBoilerplate(desc: string): string {
  const out = desc.replace(
    /^(request for (a )?quotation|request for proposal|invitation to (quote|bid)|rfq|rfp|bid request(?: for the| for)?)\s*[:\-–]?\s*/i,
    '',
  );
  if (!out.trim()) return desc; // never strip down to nothing
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/**
 * Most live records put a reference code in `title` and the readable subject in
 * `description`. Prefer the description when the title is a code.
 */
export function deriveTitle(t: Pick<ApiTender, 'title' | 'description' | 'tenderNumber'>): string {
  const raw = (t.title ?? '').trim();
  const fullDesc = (t.description ?? '').trim();

  if (raw && !looksLikeReferenceCode(raw)) return truncateAtWord(toSentenceCase(raw), 120);

  const desc = stripBoilerplate(stripLeadingReference(fullDesc, [raw, t.tenderNumber]));
  // Deliberately permissive: real record 169099 has the whole subject in four
  // words ("Stationery"), and an over-long threshold silently falls back to
  // showing the reference code instead.
  if (desc.length > 3) {
    const firstSentence = desc.split(/(?<=[.!?])\s+/)[0] ?? desc;
    return truncateAtWord(toSentenceCase(firstSentence), 120);
  }
  return raw || 'Untitled tender';
}

// ---------------------------------------------------------------------------
// Category — 62 upstream values -> the app's 13-value enum
// ---------------------------------------------------------------------------

/**
 * Exact mappings for the whole vocabulary served by `/categories` today.
 *
 * The `Services:` / `Supplies:` / `Disposals:` prefixes are eTenders bucket
 * names and cannot be inferred from keywords, so they are pinned explicitly.
 * Anything not listed here falls through to `CATEGORY_RULES`, which is what
 * keeps a NEW upstream category from silently becoming "Other".
 */
const CATEGORY_OVERRIDES: Record<string, Category> = {
  'services: professional': 'Professional Services',
  'services: general': 'Other',
  'services: electrical': 'Engineering',
  'services: building': 'Construction',
  'services: civil': 'Construction',
  'supplies: general': 'Supply & Delivery',
  'supplies: computer equipment': 'IT & Technology',
  'supplies: stationery/printing': 'Supply & Delivery',
  'supplies: electrical equipment': 'Supply & Delivery',
  'supplies: medical': 'Healthcare',
  'supplies: clothing/textiles/footwear': 'Supply & Delivery',
  'supplies: perishable provisions': 'Supply & Delivery',
  'disposals: general': 'Other',
  construction: 'Construction',
  'construction of buildings': 'Construction',
  'specialised construction activities': 'Construction',
  'civil engineering': 'Engineering',
  'security and investigation activities': 'Security',
  'information and communication': 'IT & Technology',
  'information service activities': 'IT & Technology',
  telecommunications: 'IT & Technology',
  'computer programming, consultancy and related activities': 'IT & Technology',
  'agricultural products and services': 'Agriculture',
  'legal and accounting activities': 'Consulting',
  'financial and insurance activities': 'Consulting',
  'activities of head offices; management consultancy activities': 'Consulting',
  'professional, scientific and technical activities': 'Consulting',
  'other professional, scientific and technical activities': 'Consulting',
  'scientific research and development': 'Consulting',
  'human health activities': 'Healthcare',
  'human health and social work activities': 'Healthcare',
  'insurance, reinsurance and pension funding, except compulsory social security': 'Consulting',
  'electricity, gas, steam and air conditioning': 'Engineering',
  'repair and installation of machinery and equipment': 'Engineering',
  'water collection, treatment and supply': 'Engineering',
  'water supply; sewerage, waste management and remediation activities': 'Engineering',
  sewerage: 'Engineering',
  'waste collection, treatment and disposal activities; materials recovery': 'Cleaning',
  'remediation activities and other waste management services': 'Cleaning',
  'services to buildings and landscape activities': 'Cleaning',
  'food and beverage service activities': 'Supply & Delivery',
  'manufacture of furniture': 'Supply & Delivery',
  'manufacture of electrical equipment': 'Supply & Delivery',
  'manufacture of machinery and equipment n.e.c.': 'Supply & Delivery',
  'manufacture of motor vehicles, trailers and semi-trailers': 'Transport',
  manufacturing: 'Supply & Delivery',
  'other manufacturing': 'Supply & Delivery',
  'transportation and storage': 'Transport',
  'advertising and market research': 'Marketing',
  'publishing activities': 'Marketing',
  'motion picture, video and television programme production, sound recording and music publishing activities':
    'Marketing',
  education: 'Professional Services',
  'other service activities': 'Other',
  'administrative and support activities': 'Other',
  'office administrative, office support and other business support activities': 'Other',
  'other personal service activities': 'Other',
  'real estate activities': 'Other',
  'rental and leasing activities': 'Other',
  accommodation: 'Other',
  'travel agency, tour operator, reservation service and related activities': 'Other',
  'sports activities and amusement and recreation activities': 'Other',
};

/**
 * `Services: Functional (Including Cleaning and Security Services)` covers BOTH
 * trades, so the category string alone cannot decide. Real example: tender
 * 169450 ("Physical security at Lilani Hot springs") carries it. Disambiguate
 * from the subject text instead of picking one and mislabelling half the bucket.
 */
const AMBIGUOUS_FUNCTIONAL = 'services: functional (including cleaning and security services)';

/** Ordered: first match wins, so specific trades precede the generic "supply". */
const CATEGORY_RULES: [RegExp, Category][] = [
  [/\b(comput\w*|information (?:and|service)|telecommunicat|software|programming|ict|network|hosting|data)\b/i, 'IT & Technology'],
  [/\b(security|guarding|investigation|surveillance|policing)\b/i, 'Security'],
  [/\b(water|sanitation|sewerage|electrical|electricity|engineering|mechanical|machinery|plant|civil)\b/i, 'Engineering'],
  [/\b(construction|building|road|bridge|infrastructure|bulk earthworks)\b/i, 'Construction'],
  [/\b(cleaning|waste|hygiene|landscape|pest control|laundry)\b/i, 'Cleaning'],
  [/\b(health|medical|hospital|clinic|nursing|pharmaceutic)\b/i, 'Healthcare'],
  [/\b(transport|logistic|storage|freight|vehicle|aviation|maritime|rail|bus)\b/i, 'Transport'],
  [/\b(agricultur|farming|livestock|crop|forestry|fisher)\b/i, 'Agriculture'],
  [/\b(advertis|market research|publishing|media|motion picture|branding)\b/i, 'Marketing'],
  [/\b(consultanc|consulting|legal|accounting|audit|architect|quantity survey|scientific|research and development|financial|insurance|valuation)\b/i, 'Consulting'],
  [/\b(professional|education|training|skills development|facilitation)\b/i, 'Professional Services'],
  [/\b(suppl|delivery|manufactur|procure|furniture|stationery|clothing|textile|food|beverage|equipment|goods|provision)\b/i, 'Supply & Delivery'],
];

function classifyByText(text: string): Category | null {
  for (const [re, cat] of CATEGORY_RULES) if (re.test(text)) return cat;
  return null;
}

/**
 * Maps an upstream category to the app's enum. `subject` is the tender's own
 * text, used only to split the ambiguous cleaning/security bucket.
 */
export function deriveCategory(
  category: string | null | undefined,
  subject = '',
): Category {
  const raw = (category ?? '').trim();
  const key = raw.toLowerCase();

  if (key === AMBIGUOUS_FUNCTIONAL) {
    return classifyByText(subject) ?? 'Cleaning';
  }
  if (CATEGORY_OVERRIDES[key]) return CATEGORY_OVERRIDES[key];
  if (key) {
    const ruled = classifyByText(key) ?? classifyByText(subject);
    if (ruled) return ruled;
  }
  return 'Other';
}

/** Every app category the given upstream vocabulary could produce. */
export function categoriesInUse(upstream: string[]): Category[] {
  const seen = new Set<Category>();
  for (const c of upstream) seen.add(deriveCategory(c));
  return CATEGORIES.filter((c) => seen.has(c));
}

// ---------------------------------------------------------------------------
// Province & location
// ---------------------------------------------------------------------------

const PROVINCE_LOOKUP: Record<string, Province> = Object.fromEntries(
  PROVINCES.map((p) => [p.toLowerCase(), p]),
) as Record<string, Province>;

/** Spellings that appear in organisation names and addresses. */
const PROVINCE_ALIASES: Record<string, Province> = {
  'kwazulu natal': 'KwaZulu-Natal',
  'kwazulu-natal': 'KwaZulu-Natal',
  kzn: 'KwaZulu-Natal',
  'north-west': 'North West',
  northwest: 'North West',
  'western cape': 'Western Cape',
  'eastern cape': 'Eastern Cape',
  'free state': 'Free State',
  'northern cape': 'Northern Cape',
  gp: 'Gauteng',
  wc: 'Western Cape',
  ec: 'Eastern Cape',
  fs: 'Free State',
  lp: 'Limpopo',
  mp: 'Mpumalanga',
  nw: 'North West',
  nc: 'Northern Cape',
};

/**
 * Unlike the previous feed (59% null province), this one populates `province`
 * with the exact display name. Normalise it, and only fall back to locality
 * hints when upstream genuinely sent nothing.
 */
export function deriveProvince(t: Pick<ApiTender, 'province' | 'location' | 'organisation'>): Province {
  const raw = t.province?.trim();
  if (raw) {
    const key = raw.toLowerCase();
    if (PROVINCE_LOOKUP[key]) return PROVINCE_LOOKUP[key];
    if (PROVINCE_ALIASES[key]) return PROVINCE_ALIASES[key];
  }
  // 'National' is a real upstream scope (45 records) and a real enum member.
  if (!raw) {
    const haystack = [t.location, t.organisation].filter(Boolean).join(' ');
    for (const [alias, prov] of Object.entries(PROVINCE_ALIASES)) {
      if (alias.length > 2 && new RegExp(`\\b${alias}\\b`, 'i').test(haystack)) return prov;
    }
  }
  return 'National';
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(' ');
}

/**
 * Upstream `location` is a ` - ` delimited eTenders address terminated by a
 * postal code:
 *   "King Shaka International Airport - La Mercy - Durban - 4000"
 *   "191 Prince Alfred Street - Pietermaritzburg - Pietermaritzburg - 3201"
 * The last non-postal segment is the city/metro, which is what fits on a card.
 */
export function deriveCity(location: string | null | undefined): string | null {
  const parts = (location ?? '')
    .split(' - ')
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^\d{4}$/.test(p)); // drop the postal code
  if (parts.length === 0) return null;
  const city = parts[parts.length - 1];
  // A coordinates string or a lone street is not a city.
  if (/[0-9]{2}['"][0-9]/.test(city) || city.length > 40) return null;
  return titleCase(city);
}

/** Short card locality: "Durban, KwaZulu-Natal". */
export function deriveLocation(t: Pick<ApiTender, 'location' | 'province' | 'organisation'>): string {
  const province = deriveProvince(t);
  const city = deriveCity(t.location);
  if (city && city.toLowerCase() !== province.toLowerCase()) return `${city}, ${province}`;
  if (city) return city;
  return province;
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** Upstream sends an uppercased MIME type, not the label the UI wants. */
const MIME_LABEL: [RegExp, string][] = [
  [/^application\/pdf/i, 'PDF'],
  [/wordprocessingml\.document/i, 'DOCX'],
  [/spreadsheetml\.sheet/i, 'XLSX'],
  [/presentationml\.presentation/i, 'PPTX'],
  [/^application\/msword/i, 'DOC'],
  [/ms-excel/i, 'XLS'],
  [/^application\/zip|x-zip|compressed/i, 'ZIP'],
  [/^application\/(?:vnd\.)?rar/i, 'RAR'],
  [/^text\/plain/i, 'TXT'],
  [/^text\/csv/i, 'CSV'],
  [/^image\/png/i, 'PNG'],
  [/^image\/(?:jpeg|jpg)/i, 'JPG'],
];

export function deriveFileType(mime: string | null | undefined, name: string): string {
  const m = (mime ?? '').trim();
  if (m) {
    for (const [re, label] of MIME_LABEL) if (re.test(m)) return label;
  }
  const ext = name.includes('.') ? name.split('.').pop()?.trim() : '';
  if (ext && ext.length <= 5 && /^[a-z0-9]+$/i.test(ext)) return ext.toUpperCase();
  if (m) return m.split('/').pop()?.toUpperCase() ?? 'FILE';
  return 'FILE';
}

export function adaptDocument(d: ApiDocument, index: number): TenderDocument {
  const name = (d.name ?? '').trim() || `Tender document ${index + 1}`;
  return {
    id: String(d.id ?? `doc-${index}`),
    name,
    fileType: deriveFileType(d.fileType, name),
    // Always 0 upstream. Kept as-is rather than invented; the detail view
    // already suppresses the size line when it is falsy.
    sizeBytes: Number(d.sizeBytes) || 0,
    updatedAt: d.updatedAt ?? '',
    url: d.url ?? '',
    isAddendum: Boolean(d.isAddendum) || /addend|amend|errat|corrig|addendum/i.test(name),
  };
}

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

/**
 * The feed supplies contacts twice: nested under `contactInformation` and flat
 * in `contactName` / `contactEmail` / `contactPhone`. Prefer nested, fall back
 * to flat. Returns null only when there is genuinely nobody to contact.
 */
export function adaptContact(t: ApiTender): ContactInformation | null {
  const nested: ApiContactInformation | null = t.contactInformation ?? null;
  const person = (nested?.name ?? t.contactName ?? '').trim() || null;
  const email = (nested?.email ?? t.contactEmail ?? '').trim() || null;
  const phone = (nested?.telephone ?? t.contactPhone ?? '').trim() || null;
  if (!person && !email && !phone) return null;
  return {
    // Not published by this feed. Never guessed from the organisation name.
    department: null,
    contactPerson: person,
    email,
    phone,
  };
}

// ---------------------------------------------------------------------------
// Source URL
// ---------------------------------------------------------------------------

/**
 * Repair broken eTenders links. `/tender/{id}` does not exist on the portal;
 * the live opportunities list does, so degrade to that rather than 404.
 */
export function deriveSourceUrl(t: Pick<ApiTender, 'sourceUrl' | 'tenderNumber'>): string | null {
  const url = t.sourceUrl?.trim();
  if (!url) return 'https://www.etenders.gov.za/Home/opportunities';
  if (/etenders\.gov\.za\/tender\b/i.test(url) || /\/tender\/\d+/i.test(url)) {
    return 'https://www.etenders.gov.za/Home/opportunities';
  }
  return url;
}

// ---------------------------------------------------------------------------
// Lifecycle status
// ---------------------------------------------------------------------------

const LIFECYCLE: ApiLifecycleStatus[] = ['active', 'complete', 'cancelled'];

export function deriveLifecycle(status: string | null | undefined): ApiLifecycleStatus | null {
  const s = status?.trim().toLowerCase();
  if (!s) return null;
  return (LIFECYCLE as string[]).includes(s) ? (s as ApiLifecycleStatus) : s;
}

// ---------------------------------------------------------------------------
// Main mappers
// ---------------------------------------------------------------------------

export function adaptTender(t: ApiTender): Tender {
  const subject = `${t.title ?? ''} ${t.description ?? ''}`;
  return {
    id: String(t.id),
    tenderNumber: (t.tenderNumber ?? '').trim() || String(t.id),
    title: deriveTitle(t),
    description: (t.description ?? '').trim(),
    organisation: (t.organisation ?? '').trim() || 'Unknown organisation',
    category: deriveCategory(t.category, subject),
    // Verbatim upstream category — what the API filters on, and what the
    // detail screen shows for precision.
    categoryRaw: (t.category ?? '').trim() || 'Uncategorised',
    province: deriveProvince(t),
    location: deriveLocation(t),
    // Verbatim eTenders address, for the detail screen.
    locationFull: (t.location ?? '').trim() || null,
    // Passed through, never fabricated. Always null in the current feed, which
    // the UI renders as "Not disclosed".
    valueCents: typeof t.valueCents === 'number' ? t.valueCents : null,
    publishedDate: t.publishedDate ?? t.firstSeenAt ?? '',
    closingDate: t.closingDate ?? '',
    sourceUrl: deriveSourceUrl(t),
    documents: (t.documents ?? []).map(adaptDocument),
    contactInformation: adaptContact(t),
    lifecycleStatus: deriveLifecycle(t.status),
    cidbGrade: t.cidbGrade ?? null,
    firstSeenAt: t.firstSeenAt ?? null,
  };
}

/**
 * Upstream always returns `isSaved: false` and `matchScore: null` because it
 * has no concept of our Supabase user. `state` lets the saved-tenders layer
 * overwrite them; without it the defaults are the honest ones.
 */
export function adaptTenderWithState(
  t: ApiTender,
  state?: { isSaved?: boolean; savedAt?: string | null; matchScore?: number | null },
): TenderWithUserState {
  return {
    ...adaptTender(t),
    isSaved: state?.isSaved ?? Boolean(t.isSaved),
    savedAt: state?.savedAt ?? t.savedAt ?? null,
    matchScore: state?.matchScore ?? t.matchScore ?? null,
  };
}

export interface AdaptedAmendment {
  id: string;
  field: string;
  from: string | null;
  to: string | null;
  detectedAt: string;
}

export function adaptDetail(
  res: ApiTenderDetail,
  state?: { isSaved?: boolean; savedAt?: string | null },
): TenderWithUserState & { amendments: AdaptedAmendment[] } {
  return {
    ...adaptTenderWithState(res, state),
    // Shape is undocumented and empty in every sampled record, so read
    // defensively rather than assuming the old snake_case amendment contract.
    amendments: (res.amendments ?? []).map((a, i) => ({
      id: String(a.id ?? `amendment-${i}`),
      field: String(a.field ?? a.field_changed ?? 'Record'),
      from: (a.from ?? a.old_value ?? null) as string | null,
      to: (a.to ?? a.new_value ?? null) as string | null,
      detectedAt: String(a.detectedAt ?? a.detected_at ?? ''),
    })),
  };
}

/** `/categories` -> facet list annotated with the app grouping. */
export function adaptCategories(res: ApiCategoriesResponse) {
  return (res.categories ?? []).map((c) => ({
    name: c.category,
    count: c.count,
    group: deriveCategory(c.category),
  }));
}

/** `/provinces` -> facet list, unknown names dropped rather than mangled. */
export function adaptProvinces(res: ApiProvincesResponse) {
  return (res.provinces ?? [])
    .map((p) => ({ name: p.province, count: p.count }))
    .filter((p) => PROVINCES.includes(p.name as Province));
}
