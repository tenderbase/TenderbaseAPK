import type {
  ApiDocument,
  ApiFacets,
  ApiTender,
  ApiTenderDetail,
} from '@/types/api';
import type {
  Category,
  Province,
  Tender,
  TenderDocument,
  TenderWithUserState,
} from '@/types/tender';

/**
 * Anti-corruption layer: upstream eTenders payloads -> TenderBase domain model.
 *
 * The live feed is messier than the OpenAPI schema suggests. Every transform
 * below exists because of a measured defect in a 300-record sample, documented
 * inline so nobody "simplifies" it back into a bug.
 */

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

/** Codes like "20/2026 LLM", "E3445GCDMWP", "BPDM/SCM/BTO/T/39/2026/27". */
function looksLikeReferenceCode(s: string): boolean {
  const t = s.trim();
  if (t.length < 25 && /[0-9]/.test(t) && t.split(' ').length <= 4) return true;
  if (/^[A-Z0-9][A-Z0-9\/\-.\s]*$/.test(t) && t.split(' ').length <= 3) return true;
  return false;
}

function toSentenceCase(s: string): string {
  // The feed is full of ALL-CAPS entries; shouting breaks the card layout.
  const letters = s.replace(/[^A-Za-z]/g, '');
  const upperRatio =
    letters.length === 0
      ? 0
      : letters.split('').filter((c) => c === c.toUpperCase()).length / letters.length;
  if (upperRatio < 0.7) return s;

  return s
    .toLowerCase()
    .replace(/(^\w|[.!?]\s+\w)/g, (m) => m.toUpperCase())
    // Restore common SA procurement acronyms and proper nouns.
    .replace(
      /\b(sa|rsa|kzn|it|ict|hiv|aids|ppe|grap|sbd|cidb|bbbee|b-bbee|vat|rfq|rfp|rfi|sme|smme|nda|eskom|sanral|prasa|transnet|sars|dut|ukzn|tvet|gps|cctv|hvac|led|pvc|4x4)\b/gi,
      (m) => m.toUpperCase(),
    );
}

function truncateAtWord(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const i = cut.lastIndexOf(' ');
  return `${(i > max * 0.6 ? cut.slice(0, i) : cut).replace(/[,;:.\-\s]+$/, '')}…`;
}

/**
 * ~90% of live records put a reference code in `title` and the readable
 * subject in `description`. Prefer the description when the title is a code.
 */
export function deriveTitle(t: Pick<ApiTender, 'title' | 'description'>): string {
  const raw = (t.title ?? '').trim();
  const desc = (t.description ?? '').trim();

  if (raw && !looksLikeReferenceCode(raw)) return truncateAtWord(toSentenceCase(raw), 120);
  if (desc.length > 10) {
    const firstSentence = desc.split(/(?<=[.!?])\s+/)[0] ?? desc;
    return truncateAtWord(toSentenceCase(firstSentence), 120);
  }
  return raw || 'Untitled tender';
}

// ---------------------------------------------------------------------------
// Province — 59% of live records have province === null
// ---------------------------------------------------------------------------

const PROVINCE_ALIASES: Record<string, Province> = {
  'kwazulu-natal': 'KwaZulu-Natal',
  'kwazulu natal': 'KwaZulu-Natal',
  kzn: 'KwaZulu-Natal',
  gauteng: 'Gauteng',
  'western cape': 'Western Cape',
  'eastern cape': 'Eastern Cape',
  'free state': 'Free State',
  limpopo: 'Limpopo',
  mpumalanga: 'Mpumalanga',
  'north west': 'North West',
  'north-west': 'North West',
  'northern cape': 'Northern Cape',
};

/** City/authority hints used to recover a province when the field is null. */
const LOCALITY_HINTS: [RegExp, Province][] = [
  [/\b(durban|ethekwini|pietermaritzburg|newcastle|richards bay|umgungundlovu|zululand|ugu|ilembe|msunduzi|kwazulu)/i, 'KwaZulu-Natal'],
  [/\b(johannesburg|pretoria|tshwane|ekurhuleni|soweto|sedibeng|west rand|gauteng|midrand|sandton)/i, 'Gauteng'],
  [/\b(cape town|stellenbosch|george|paarl|worcester|overberg|winelands|western cape|drakenstein|swartland)/i, 'Western Cape'],
  [/\b(gqeberha|port elizabeth|east london|mthatha|buffalo city|nelson mandela bay|amathole|chris hani|eastern cape)/i, 'Eastern Cape'],
  [/\b(bloemfontein|mangaung|welkom|lejweleputswa|free state|fezile dabi|thabo mofutsanyana)/i, 'Free State'],
  [/\b(polokwane|limpopo|vhembe|capricorn|mopani|waterberg|sekhukhune|tzaneen)/i, 'Limpopo'],
  [/\b(mbombela|nelspruit|mpumalanga|ehlanzeni|gert sibande|nkangala|witbank|emalahleni|secunda|kusile)/i, 'Mpumalanga'],
  [/\b(mahikeng|mafikeng|rustenburg|north west|bojanala|dr kenneth kaunda|ngaka modiri)/i, 'North West'],
  [/\b(kimberley|northern cape|frances baard|zf mgcawu|namakwa|pixley ka seme|upington)/i, 'Northern Cape'],
];

/**
 * Returns null rather than guessing wildly — the UI shows "Location not
 * specified", which is honest. A wrong province is worse than a missing one
 * because contractors filter on it.
 */
export function deriveProvince(t: Pick<ApiTender, 'province' | 'municipality' | 'organisation' | 'description'>): Province | null {
  const direct = t.province?.trim().toLowerCase();
  if (direct) {
    if (direct === 'national') return null; // National is a scope, not a province.
    const hit = PROVINCE_ALIASES[direct];
    if (hit) return hit;
  }
  const haystack = [t.municipality, t.organisation, t.description].filter(Boolean).join(' ');
  for (const [re, prov] of LOCALITY_HINTS) if (re.test(haystack)) return prov;
  return null;
}

/** True when province came back as the special "National" scope. */
export function isNational(t: Pick<ApiTender, 'province'>): boolean {
  return t.province?.trim().toLowerCase() === 'national';
}

export function deriveLocation(t: ApiTender): string {
  const prov = deriveProvince(t);
  const muni = t.municipality?.trim();
  if (muni && prov) return `${muni}, ${prov}`;
  if (prov) return prov;
  if (isNational(t)) return 'National';
  return 'Location not specified';
}

// ---------------------------------------------------------------------------
// Category — upstream taxonomy differs from the app's original enum
// ---------------------------------------------------------------------------

const CATEGORY_MAP: Record<string, Category> = {
  construction: 'Construction',
  'civil works': 'Construction',
  'information technology': 'IT & Technology',
  security: 'Security',
  cleaning: 'Cleaning',
  transport: 'Transport',
  vehicles: 'Transport',
  'professional services': 'Professional Services',
  supplies: 'Supply & Delivery',
  furniture: 'Supply & Delivery',
  medical: 'Healthcare',
  engineering: 'Engineering',
  electrical: 'Engineering',
  consulting: 'Consulting',
  training: 'Professional Services',
  agriculture: 'Agriculture',
  other: 'Other',
};

export function deriveCategory(t: Pick<ApiTender, 'category' | 'categories'>): Category {
  const direct = t.category?.trim().toLowerCase();
  if (direct && CATEGORY_MAP[direct]) return CATEGORY_MAP[direct];
  for (const c of t.categories ?? []) {
    const key = c.replace(/-/g, ' ').toLowerCase();
    if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  }
  return 'Other';
}

// ---------------------------------------------------------------------------
// Dates & documents
// ---------------------------------------------------------------------------

export function deriveClosingDate(t: ApiTender): string | null {
  if (t.closing_at) return t.closing_at;
  if (t.closing_date) {
    const time = t.closing_time ?? '12:00:00'; // eTenders convention.
    return `${t.closing_date}T${time}Z`;
  }
  return null;
}

const MIME_LABEL: Record<string, string> = {
  pdf: 'PDF', zip: 'ZIP', doc: 'DOC', docx: 'DOCX', xls: 'XLS', xlsx: 'XLSX',
};

function cleanDocumentName(d: ApiDocument, index: number): string {
  const raw = (d.title ?? d.filename ?? '').trim();
  // Filenames arrive as URL fragments: "Download?blobName=4b61…&downloadedFileName=X.pdf"
  const fromQuery = /downloadedFileName=([^&]+)/i.exec(raw)?.[1];
  const candidate = fromQuery ? decodeURIComponent(fromQuery) : raw;
  const name = candidate.replace(/^Download\?.*$/i, '').trim();
  return name || `Tender document ${index + 1}`;
}

export function adaptDocument(d: ApiDocument, index: number): TenderDocument {
  const name = cleanDocumentName(d, index);
  const ext = (d.mime_type ?? name.split('.').pop() ?? '').toLowerCase();
  return {
    id: String(d.id),
    name,
    fileType: MIME_LABEL[ext] ?? (ext ? ext.toUpperCase() : 'FILE'),
    sizeBytes: d.file_size ?? 0,
    updatedAt: '',
    url: d.url,
    isAddendum: /addend|amend|errat|corrig/i.test(name) || d.type === 'addendum',
  };
}

/**
 * Fix broken eTenders URLs from upstream feeds (e.g. "https://www.etenders.gov.za/tender/169382").
 * eTenders does not have a /tender/{id} route; the live opportunities portal is /Home/opportunities.
 */
export function deriveSourceUrl(t: Pick<ApiTender, 'source_url'>): string | null {
  const url = t.source_url?.trim();
  if (!url) return 'https://www.etenders.gov.za/Home/opportunities';

  if (/etenders\.gov\.za\/tender\b/i.test(url) || /\/tender\/\d+/i.test(url)) {
    return 'https://www.etenders.gov.za/Home/opportunities';
  }

  return url;
}

// ---------------------------------------------------------------------------
// Main mappers
// ---------------------------------------------------------------------------

export function adaptTender(t: ApiTender): Tender {
  return {
    id: String(t.id),
    tenderNumber: t.tender_number ?? t.ocid ?? String(t.id),
    title: deriveTitle(t),
    description: (t.description ?? '').trim(),
    organisation: t.organisation?.trim() || 'Unknown organisation',
    category: deriveCategory(t),
    // Province is non-nullable in the domain model; 'National' is the honest
    // fallback for the 59% of records with no province.
    province: (deriveProvince(t) ?? 'National') as Province,
    location: deriveLocation(t),
    // The API exposes NO monetary field. Never fabricate one — the UI already
    // renders null as "Not disclosed".
    valueCents: null,
    publishedDate: t.advertised_date ?? '',
    closingDate: deriveClosingDate(t) ?? '',
    sourceUrl: deriveSourceUrl(t),
    documents: (t.documents ?? []).map(adaptDocument),
    contactInformation: null, // Not supplied by the eTenders OCDS feed.
  };
}

export function adaptTenderWithState(
  t: ApiTender,
  state?: { isSaved?: boolean; savedAt?: string | null },
): TenderWithUserState {
  return {
    ...adaptTender(t),
    isSaved: state?.isSaved ?? false,
    savedAt: state?.savedAt ?? null,
    // AI matching is not part of this API. null hides the badge entirely
    // rather than inventing a score.
    matchScore: null,
  };
}

export function adaptDetail(t: ApiTenderDetail): TenderWithUserState & {
  amendments: { id: string; field: string; from: string | null; to: string | null; detectedAt: string }[];
} {
  return {
    ...adaptTenderWithState(t),
    amendments: (t.amendments ?? []).map((a) => ({
      id: String(a.id),
      field: a.field_changed,
      from: a.old_value,
      to: a.new_value,
      detectedAt: a.detected_at,
    })),
  };
}

export function adaptFacets(f: ApiFacets) {
  return {
    provinces: f.provinces ?? [],
    categories: (f.categories ?? []).map((c) => ({
      ...c,
      label: CATEGORY_MAP[c.name.toLowerCase()] ?? c.name,
    })),
    sources: f.sources ?? [],
  };
}
