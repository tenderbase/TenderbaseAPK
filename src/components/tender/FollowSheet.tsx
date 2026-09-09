'use client';

import { BellRing, Bookmark, Check } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { TenderWithUserState } from '@/types/tender';

/**
 * Follow sheet (blueprint §5.5.6): bell = addenda + deadline alerts on one
 * tender. Push is not wired until the notifications phase, so the sheet says
 * exactly that and offers the real action that exists today — saving the
 * tender onto the radar. No dead buttons, no fake "now following".
 */
export function FollowSheet({
  open,
  onClose,
  tender,
  saved,
  onToggleSave,
}: {
  open: boolean;
  onClose: () => void;
  tender: TenderWithUserState;
  saved: boolean;
  onToggleSave: (t: TenderWithUserState) => void;
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Follow this tender">
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ai-bg text-ai">
        <BellRing size={22} strokeWidth={1.9} aria-hidden />
      </span>
      <h3 className="mt-3 text-[18px] font-bold tracking-[-0.02em] text-ink">Deadline &amp; addenda alerts</h3>
      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-2">
        Following a tender pushes you the moment it is amended and again as the deadline
        approaches — no spam, ever.
      </p>

      <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-canvas px-3 py-2.5">
        <BellRing size={15} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
        <p className="text-[12px] leading-[17px] text-ink-2">
          Instant push isn&apos;t wired yet — it arrives with the notifications release. Until then,
          saving puts this tender on your Today radar and in Saved.
        </p>
      </div>

      <div className="mt-5 flex gap-2.5">
        {!saved && (
          <button
            type="button"
            onClick={() => {
              onToggleSave(tender);
              onClose();
            }}
            className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-md bg-navy text-[15px] font-semibold text-white"
          >
            <Bookmark size={16} strokeWidth={2.1} aria-hidden />
            Save to my radar
          </button>
        )}
        {saved && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-md bg-navy text-[15px] font-semibold text-white"
          >
            <Check size={16} strokeWidth={2.4} aria-hidden />
            Already on your radar
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="flex h-[50px] items-center justify-center rounded-md border border-line bg-white px-6 text-[15px] font-semibold text-ink"
        >
          Not now
        </button>
      </div>
    </BottomSheet>
  );
}
