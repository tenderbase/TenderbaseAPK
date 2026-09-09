/**
 * Company profile — the bidder's own details.
 *
 * These fields exist because South African tenders require them: a CSD number
 * is mandatory for any organ of state, CIDB grading gates construction work,
 * and B-BBEE level drives preference points under the 80/20 and 90/10 systems.
 * Nothing here is decorative.
 */

export const COMPANY_TYPES = [
  'Private Company (Pty) Ltd',
  'Close Corporation (CC)',
  'Sole Proprietor',
  'Partnership',
  'Public Company (Ltd)',
  'Non-Profit Company (NPC)',
  'Co-operative',
  'Trust',
] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

/** B-BBEE contributor levels. 1 is the strongest; 8 is the weakest compliant. */
export const BBBEE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type BbbeeLevel = (typeof BBBEE_LEVELS)[number];

/**
 * CIDB contractor grading. The number is financial capability (1 = up to
 * R200k, 9 = unlimited); the letters are the class of works.
 */
export const CIDB_CLASSES = [
  'GB', 'CE', 'EB', 'EP', 'ME', 'SB', 'SC', 'SD', 'SE', 'SF',
  'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SQ',
] as const;

export interface CompanyProfile {
  // Identity
  legalName: string;
  tradingName: string | null;
  companyType: CompanyType | null;

  // Registration
  registrationNumber: string | null;
  vatNumber: string | null;
  csdNumber: string | null;
  taxClearanceExpiry: string | null;

  // Compliance
  bbbeeLevel: BbbeeLevel | null;
  bbbeeExpiry: string | null;
  cidbGrading: string | null;

  // Contact
  contactPerson: string | null;
  email: string | null;
  phone: string | null;

  // Address
  addressLine: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;

  updatedAt: string;
}

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  legalName: '',
  tradingName: null,
  companyType: null,
  registrationNumber: null,
  vatNumber: null,
  csdNumber: null,
  taxClearanceExpiry: null,
  bbbeeLevel: null,
  bbbeeExpiry: null,
  cidbGrading: null,
  contactPerson: null,
  email: null,
  phone: null,
  addressLine: null,
  city: null,
  province: null,
  postalCode: null,
  updatedAt: new Date(0).toISOString(),
};

// ---------------------------------------------------------------------------
// Validation — formats are defined by CIPC, SARS and the National Treasury
// ---------------------------------------------------------------------------

export type FieldErrors = Partial<Record<keyof CompanyProfile, string>>;

/** CIPC company registration: YYYY/NNNNNN/NN (e.g. 2018/443921/07). */
export function validateRegistrationNumber(v: string): string | null {
  if (!/^\d{4}\/\d{6}\/\d{2}$/.test(v.trim())) {
    return 'Use the CIPC format YYYY/NNNNNN/NN, e.g. 2018/443921/07';
  }
  const year = Number(v.slice(0, 4));
  const thisYear = new Date().getFullYear();
  if (year < 1900 || year > thisYear) return `Registration year must be between 1900 and ${thisYear}`;
  return null;
}

/** SARS VAT numbers are 10 digits and always begin with 4. */
export function validateVatNumber(v: string): string | null {
  const digits = v.replace(/\s/g, '');
  if (!/^\d{10}$/.test(digits)) return 'A VAT number is 10 digits';
  if (!digits.startsWith('4')) return 'South African VAT numbers start with 4';
  return null;
}

/** Central Supplier Database: MAAA followed by 7 digits. */
export function validateCsdNumber(v: string): string | null {
  if (!/^MAAA\d{7}$/i.test(v.trim())) {
    return 'Use the CSD format MAAA0000000';
  }
  return null;
}

/** CIDB grading: 1–9 then a works class, e.g. 6GB or 3CE PE. */
export function validateCidbGrading(v: string): string | null {
  const m = /^([1-9])\s*([A-Z]{2})\s*(PE|SO)?$/i.exec(v.trim());
  if (!m) return 'Use a grade and class, e.g. 6GB or 3CE PE';
  if (!CIDB_CLASSES.includes(m[2].toUpperCase() as (typeof CIDB_CLASSES)[number])) {
    return `Unknown class "${m[2].toUpperCase()}"`;
  }
  return null;
}

export function validateEmail(v: string): string | null {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? null : 'Enter a valid email address';
}

/** Accepts 0XX XXX XXXX or +27 XX XXX XXXX. */
export function validatePhone(v: string): string | null {
  const digits = v.replace(/[\s()-]/g, '');
  if (/^0\d{9}$/.test(digits)) return null;
  if (/^\+27\d{9}$/.test(digits)) return null;
  return 'Use 031 502 8841 or +27 31 502 8841';
}

export function validatePostalCode(v: string): string | null {
  return /^\d{4}$/.test(v.trim()) ? null : 'South African postal codes are 4 digits';
}

export function validateDate(v: string): string | null {
  return Number.isNaN(new Date(v).getTime()) ? 'Enter a valid date' : null;
}

/** Validates the whole profile. Empty optional fields are never errors. */
export function validateCompanyProfile(p: CompanyProfile): FieldErrors {
  const errors: FieldErrors = {};
  const check = (
    key: keyof CompanyProfile,
    value: string | null,
    fn: (v: string) => string | null,
  ) => {
    if (!value || !value.trim()) return;
    const err = fn(value);
    if (err) errors[key] = err;
  };

  if (!p.legalName.trim()) {
    errors.legalName = 'Registered company name is required';
  } else if (p.legalName.trim().length < 2) {
    errors.legalName = 'Enter the full registered name';
  }

  check('registrationNumber', p.registrationNumber, validateRegistrationNumber);
  check('vatNumber', p.vatNumber, validateVatNumber);
  check('csdNumber', p.csdNumber, validateCsdNumber);
  check('cidbGrading', p.cidbGrading, validateCidbGrading);
  check('email', p.email, validateEmail);
  check('phone', p.phone, validatePhone);
  check('postalCode', p.postalCode, validatePostalCode);
  check('taxClearanceExpiry', p.taxClearanceExpiry, validateDate);
  check('bbbeeExpiry', p.bbbeeExpiry, validateDate);

  return errors;
}

// ---------------------------------------------------------------------------
// Completeness & document expiry
// ---------------------------------------------------------------------------

/**
 * Fields that materially affect whether a bid is accepted. Weighted, because
 * a missing CSD number is disqualifying while a missing trading name is not.
 */
export const COMPLETENESS_FIELDS: { key: keyof CompanyProfile; label: string; weight: number }[] = [
  { key: 'legalName', label: 'Registered name', weight: 2 },
  { key: 'companyType', label: 'Company type', weight: 1 },
  { key: 'registrationNumber', label: 'Registration number', weight: 2 },
  { key: 'csdNumber', label: 'CSD number', weight: 3 },
  { key: 'taxClearanceExpiry', label: 'Tax clearance', weight: 3 },
  { key: 'bbbeeLevel', label: 'B-BBEE level', weight: 2 },
  { key: 'cidbGrading', label: 'CIDB grading', weight: 1 },
  { key: 'vatNumber', label: 'VAT number', weight: 1 },
  { key: 'contactPerson', label: 'Contact person', weight: 1 },
  { key: 'email', label: 'Email address', weight: 1 },
  { key: 'phone', label: 'Phone number', weight: 1 },
  { key: 'city', label: 'City', weight: 1 },
  { key: 'province', label: 'Province', weight: 1 },
];

export interface Completeness {
  percent: number;
  missing: { key: keyof CompanyProfile; label: string }[];
}

export function calculateCompleteness(p: CompanyProfile): Completeness {
  let earned = 0;
  let total = 0;
  const missing: { key: keyof CompanyProfile; label: string }[] = [];

  for (const { key, label, weight } of COMPLETENESS_FIELDS) {
    total += weight;
    const value = p[key];
    const filled = typeof value === 'string' ? value.trim().length > 0 : value !== null;
    if (filled) earned += weight;
    else missing.push({ key, label });
  }

  return { percent: Math.round((earned / total) * 100), missing };
}

export type ExpiryStatus = 'valid' | 'expiring' | 'expired' | 'missing';

/**
 * Compliance certificates expire, and an expired one disqualifies a bid.
 * "Expiring" starts at 30 days so there is time to renew.
 */
export function getExpiryStatus(iso: string | null, now = new Date()): ExpiryStatus {
  if (!iso) return 'missing';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'missing';

  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const end = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((end - start) / 86_400_000);

  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
}
