'use client';

import { BellRing, Bookmark, Check } from 'lucide-react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import type { TenderWithUserState } from '@/types/tender';

export function FollowSheet({ open, onClose, onOpenChange, tender, saved, onToggleSave }: {
  open: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  tender: TenderWithUserState;
  saved?: boolean;
  onToggleSave?: (tender: TenderWithUserState) => void;
}) {
  const close = () => { onClose?.(); onOpenChange?.(false); };
  const isSaved = saved ?? tender.isSaved;
  const toggle = onToggleSave ?? (() => undefined);
  return (
    <BottomSheet open={open} onClose={close} title="Follow this tender">
      <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-ai-bg text-ai"><BellRing size={22} strokeWidth={1.9} aria-hidden /></span>
      <h3 className="mt-3 text-[18px] font-bold tracking-[-0.02em] text-ink">Deadline &amp; addenda alerts</h3>
      <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-2">Following a tender keeps its deadline and amendment activity visible on your radar.</p>
      <div className="mt-4 flex items-start gap-2.5 rounded-[12px] bg-canvas px-3 py-2.5"><BellRing size={15} className="mt-0.5 shrink-0 text-ink-3" aria-hidden /><p className="text-[12px] leading-[17px] text-ink-2">Saving is available now. Push notifications can be added when the notification delivery layer is enabled.</p></div>
      <div className="mt-5 flex gap-2.5">
        {!isSaved ? <button type="button" onClick={() => { toggle(tender); close(); }} className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-md bg-navy text-[15px] font-semibold text-white"><Bookmark size={16}/>Save to my radar</button> : <button type="button" onClick={close} className="flex h-[50px] flex-1 items-center justify-center gap-2 rounded-md bg-navy text-[15px] font-semibold text-white"><Check size={16}/>Already on your radar</button>}
        <button type="button" onClick={close} className="flex h-[50px] items-center justify-center rounded-md border border-line bg-white px-6 text-[15px] font-semibold text-ink">Not now</button>
      </div>
    </BottomSheet>
  );
}
