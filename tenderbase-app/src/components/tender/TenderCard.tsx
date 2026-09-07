'use client';

import Link from 'next/link';
import { Building2, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatValue, formatDate, getStatus } from '@/lib/format';
import { StatusBadge, CategoryBadge } from '@/components/ui/StatusBadge';
import { DeadlineBadge } from '@/components/ui/DeadlineBadge';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { MatchBadge } from '@/components/ai/MatchBadge';
import type { TenderWithUserState } from '@/types/tender';

export interface TenderCardProps {
  tender: TenderWithUserState;
  onToggleSave?: (id: string) => void;
  /** Hide the tender number on dense feeds like the dashboard. */
  showTenderNumber?: boolean;
  /** Optional AI rationale, shown on smart-search results. */
  matchReason?: string;
  className?: string;
}

/**
 * The canonical tender card. Used on Dashboard, Search and any list surface —
 * do NOT fork this component per screen.
 *
 * Layout order is deliberate: status and deadline always outrank the AI match
 * badge, so urgency is never buried by a score.
 */
export function TenderCard({
  tender,
  onToggleSave,
  showTenderNumber = true,
  matchReason,
  className,
}: TenderCardProps) {
  const status = getStatus(tender);

  return (
    <Link
      href={`/tenders/${tender.id}`}
      className={cn(
        'block rounded-lg border border-line bg-white p-3.5 shadow-card',
        'transition-shadow active:shadow-card-sm',
        // desktop: cards sit in a grid and gain a hover affordance
        'md:hover:border-blue-line',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={status} />
            <CategoryBadge category={tender.category} />
            {tender.matchScore !== null && <MatchBadge score={tender.matchScore} />}
          </div>

          {/* Long titles wrap naturally — never truncate a tender title. */}
          <h3 className="text-card-title font-semibold tracking-[-0.02em] text-ink">
            {tender.title}
          </h3>

          <p className="mt-1 flex items-center gap-1.5 text-meta text-ink-2">
            <Building2 size={14} strokeWidth={1.9} className="shrink-0" aria-hidden />
            {tender.organisation}
          </p>
        </div>

        <BookmarkButton
          saved={tender.isSaved}
          tenderTitle={tender.title}
          onToggle={() => onToggleSave?.(tender.id)}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <MapPin size={14} strokeWidth={1.9} className="shrink-0" aria-hidden />
          {tender.location}
        </span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
          <Calendar size={14} strokeWidth={1.9} className="shrink-0" aria-hidden />
          {formatDate(tender.closingDate)}
        </span>
      </div>

      {showTenderNumber && (
        <p className="mt-2 text-micro font-medium tabular-nums text-ink-3">{tender.tenderNumber}</p>
      )}

      {matchReason && (
        <p className="mt-2.5 flex gap-2.5 rounded-[10px] bg-ai-bg px-3 py-2.5 text-caption leading-[17px] text-ai">
          {matchReason}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-[15px] font-bold tracking-[-0.02em] text-navy">
            {formatValue(tender.valueCents)}
          </span>
          <DeadlineBadge closingDate={tender.closingDate} />
        </div>
        <span className="flex items-center gap-0.5 text-meta font-semibold text-blue">
          View
          <ChevronRight size={15} strokeWidth={2.2} aria-hidden />
        </span>
      </div>
    </Link>
  );
}
