'use client';

import { useEffect, useMemo, useState } from 'react';
import { BellRing, CalendarDays, CheckCircle2, Clock3, Plus, Sparkles, Trash2 } from 'lucide-react';
import { MenuButton } from '@/components/nav/MenuButton';
import { useTier } from '@/lib/tier-store';
import { fetchCalendarEvents, saveCalendarEvent, deleteCalendarEvent } from '@/lib/calendar-remote';
import { REMINDER_PRESETS, type CalendarEvent } from '@/lib/ai-calendar';
import { cancelCalendarAlarm, scheduleCalendarAlarm } from '@/lib/native-alarms';

function localDateTime(days = 1) {
  const d = new Date(Date.now() + days * 86400000);
  d.setMinutes(0, 0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function CalendarPage() {
  const { can } = useTier();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState(localDateTime());
  const [reminderMinutes, setReminderMinutes] = useState(60);
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => { void fetchCalendarEvents().then(setEvents); }, []);

  const upcoming = useMemo(() => events.filter((e) => new Date(e.startsAt).getTime() >= Date.now()).slice(0, 12), [events]);

  async function addEvent() {
    if (!title.trim()) return;
    setSaving(true); setMessage('');
    const event: CalendarEvent = {
      id: crypto.randomUUID(), title: title.trim(), startsAt: new Date(startsAt).toISOString(),
      reminderMinutes, alarmEnabled, source: 'manual', notes: 'TenderBase AI Calendar reminder',
    };
    const ok = await saveCalendarEvent(event);
    if (ok) {
      setEvents((prev) => [...prev, event].sort((a, b) => a.startsAt.localeCompare(b.startsAt)));
      if (alarmEnabled) {
        const scheduled = await scheduleCalendarAlarm(event);
        setMessage(scheduled ? 'Saved — your phone alarm is scheduled.' : 'Saved. Phone alarm will activate when native notifications are available.');
      } else setMessage('Saved to your TenderBase calendar.');
      setTitle('');
    } else setMessage('Sign in to save calendar events.');
    setSaving(false);
  }

  async function removeEvent(event: CalendarEvent) {
    await cancelCalendarAlarm(event.id);
    await deleteCalendarEvent(event.id);
    setEvents((prev) => prev.filter((e) => e.id !== event.id));
  }

  return (
    <main className="pb-32 md:pb-8">
      <header className="border-b border-line bg-white px-5 pb-3 pt-1.5">
        <div className="flex items-center gap-2.5"><MenuButton className="md:hidden" /><h1 className="text-h2">AI Calendar</h1></div>
        <p className="mt-2 max-w-2xl text-[12.5px] leading-[18px] text-ink-2">Plan tender deadlines, preparation tasks and reminders. On the Android app, alarms are scheduled through the phone notification system.</p>
      </header>

      <div className="px-5 py-4">
        <section className="rounded-[16px] border border-pro-line bg-pro-soft p-4">
          <div className="flex items-start gap-3"><Sparkles size={20} className="mt-0.5 text-[#7a610f]" /><div><h2 className="text-[16px] font-semibold text-ink">AI planning</h2><p className="mt-1 text-[12.5px] leading-[18px] text-ink-2">Turn a tender deadline into a preparation plan, then give each task its own reminder.</p></div></div>
          <div className="mt-3 rounded-[12px] bg-white/80 p-3 text-[12px] text-ink-2">Example: “I need to submit this tender Friday. Remind me to review the specification, finish pricing and do the final compliance check.”</div>
          {!can('push-full') && <p className="mt-3 text-[11px] text-ink-3">Basic users can create calendar reminders. Pro can later unlock AI-generated schedules and richer notification delivery.</p>}
        </section>

        <section className="mt-5 rounded-[16px] border border-line bg-white p-4">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold"><Plus size={17} /> Add reminder</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Prepare tender pricing" className="rounded-[10px] border border-line px-3 py-2.5 text-[13px] outline-none" />
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="rounded-[10px] border border-line px-3 py-2.5 text-[13px] outline-none" />
            <select value={reminderMinutes} onChange={(e) => setReminderMinutes(Number(e.target.value))} className="rounded-[10px] border border-line px-3 py-2.5 text-[13px]">
              {REMINDER_PRESETS.map((r) => <option key={r.minutes} value={r.minutes}>{r.label}</option>)}
            </select>
            <label className="flex items-center gap-2 rounded-[10px] border border-line px-3 py-2.5 text-[13px]"><input type="checkbox" checked={alarmEnabled} onChange={(e) => setAlarmEnabled(e.target.checked)} /> Phone alarm when available</label>
          </div>
          <button disabled={saving || !title.trim()} onClick={() => void addEvent()} className="mt-3 rounded-[10px] bg-ink px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save reminder'}</button>
          {message && <p className="mt-2 text-[11.5px] text-ink-2">{message}</p>}
        </section>

        <section className="mt-5">
          <h2 className="mb-2 flex items-center gap-2 text-micro font-semibold uppercase tracking-[0.07em] text-ink-3"><CalendarDays size={14} /> Upcoming</h2>
          <div className="divide-y divide-line rounded-[16px] border border-line bg-white px-4">
            {upcoming.length === 0 && <p className="py-6 text-center text-[13px] text-ink-3">No upcoming calendar reminders.</p>}
            {upcoming.map((event) => <article key={event.id} className="flex items-center gap-3 py-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-canvas text-ink-2"><BellRing size={16} /></span><div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold text-ink">{event.title}</p><p className="mt-1 flex items-center gap-1 text-[11.5px] text-ink-3"><Clock3 size={12} />{new Date(event.startsAt).toLocaleString()} · {event.reminderMinutes === 0 ? 'at event' : `${event.reminderMinutes} min before`}</p></div>{event.alarmEnabled && <CheckCircle2 size={16} className="text-open" />}<button onClick={() => void removeEvent(event)} aria-label={`Delete ${event.title}`} className="p-2 text-ink-3 hover:text-ink"><Trash2 size={15} /></button></article>)}
          </div>
        </section>
      </div>
    </main>
  );
}
