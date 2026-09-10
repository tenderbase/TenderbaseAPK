import { daysUntil, formatDate, formatValueFull } from '@/lib/format';
import type { Tender } from '@/types/tender';

/**
 * Notice-derived analysis — the honest core of the AI Summary panel.
 *
 * The real AI engine arrives in a later wiring phase. Until then every line
 * this module produces is a TRUE statement about the published notice
 * (deadline language, dates, documents, value, amendments, contact). The UI
 * shows these next to clearly-marked "AI release" rows for what the engine
 * will later add — no fabricated analysis, no black box.
 *
 * Pure module: testable from plain Node via the @/ resolver (register.mjs).
 */

export type NoticeBulletIcon = 'clock' | 'calendar' | 'pin' | 'file' | 'tag' | 'mail';

export interface NoticeBullet {
  icon: NoticeBulletIcon;
  text: string;
}

export interface NoticeRiskFlag {
  severity: 'red' | 'amber' | 'none';
  text: string;
}

/** "today / tomorrow / in N days / Closed" — the app's heartbeat language. */
export function closingWord(iso: string, now: Date = new Date()): string {
  const d = daysUntil(iso, now);
  if (d < 0) return 'Closed';
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  return `in ${d} days`;
}

/** Real, verifiable facts from the notice — the quick-summary anchor. */
export function quickSummaryBullets(
  tender: Pick<
    Tender,
    | 'closingDate'
    | 'publishedDate'
    | 'location'
    | 'locationFull'
    | 'valueCents'
    | 'documents'
    | 'contactInformation'
  >,
  now: Date = new Date(),
): NoticeBullet[] {
  const bullets: NoticeBullet[] = [];

  if (tender.closingDate) {
    const word = closingWord(tender.closingDate, now);
    const date = formatDate(tender.closingDate);
    bullets.push({
      icon: 'clock',
      text: word === 'Closed' ? `Closed on ${date}` : `Closes ${word} — ${date}`,
    });
  } else {
    bullets.push({ icon: 'clock', text: 'Closing date not stated on the notice' });
  }

  if (tender.publishedDate) {
    bullets.push({
      icon: 'calendar',
      text: `Published ${formatDate(tender.publishedDate)}`,
    });
  }

  bullets.push({
    icon: 'pin',
    text: tender.locationFull ?? tender.location ?? 'Location not stated',
  });

  const n = tender.documents.length;
  const addenda = tender.documents.filter((d) => d.isAddendum).length;
  bullets.push({
    icon: 'file',
    text:
      n === 0
        ? 'No documents published yet'
        : `${n} document${n === 1 ? '' : 's'} in the pack${
            addenda > 0 ? ` · ${addenda} amended` : ''
          }`,
  });

  bullets.push({
    icon: 'tag',
    text:
      tender.valueCents === null
        ? 'Value not disclosed by the issuer'
        : `Estimated value ${formatValueFull(tender.valueCents)}`,
  });

  const c = tender.contactInformation;
  if (c && (c.email || c.phone || c.contactPerson)) {
    bullets.push({ icon: 'mail', text: 'Issuer contact published — see Contact below' });
  }

  return bullets;
}

/**
 * Risk flags that are true today, straight from the notice fields. When the
 * engine lands it deepens this list from the documents themselves.
 */
export function noticeRiskFlags(
  tender: Pick<
    Tender,
    'closingDate' | 'valueCents' | 'documents' | 'lifecycleStatus'
  >,
  amendmentCount: number,
  now: Date = new Date(),
): NoticeRiskFlag[] {
  const flags: NoticeRiskFlag[] = [];

  const cancelled = tender.lifecycleStatus?.toLowerCase() === 'cancelled';
  if (cancelled) {
    flags.push({ severity: 'red', text: 'Cancelled — do not bid' });
    return flags;
  }

  if (tender.closingDate) {
    const d = daysUntil(tender.closingDate, now);
    if (d < 0) {
      flags.push({ severity: 'red', text: 'Closing date has passed' });
    } else if (d <= 1) {
      flags.push({
        severity: 'red',
        text: d === 0 ? 'Very short window — closes today' : 'Very short window — closes tomorrow',
      });
    } else if (d <= 5) {
      flags.push({ severity: 'amber', text: `Short window — closes in ${d} days` });
    }
  }

  if (amendmentCount > 0) {
    flags.push({
      severity: 'amber',
      text: `Amended ${amendmentCount}× — confirm you are pricing the latest documents`,
    });
  }

  if (tender.valueCents === null) {
    flags.push({ severity: 'amber', text: 'Value not disclosed — no budget anchor' });
  }

  if (tender.documents.length === 0) {
    flags.push({ severity: 'amber', text: 'No documents published yet' });
  }

  if (flags.length === 0) {
    flags.push({ severity: 'none', text: 'No notice-level risk flags' });
  }
  return flags;
}

/** Generic diligence starters — safe to ask of any issuer, no invention. */
export function starterQuestions(): string[] {
  return [
    'What is the exact submission format, and where does it open?',
    'Will questions asked in writing be answered in writing for all bidders?',
    'Which evaluation criteria carry the most weight?',
  ];
}
