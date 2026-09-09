import type { LifecycleStatus, Tender, TenderStatus } from '@/types/tender';

/** R2.4M / R850k / R1 250 — compact ZAR for cards. */
export function formatValue(valueCents: number | null): string {
  if (valueCents === null) return 'Not disclosed';
  const rand = valueCents / 100;
  if (rand >= 1_000_000) {
    const m = rand / 1_000_000;
    return `R${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`;
  }
  if (rand >= 1_000) return `R${Math.round(rand / 1_000)}k`;
  return `R${rand.toFixed(0)}`;
}

/** Full currency for detail screens: R2 400 000 */
export function formatValueFull(valueCents: number | null): string {
  if (valueCents === null) return 'Not disclosed';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}

/**
 * Deterministic month names.
 *
 * Intl is NOT usable here: Node's full-ICU renders September as "Sept" (4
 * chars) for en-GB *and* en-ZA, while browser Chromium renders "Sep". That
 * split produced hydration mismatches and broke the card layout once dates
 * started being formatted on the server. Hardcoding is the only stable option.
 */
const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

/** 12 Sep 2026 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not stated';
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${day} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** 12 September 2026 */
export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not stated';
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Whole days from now until the closing date. Negative once closed. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const close = new Date(iso);
  const end = Date.UTC(close.getFullYear(), close.getMonth(), close.getDate());
  return Math.round((end - start) / 86_400_000);
}

/**
 * Status is DERIVED, never stored, so the badge, deadline pill and accent bar
 * can never disagree with each other or go stale in cache.
 *
 * Two inputs:
 *  1. `lifecycleStatus` from the ingestion API wins when it says the process
 *     ended. A cancelled tender with a future closing date must not render as
 *     "Open" — bidders spend real money preparing responses to those.
 *  2. Otherwise the closing date decides:
 *     <0 closed | <=2 urgent | <=7 closing soon | else open
 *
 * `lifecycleStatus` is optional, so callers passing a bare `{ closingDate }`
 * still typecheck and get pure date derivation.
 */
export function getStatus(
  tender: Pick<Tender, 'closingDate'> & { lifecycleStatus?: LifecycleStatus | null },
  now?: Date,
): TenderStatus {
  const lifecycle = tender.lifecycleStatus?.toLowerCase();
  if (lifecycle === 'cancelled') return 'cancelled';
  if (lifecycle === 'complete') return 'closed';

  const d = daysUntil(tender.closingDate, now);
  if (d < 0) return 'closed';
  if (d <= 2) return 'urgent';
  if (d <= 7) return 'closing_soon';
  return 'open';
}

/** 'Closes today' | 'Closes in 3 days' | '10 days left' | 'Closed' | 'Cancelled' */
export function formatDeadline(
  iso: string,
  now?: Date,
  lifecycle?: LifecycleStatus | null,
): string {
  if (lifecycle?.toLowerCase() === 'cancelled') return 'Cancelled';
  const d = daysUntil(iso, now);
  if (d < 0) return 'Closed';
  if (d === 0) return 'Closes today';
  if (d === 1) return 'Closes tomorrow';
  if (d <= 7) return `Closes in ${d} days`;
  return `${d} days left`;
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

/** '2h ago' | 'Yesterday' | '28 Aug' */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatDate(iso).replace(/ \d{4}$/, '');
}

/**
 * The eTenders feed publishes many descriptions in full capitals. Rendering
 * them verbatim looks like shouting and wrecks line-length; convert to
 * sentence case while preserving deliberately mixed-case text.
 */
export function normaliseCase(text: string): string {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (letters.length === 0) return text;
  const upperRatio =
    letters.split('').filter((c) => c === c.toUpperCase()).length / letters.length;
  if (upperRatio < 0.7) return text;

  return text
    .toLowerCase()
    .replace(/(^\s*\w|[.!?]\s+\w|\n\s*\w)/g, (m) => m.toUpperCase())
    .replace(
      /\b(sa|rsa|kzn|it|ict|hiv|aids|ppe|grap|sbd|cidb|bbbee|b-bbee|vat|rfq|rfp|rfi|sme|smme|nda|eskom|sanral|prasa|transnet|sars|tvet|gps|cctv|hvac|led|pvc|popia|nec3|ecc)\b/gi,
      (m) => m.toUpperCase(),
    );
}
