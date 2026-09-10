import type { Tender } from '@/types/tender';

/**
 * Client-side calendar export (blueprint §5.5: "Add to calendar" (Pro)).
 * Pure ICS builder — the component layer only wires the Blob download, so
 * this module stays unit-testable from plain Node.
 */

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/** yyyyMMdd'T'HHmmss'Z' — UTC, the only timezone-free ICS form. */
function icsStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export interface CalendarExport {
  fileName: string;
  ics: string;
}

/**
 * A one-hour "Closing" event anchored on the tender's closing instant.
 * Returns null when the closing date cannot be parsed (honest no-op —
 * the UI simply doesn't offer the action then).
 */
export function buildTenderIcs(
  tender: Pick<Tender, 'id' | 'tenderNumber' | 'title' | 'organisation' | 'closingDate' | 'sourceUrl'>,
): CalendarExport | null {
  const startMs = Date.parse(tender.closingDate);
  if (!Number.isFinite(startMs)) return null;
  const start = new Date(startMs);
  const end = new Date(startMs + 60 * 60 * 1000);

  const summary = `Closing: ${tender.title}`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TenderBase//Tender closing//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:closing-${tender.id}@tenderbase.app`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(
      [
        `Tender number: ${tender.tenderNumber}`,
        `Issuer: ${tender.organisation}`,
        `Source: ${tender.sourceUrl ?? 'eTenders portal'}`,
        'Added from TenderBase — one-hour reminder before this tender closes.',
      ].join('\n'),
    )}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ];

  return {
    fileName: `tenderbase-${tender.id}.ics`,
    ics: lines.join('\r\n'),
  };
}
