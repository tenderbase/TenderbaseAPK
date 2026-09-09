'use client';

import { useMemo, useState } from 'react';
import { CalendarPlus, Check, Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { buildTenderIcs } from '@/lib/calendar';
import type { Tender } from '@/types/tender';

function download(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * "Add to calendar" — real, client-side .ics export of the closing deadline
 * (Pro feature, calendar-sync). Basic sees the standard gold lock straight
 * into the upgrade sheet; when the closing date cannot be parsed the action
 * hides itself rather than producing a broken file.
 */
export function CalendarAction({ tender }: { tender: Tender }) {
  const { can } = useTier();
  const { openUpgrade } = useUpgrade();
  const [done, setDone] = useState(false);

  const exportFile = useMemo(() => buildTenderIcs(tender), [tender]);
  const allowed = can('calendar-sync');
  if (!exportFile) return null;

  return (
    <button
      type="button"
      onClick={() => {
        if (!allowed) {
          openUpgrade('calendar-sync', {
            why: 'One tap drops the closing deadline into your calendar — converted to your timezone, with the tender details attached.',
          });
          return;
        }
        download(exportFile.ics, exportFile.fileName);
        setDone(true);
        window.setTimeout(() => setDone(false), 2600);
      }}
      className={cn(
        'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border text-[13px] font-semibold transition-colors',
        allowed
          ? done
            ? 'border-open/30 bg-open-bg text-open'
            : 'border-line bg-white text-ink'
          : 'border-pro-line bg-pro-soft text-[#7a610f]',
      )}
      aria-label={done ? 'Calendar event downloaded' : 'Add closing date to calendar'}
    >
      {done ? (
        <>
          <Check size={15} strokeWidth={2.4} aria-hidden />
          Downloaded — open to add
        </>
      ) : allowed ? (
        <>
          <CalendarPlus size={16} strokeWidth={1.9} aria-hidden />
          Add to calendar
        </>
      ) : (
        <>
          <CalendarPlus size={16} strokeWidth={1.9} aria-hidden />
          Add to calendar
          <Lock size={12} strokeWidth={2.2} aria-hidden />
          <Crown size={12} strokeWidth={2.2} aria-hidden />
        </>
      )}
    </button>
  );
}
