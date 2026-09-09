'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Share2, Bookmark, Building2, Check,
  FileText, History, Download, Mail, Phone, User, ExternalLink, Bell,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { StatusBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { DataSourceNotice } from '@/components/ui/DataSourceNotice';
import { AiSummaryPanel } from '@/components/tender/AiSummaryPanel';
import { TenderMatchRow } from '@/components/tender/TenderMatchRow';
import { CalendarAction } from '@/components/tender/CalendarAction';
import { FollowSheet } from '@/components/tender/FollowSheet';
import { useSavedTenders } from '@/lib/saved-store';
import { formatValue, formatDate, daysUntil, getStatus, normaliseCase } from '@/lib/format';
import type { DataSource } from '@/lib/tenders';
import type { TenderWithUserState } from '@/types/tender';

export interface Amendment {
  id: string;
  field: string;
  from: string | null;
  to: string | null;
  detectedAt: string;
}

function formatBytes(n: number): string | null {
  if (!n) return null;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function TenderDetailView({
  tender,
  amendments,
  source,
}: {
  tender: TenderWithUserState;
  amendments: Amendment[];
  source: DataSource;
}) {
  const router = useRouter();
  const { session, isSaved, toggleSaved } = useSavedTenders();
  const [copiedLink, setCopiedLink] = useState(false);
  const [followOpen, setFollowOpen] = useState(false);
  const saved = isSaved(tender.id);
  const signedIn = session.signedIn;
  const remaining = tender.closingDate ? daysUntil(tender.closingDate) : null;
  const status = getStatus(tender);

  const shareOrCopy = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: tender.title, url });
      } catch {
        /* user dismissed the share sheet — not an error */
      }
      return;
    }
    // No native share (older Android WebView, desktop): copy the link instead.
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* clipboard unavailable — nothing further to do */
    }
  };

  return (
    <main className="pb-[196px] md:pb-32">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-white px-4 py-2">
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] bg-canvas text-ink"
        >
          <ChevronLeft size={21} strokeWidth={1.75} aria-hidden />
        </button>
        <div className="flex gap-2.5">
          <button
            type="button"
            aria-label={copiedLink ? 'Link copied' : 'Share tender'}
            onClick={() => void shareOrCopy()}
            className={cn(
              'flex h-[38px] w-[38px] items-center justify-center rounded-[10px] transition-colors',
              copiedLink ? 'bg-open-bg text-open' : 'bg-canvas text-ink',
            )}
          >
            {copiedLink ? (
              <Check size={19} strokeWidth={2.2} aria-hidden />
            ) : (
              <Share2 size={19} strokeWidth={1.75} aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() => toggleSaved(tender)}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from saved' : 'Save tender'}
            className={cn(
              'flex h-[38px] w-[38px] items-center justify-center rounded-[10px]',
              saved ? 'bg-navy text-white' : 'bg-canvas text-ink',
            )}
          >
            <Bookmark size={19} strokeWidth={1.9} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        </div>
      </header>

      <div className="px-5">
        <DataSourceNotice source={source} />

        <div className="flex flex-wrap gap-1.5 pt-2">
          <StatusBadge status={status} />
          <CategoryBadge category={tender.category} />
          {amendments.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-[7px] bg-soon-bg px-2 py-[3px] text-micro font-semibold text-soon">
              <History size={11} strokeWidth={2.4} aria-hidden />
              Amended
            </span>
          )}
        </div>

        <h1 className="mt-2.5 text-[21.5px] font-bold leading-[27px] tracking-[-0.03em]">
          {tender.title}
        </h1>
        <p className="mt-2 flex items-start gap-1.5 text-[13.5px] text-ink-2">
          <Building2 size={16} strokeWidth={1.9} className="mt-0.5 shrink-0" aria-hidden />
          {tender.organisation}
        </p>

        <dl className="mt-3.5 flex rounded-lg bg-navy p-3.5 shadow-primary">
          <div className="flex-[1.15]">
            <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-blue-soft/70">CLOSING DATE</dt>
            <dd className="mt-1 text-[15px] font-bold tracking-[-0.02em] text-white">
              {tender.closingDate ? formatDate(tender.closingDate) : 'Not stated'}
            </dd>
          </div>
          <div className="mx-3 w-px bg-white/15" />
          <div className="flex-1">
            <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-blue-soft/70">DAYS LEFT</dt>
            <dd
              className={cn(
                'mt-1 text-[15px] font-bold tracking-[-0.02em]',
                remaining !== null && remaining <= 2 ? 'text-[#FF9B9B]' : 'text-[#F3B15C]',
              )}
            >
              {remaining === null ? '—' : remaining < 0 ? 'Closed' : `${remaining} days`}
            </dd>
          </div>
          <div className="mx-3 w-px bg-white/15" />
          <div className="flex-[1.1]">
            <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-blue-soft/70">VALUE</dt>
            <dd
              className={cn(
                'mt-1 font-bold tracking-[-0.02em] text-white',
                tender.valueCents === null ? 'text-[12.5px]' : 'text-[15px]',
              )}
            >
              {formatValue(tender.valueCents)}
            </dd>
          </div>
        </dl>

        {/* Hero actions: real calendar export (Pro) + the upstream portal. */}
        <div className="mt-2.5 flex gap-2">
          <CalendarAction tender={tender} />
          {tender.sourceUrl && (
            <a
              href={tender.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border border-line bg-white text-[13px] font-semibold text-ink"
            >
              View on eTenders
              <ExternalLink size={14} strokeWidth={2.1} aria-hidden />
            </a>
          )}
        </div>

        {/* Personalised match row (signed-in) — v0 scorer, every reason true. */}
        <TenderMatchRow tender={tender} />

        {/* The AI showcase module — real notice facts + labelled preview rows. */}
        <AiSummaryPanel tender={tender} amendments={amendments} />

        <dl className="mt-4 divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
          {([
            ['Tender Number', tender.tenderNumber],
            // Verbatim upstream category — the badge above shows the app's
            // coarse grouping, which would hide e.g. "Supplies: Medical".
            ['Category', tender.categoryRaw ?? tender.category],
            // Full eTenders address; the card-scale `location` is city+province.
            ['Location', tender.locationFull ?? tender.location],
            ['Published', tender.publishedDate ? formatDate(tender.publishedDate) : 'Not stated'],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 py-3">
              <dt className="shrink-0 text-[13.5px] text-ink-2">{k}</dt>
              <dd className="text-right text-[13.5px] font-semibold text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {tender.description && (
          <section className="mt-4">
            <h2 className="text-section font-semibold tracking-[-0.02em]">Description</h2>
            <p className="mt-2 whitespace-pre-line text-body text-ink-2">
              {normaliseCase(tender.description)}
            </p>
          </section>
        )}

        {/*
          Contact details are new with this feed — the previous one never
          supplied them, so `contactInformation` was hardcoded to null in the
          adapter. Rendered only when upstream actually published someone.
        */}
        {tender.contactInformation && (
          <section className="mt-4">
            <h2 className="mb-3 text-section font-semibold tracking-[-0.02em]">Contact</h2>
            <div className="divide-y divide-line rounded-[14px] border border-line bg-white px-3.5">
              {tender.contactInformation.contactPerson && (
                <div className="flex items-center gap-3 py-3">
                  <User size={16} strokeWidth={1.9} className="shrink-0 text-ink-3" aria-hidden />
                  <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink">
                    {tender.contactInformation.contactPerson}
                  </span>
                </div>
              )}
              {tender.contactInformation.email && (
                <a
                  href={`mailto:${tender.contactInformation.email}`}
                  className="flex items-center gap-3 py-3"
                >
                  <Mail size={16} strokeWidth={1.9} className="shrink-0 text-ink-3" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-blue">
                    {tender.contactInformation.email}
                  </span>
                </a>
              )}
              {tender.contactInformation.phone && (
                <a
                  href={`tel:${tender.contactInformation.phone.replace(/\s+/g, '')}`}
                  className="flex items-center gap-3 py-3"
                >
                  <Phone size={16} strokeWidth={1.9} className="shrink-0 text-ink-3" aria-hidden />
                  <span className="min-w-0 flex-1 text-[13.5px] font-medium text-ink">
                    {tender.contactInformation.phone}
                  </span>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Real documents from the eTenders feed */}
        <section className="mt-4">
          <h2 className="mb-3 text-section font-semibold tracking-[-0.02em]">
            Documents{' '}
            <span className="font-normal text-ink-3">({tender.documents.length})</span>
          </h2>
          {tender.documents.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-line px-3.5 py-4 text-center text-meta text-ink-3">
              No documents published for this tender.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {tender.documents.map((d) => {
                const size = formatBytes(d.sizeBytes);
                return (
                  <li key={d.id}>
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center gap-3 rounded-[14px] border border-line bg-white px-3.5 py-3 text-left"
                    >
                      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-canvas text-navy">
                        <FileText size={17} strokeWidth={2} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold tracking-[-0.015em]">
                          {d.name}
                        </span>
                        <span className="mt-px block text-caption text-ink-3">
                          {d.fileType}
                          {size ? ` · ${size}` : ''}
                          {d.isAddendum ? ' · Addendum' : ''}
                        </span>
                      </span>
                      <Download size={17} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {amendments.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-3 text-section font-semibold tracking-[-0.02em]">Amendments</h2>
            <ul className="space-y-2.5">
              {amendments.map((a) => (
                <li key={a.id} className="rounded-[14px] border border-soon/25 bg-soon-bg px-3.5 py-3">
                  <p className="text-[13.5px] font-semibold text-ink">{a.field} changed</p>
                  <p className="mt-1 text-caption text-ink-2">
                    {a.from ?? '—'} → <span className="font-semibold">{a.to ?? '—'}</span>
                  </p>
                  <p className="mt-1 text-micro text-ink-3">Detected {formatDate(a.detectedAt)}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Sticky actions: Save is real; Follow explains push honestly. */}
      <footer
        className={cn(
          'fixed inset-x-0 z-40 border-t border-line bg-white/95 backdrop-blur',
          'bottom-[calc(82px+env(safe-area-inset-bottom))] px-4 pb-3 pt-2.5',
          'md:bottom-0 md:left-60',
        )}
      >
        <div className="mx-auto flex max-w-3xl gap-2.5 md:max-w-5xl">
          {signedIn && (
            <button
              type="button"
              onClick={() => setFollowOpen(true)}
              className="flex h-[46px] flex-1 items-center justify-center gap-2 rounded-md border border-line bg-white text-[14.5px] font-semibold text-ink"
            >
              <Bell size={17} strokeWidth={1.9} aria-hidden />
              Follow
            </button>
          )}
          <button
            type="button"
            onClick={() => toggleSaved(tender)}
            aria-pressed={saved}
            className={cn(
              'flex h-[46px] flex-1 items-center justify-center gap-2 rounded-md text-[14.5px] font-semibold text-white transition-colors',
              saved ? 'bg-open' : 'bg-navy',
            )}
          >
            <Bookmark size={17} strokeWidth={2} fill={saved ? 'currentColor' : 'none'} aria-hidden />
            {saved ? 'Saved' : 'Save tender'}
          </button>
        </div>
      </footer>

      <FollowSheet
        open={followOpen}
        onClose={() => setFollowOpen(false)}
        tender={tender}
        saved={saved}
        onToggleSave={toggleSaved}
      />
    </main>
  );
}
