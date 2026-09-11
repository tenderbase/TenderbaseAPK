'use client';

import Link from 'next/link';
import { Building2, MapPin, Calendar, ChevronRight, Target } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatValue, formatDate, getStatus } from '@/lib/format';
import { StatusBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { DeadlineBadge } from '@/components/ui/DeadlineBadge';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import type { TenderWithUserState } from '@/types/tender';

export interface TenderCardProps {
  tender: TenderWithUserState;
  onToggleSave?: (id: string) => void;
  /** Hide the tender number on dense feeds like the dashboard. */
  showTenderNumber?: boolean;
  className?: string;
}

/**
 * The canonical tender card. Used on Dashboard, Search and any list surface.
 *
 * Structure: the whole card is one accessible link (an absolutely-positioned
 * overlay with a descriptive label) and the bookmark button is a SIBLING above
 * it — never nested inside the anchor, which would be invalid HTML and would
 * make keyboard/screen-reader behaviour unpredictable.
 */
export function TenderCard({
  tender,
  onToggleSave,
  showTenderNumber = true,
  className,
}: TenderCardProps) {
  const status = getStatus(tender);
  const closingLabel = formatDate(tender.closingDate);
  const fitScore = tender.matchScore == null ? null : Math.max(0, Math.min(100, Math.round(tender.matchScore)));

  return (
    <div
      className={cn(
        'relative rounded-lg border border-line bg-white p-3.5 shadow-card',
        'md:hover:border-blue-line',
        className,
      )}
    >
      <Link
        href={`/tenders/${tender.id}`}
        aria-label={`${tender.title}, ${tender.organisation}, closes ${closingLabel}`}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40"
      />

      <div className="pointer-events-none relative z-[1]" aria-hidden>
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <StatusBadge status={status} />
              <CategoryBadge category={tender.category} />
              {fitScore != null && (
                <span className="inline-flex items-center gap-1 rounded-md border border-ai-line bg-ai-bg px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.07em] text-ai">
                  <Target size={10} aria-hidden /> Fit {fitScore}%
                </span>
              )}
            </div>

            <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
              {tender.title}
            </h3>

            <p className="mt-1 flex items-center gap-1.5 text-meta text-ink-2">
              <Building2 size={14} strokeWidth={1.9} className="shrink-0" aria-hidden />
              {tender.organisation}
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
            <MapPin size={14} strokeWidth={1.9} className="shrink-0" aria-hidden />
            {tender.location}
          </span>
          <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
            <Calendar size={14} strokeWidth={1.9} className="shrink-0" aria-hidden />
            {closingLabel}
          </span>
        </div>

        {showTenderNumber && (
          <p className="mt-2 text-micro font-medium tabular-nums text-ink-3">{tender.tenderNumber}</p>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-bold tracking-[-0.02em] text-navy">
              {formatValue(tender.valueCents)}
            </span>
            <DeadlineBadge closingDate={tender.closingDate} lifecycleStatus={tender.lifecycleStatus} />
          </div>
          <span className="flex items-center gap-0.5 text-meta font-semibold text-blue">
            View
            <ChevronRight size={15} strokeWidth={2.2} aria-hidden />
          </span>
        </div>
      </div>

      {onToggleSave && (
        <div className="absolute right-2.5 top-2.5 z-10">
          <BookmarkButton
            saved={tender.isSaved}
            tenderTitle={tender.title}
            onToggle={() => onToggleSave(tender.id)}
          />
        </div>
      )}
    </div>
  );
}
