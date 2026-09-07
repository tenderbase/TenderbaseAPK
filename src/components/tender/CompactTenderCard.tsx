'use client';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { formatValue, formatDate, getStatus } from '@/lib/format';
import { DeadlineBadge } from '@/components/ui/DeadlineBadge';
import { MatchBadge } from '@/components/ai/MatchBadge';
import type { TenderWithUserState } from '@/types/tender';

const ACCENT: Record<string, string> = {
  open: 'bg-open',
  closing_soon: 'bg-soon',
  urgent: 'bg-urgent',
  closed: 'bg-ink-3',
};

/** Dense variant for "Closing soon" rails. Same tokens, less chrome. */
export function CompactTenderCard({
  tender,
  showMatch = false,
  className,
}: {
  tender: TenderWithUserState;
  showMatch?: boolean;
  className?: string;
}) {
  const status = getStatus(tender);
  return (
    <Link
      href={`/tenders/${tender.id}`}
      className={cn('flex overflow-hidden rounded-lg border border-line bg-white shadow-card', className)}
    >
      <span className={cn('w-1 shrink-0', ACCENT[status])} aria-hidden />
      <div className="min-w-0 flex-1 px-3.5 py-3">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            <h3 className="text-[14.5px] font-semibold leading-[19px] tracking-[-0.015em] text-ink">
              {tender.title}
            </h3>
            <p className="mt-0.5 text-caption text-ink-2">{tender.organisation}</p>
            {showMatch && tender.matchScore !== null && (
              <span className="mt-1.5 inline-block">
                <MatchBadge score={tender.matchScore} compact />
              </span>
            )}
          </div>
          <span className="shrink-0 text-body font-bold tracking-[-0.02em] text-navy">
            {formatValue(tender.valueCents)}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <DeadlineBadge closingDate={tender.closingDate} />
          <span className="text-[11.5px] font-medium text-ink-3">{formatDate(tender.closingDate)}</span>
        </div>
      </div>
    </Link>
  );
}
