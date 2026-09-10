'use client';

import { useState } from 'react';
import { CalendarPlus, Check, Crown, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTier } from '@/lib/tier-store';
import { useUpgrade } from '@/components/tier/UpgradeSheet';
import { saveCalendarEvent } from '@/lib/calendar-remote';
import { scheduleCalendarAlarm } from '@/lib/native-alarms';
import type { Tender } from '@/types/tender';

/**
 * Adds a tender's real closing deadline to TenderBase AI Calendar.
 *
 * The event uses a stable id so tapping the action again updates the same
 * calendar item instead of creating duplicates. On the Android Capacitor app,
 * the same event is also scheduled through Local Notifications so the phone
 * can sound/vibrate at the configured reminder time.
 */
export function CalendarAction({ tender }: { tender: Tender }) {
  const { can } = useTier();
  const { openUpgrade } = useUpgrade();
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  if (!tender.closingDate) return null;

  const allowed = can('calendar-sync');
  const eventId = `tender:${tender.id}:closing`;

  const addToCalendar = async () => {
    if (!allowed) {
      openUpgrade('calendar-sync', {
        why: 'Add the tender closing deadline to AI Calendar with a reminder and Android phone alarm.',
      });
      return;
    }

    setState('saving');
    const event = {
      id: eventId,
      title: `Tender closing: ${tender.title}`,
      notes: [
        `Organisation: ${tender.organisation}`,
        `Tender number: ${tender.tenderNumber}`,
        tender.sourceUrl ? `Open tender: ${tender.sourceUrl}` : '',
      ].filter(Boolean).join('\n'),
      startsAt: tender.closingDate,
      reminderMinutes: 1440,
      alarmEnabled: true,
      tenderId: tender.id,
      source: 'tender' as const,
    };

    try {
      const saved = await saveCalendarEvent(event);
      if (!saved) throw new Error('Unable to save calendar event');

      // Native Android only; harmless on the web. The stable notification id
      // lets future calendar edits replace the same phone alarm.
      await scheduleCalendarAlarm(event);
      setState('done');
      window.setTimeout(() => setState('idle'), 2600);
    } catch (error) {
      console.error('[calendar] failed to add tender closing event', error);
      setState('error');
      window.setTimeout(() => setState('idle'), 3500);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void addToCalendar()}
      disabled={state === 'saving'}
      className={cn(
        'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-md border text-[13px] font-semibold transition-colors',
        allowed
          ? state === 'done'
            ? 'border-open/30 bg-open-bg text-open'
            : state === 'error'
              ? 'border-urgent/30 bg-urgent-bg text-urgent'
              : 'border-line bg-white text-ink'
          : 'border-pro-line bg-pro-soft text-[#7a610f]',
      )}
      aria-label={
        state === 'done'
          ? 'Added to AI Calendar'
          : state === 'error'
            ? 'Could not add to AI Calendar'
            : 'Add closing date to AI Calendar'
      }
    >
      {state === 'saving' ? (
        <>
          <Loader2 size={15} className="animate-spin" aria-hidden />
          Adding…
        </>
      ) : state === 'done' ? (
        <>
          <Check size={15} strokeWidth={2.4} aria-hidden />
          Added to AI Calendar
        </>
      ) : state === 'error' ? (
        <>Couldn’t add — try again</>
      ) : allowed ? (
        <>
          <CalendarPlus size={16} strokeWidth={1.9} aria-hidden />
          Add to AI Calendar
        </>
      ) : (
        <>
          <CalendarPlus size={16} strokeWidth={1.9} aria-hidden />
          Add to AI Calendar
          <Lock size={12} strokeWidth={2.2} aria-hidden />
          <Crown size={12} strokeWidth={2.2} aria-hidden />
        </>
      )}
    </button>
  );
}
