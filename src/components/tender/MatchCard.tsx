'use client';

import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, Crown, Lock, MapPin } from 'lucide-react';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { DeadlineBadge } from '@/components/ui/DeadlineBadge';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import type { TenderMatch, MatchReason } from '@/lib/matches';

/**
 * Match card: the score ring up front (the money visual), the tender facts,
 * then the reason chips — the AI-adjacent explanation. Reason chips are a Pro
 * feature (matches-reasons); Basic sees the ring but no reasons, with an
 * honest one-tap unlock. Tapping a card opens the MatchSheet.
 */
export function MatchCard({
  match,
  onOpen,
}: {
  match: TenderMatch;
  onOpen?: (match: TenderMatch) => void;
}) {
  const { tender, score, reasons } = match;
  const { can } = useTier();
  const showReasons = can('matches-reasons');
  const { openUpgrade } = useUpgrade();

  return (
    <div className="rounded-lg border border-line bg-white p-3.5 shadow-card">
      <button
        type="button"
        onClick={() => onOpen?.(match)}
        className="flex w-full items-start gap-3 text-left"
      >
        <ScoreRing score={score} size={56} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold leading-[19px] tracking-[-0.015em] text-ink">
            {tender.title}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-caption text-ink-2">
            <Building2 size={13} strokeWidth={1.9} className="shrink-0" aria-hidden />
            <span className="truncate">{tender.organisation}</span>
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <DeadlineBadge closingDate={tender.closingDate} lifecycleStatus={tender.lifecycleStatus} />
            {tender.location && (
              <span className="flex items-center gap-1 text-caption text-ink-3">
                <MapPin size={12} strokeWidth={1.9} aria-hidden />
                {tender.location.split(' - ')[0]}
              </span>
            )}
          </span>
        </span>
        <ChevronRight size={17} strokeWidth={2.2} className="mt-1 shrink-0 text-ink-3" aria-hidden />
      </button>

      {/* Reasons */}
      <div className="mt-2.5 border-t border-line pt-2.5">
        {showReasons ? (
          reasons.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {reasons.map((r) => (
                <ReasonChip key={`${r.kind}:${r.label}`} reason={r} />
              ))}
            </div>
          ) : (
            <p className="text-caption text-ink-3">Matched by your profile</p>
          )
        ) : (
          <button
            type="button"
            onClick={() =>
              openUpgrade('matches-reasons', {
                why: 'Know exactly why each tender matched your business — category, province and more.',
              })
            }
            className="flex items-center gap-1.5 text-caption font-semibold text-[#7a610f]"
          >
            <Lock size={12} strokeWidth={2.2} aria-hidden />
            Why this match?
            <Crown size={12} strokeWidth={2.2} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}

export function ReasonChip({ reason }: { reason: MatchReason }) {
  const tone =
    reason.kind === 'category'
      ? 'bg-blue-soft text-blue'
      : reason.kind === 'province'
        ? 'bg-open-bg text-open'
        : 'bg-canvas text-ink-2';
  return (
    <span className={`inline-flex h-[22px] items-center rounded-md px-2 text-[11px] font-semibold ${tone}`}>
      {reason.label}
    </span>
  );
}

/** Full match detail: big ring, reasons (Pro), deadline and the CTA into the tender. */
export function MatchSheet({
  match,
  onClose,
}: {
  match: TenderMatch | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const { can } = useTier();
  const { openUpgrade } = useUpgrade();

  if (!match) return null;
  const { tender, score, reasons } = match;
  const showReasons = can('matches-reasons');

  return (
    <BottomSheet open onClose={onClose} title="Why this matches you">
      <div className="flex items-center gap-4">
        <ScoreRing score={score} size={72} strokeWidth={5} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-[20px] tracking-[-0.02em] text-ink">
            {tender.title}
          </p>
          <p className="mt-1 truncate text-meta text-ink-2">{tender.organisation}</p>
          <div className="mt-2">
            <DeadlineBadge closingDate={tender.closingDate} lifecycleStatus={tender.lifecycleStatus} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-3">
          {showReasons ? 'Matched on' : 'Matched by your profile'}
        </p>
        {showReasons && reasons.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <ReasonChip key={`${r.kind}:${r.label}`} reason={r} />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => openUpgrade('matches-reasons')}
            className="flex w-full items-center justify-between rounded-[12px] border border-pro-line bg-pro-soft px-3 py-2.5 text-left"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold text-[#7a610f]">
              <Crown size={15} strokeWidth={2.2} aria-hidden />
              Unlock match reasons
            </span>
            <ChevronRight size={15} strokeWidth={2.2} className="text-[#7a610f]" aria-hidden />
          </button>
        )}
      </div>

      <p className="mt-4 text-caption leading-[1.5] text-ink-2">
        {score >= 85
          ? 'Very strong fit — check the documents and your readiness today.'
          : score >= 65
            ? 'Good fit worth reviewing before the closing date.'
            : 'A solid lead — verify the scope against your capability before bidding.'}
      </p>

      <button
        type="button"
        onClick={() => {
          onClose();
          router.push(`/tenders/${tender.id}`);
        }}
        className="mt-5 flex h-[50px] w-full items-center justify-center rounded-md bg-navy text-[15px] font-semibold text-white"
      >
        Open tender
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 h-[44px] w-full rounded-md text-[13.5px] font-semibold text-ink-2"
      >
        Not now
      </button>
    </BottomSheet>
  );
}
