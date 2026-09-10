'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellRing,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Crown,
  FileText,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
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

function dayKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dateStrip() {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

function formatMonth(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const reminderRef = useRef<HTMLElement>(null);

  useEffect(() => { void fetchCalendarEvents().then(setEvents); }, []);

  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.startsAt).getTime() >= Date.now()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, 12),
    [events],
  );
  const days = useMemo(() => dateStrip(), []);
  const monthLabel = formatMonth(selectedDate);
  const eventDays = useMemo(() => new Set(events.map((event) => dayKey(new Date(event.startsAt)))), [events]);

  async function addEvent() {
    if (!title.trim()) return;
    setSaving(true); setMessage('');
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      title: title.trim(),
      startsAt: new Date(startsAt).toISOString(),
      reminderMinutes,
      alarmEnabled,
      source: 'manual',
      notes: 'TenderBase AI Calendar reminder',
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

  function scrollToReminder() {
    reminderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <main className="min-h-screen bg-[#f5f8fd] pb-32 md:pb-10">
      <header className="relative overflow-hidden bg-[#0d1729] px-5 pb-8 pt-5 text-white md:px-8 md:pt-7">
        <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute left-1/3 top-20 h-52 w-52 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-5xl">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MenuButton className="md:hidden text-white" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
                <CalendarDays size={29} strokeWidth={1.8} />
              </div>
              <div>
                <h1 className="text-[30px] font-bold leading-none tracking-[-0.045em]">AI <span className="font-semibold">Calendar</span></h1>
                <p className="mt-1 text-[13px] font-medium text-blue-100/85">Plan. Prepare. Win.</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-amber-300/80 px-4 py-2 text-[13px] font-semibold text-amber-200 sm:flex">
              <Crown size={15} fill="currentColor" /> TenderBase Pro
            </div>
          </div>

          <div className="mt-7 rounded-[24px] border border-white/15 bg-gradient-to-r from-blue-600/30 via-blue-700/20 to-violet-600/35 p-4 shadow-2xl shadow-black/20 backdrop-blur md:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
                <Sparkles size={26} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-bold">Smarter Planning</p>
                <p className="mt-1 max-w-xl text-[12.5px] leading-[18px] text-blue-50/80">Let AI help you stay on top of tender deadlines, meetings and important dates.</p>
              </div>
              <button type="button" onClick={scrollToReminder} className="hidden shrink-0 items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-[13px] font-bold shadow-lg shadow-blue-900/30 sm:flex">
                <Sparkles size={15} /> Ask AI <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 md:px-8">
        <section className="-mt-4 overflow-hidden rounded-[24px] border border-white bg-white p-5 shadow-[0_12px_40px_rgba(15,35,70,0.08)] md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-bold tracking-[-0.03em] text-[#12213b]">{monthLabel}</h2>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setSelectedDate(new Date())} className="rounded-full border border-[#dbe4f0] px-4 py-2 text-[12px] font-semibold text-[#23406c]">Today</button>
              <button type="button" aria-label="Previous week" onClick={() => setSelectedDate((d) => new Date(d.getTime() - 7 * 86400000))} className="hidden h-9 w-9 items-center justify-center rounded-full hover:bg-[#f2f6fb] sm:flex"><ChevronLeft size={18} /></button>
              <button type="button" aria-label="Next week" onClick={() => setSelectedDate((d) => new Date(d.getTime() + 7 * 86400000))} className="hidden h-9 w-9 items-center justify-center rounded-full hover:bg-[#f2f6fb] sm:flex"><ChevronRight size={18} /></button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-7 divide-x divide-[#e7edf5]">
            {days.map((date) => {
              const isToday = dayKey(date) === dayKey(new Date());
              const isSelected = dayKey(date) === dayKey(selectedDate);
              const hasEvent = eventDays.has(dayKey(date));
              return (
                <button key={date.toISOString()} type="button" onClick={() => setSelectedDate(date)} className="group flex min-w-0 flex-col items-center py-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#7385a2] sm:text-[11px]">{date.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className={`mt-2 flex h-10 w-10 items-center justify-center rounded-xl text-[16px] font-bold transition ${isSelected ? 'bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-md shadow-blue-500/25' : isToday ? 'bg-[#eef5ff] text-[#1769e0]' : 'text-[#12213b] group-hover:bg-[#f4f7fb]'}`}>{date.getDate()}</span>
                  <span className={`mt-2 h-1.5 w-1.5 rounded-full ${hasEvent ? 'bg-blue-500' : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Add Event', sub: 'Create a calendar event', icon: CalendarDays, iconClass: 'bg-blue-50 text-blue-600', action: scrollToReminder },
            { label: 'Add Reminder', sub: 'Set a custom alarm', icon: Bell, iconClass: 'bg-amber-50 text-amber-600', action: scrollToReminder },
            { label: 'AI Plan', sub: 'Build your preparation plan', icon: Sparkles, iconClass: 'bg-violet-50 text-violet-600', action: scrollToReminder },
            { label: 'Add Tender', sub: 'Save a tender to calendar', icon: FileText, iconClass: 'bg-emerald-50 text-emerald-600', action: scrollToReminder },
          ].map(({ label, sub, icon: Icon, iconClass, action }) => (
            <button key={label} type="button" onClick={action} className="rounded-[20px] border border-white bg-white p-4 text-left shadow-[0_8px_28px_rgba(15,35,70,0.055)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,35,70,0.09)]">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}><Icon size={21} /></span>
              <p className="mt-3 text-[14px] font-bold text-[#12213b]">{label}</p>
              <p className="mt-1 text-[10.5px] leading-[15px] text-[#7b8da7]">{sub}</p>
            </button>
          ))}
        </section>

        <section ref={reminderRef} className="mt-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#102039] via-[#142c52] to-[#222052] p-5 text-white shadow-[0_18px_45px_rgba(13,30,60,0.2)] md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20"><BellRing size={23} /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[18px] font-bold">Add Reminder</h2>
              <p className="mt-1 text-[12px] text-blue-100/70">Set a smart reminder with custom time, priority and notification type.</p>
            </div>
            <ChevronRight size={22} className="text-white/50" />
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
            <label className="flex items-center gap-2 rounded-[14px] border border-white/15 bg-white/5 px-3.5 py-3">
              <FileText size={16} className="text-blue-200" />
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tender closing date" className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-blue-100/45" />
            </label>
            <label className="flex items-center gap-2 rounded-[14px] border border-white/15 bg-white/5 px-3.5 py-3">
              <CalendarDays size={16} className="text-blue-200" />
              <input type="date" value={startsAt.slice(0, 10)} onChange={(e) => setStartsAt(`${e.target.value}T${startsAt.slice(11, 16)}`)} className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-[14px] border border-white/15 bg-white/5 px-3.5 py-3">
              <Clock3 size={16} className="text-blue-200" />
              <input type="time" value={startsAt.slice(11, 16)} onChange={(e) => setStartsAt(`${startsAt.slice(0, 10)}T${e.target.value}`)} className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none" />
            </label>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between rounded-[14px] border border-white/10 bg-white/5 px-4 py-3">
              <span className="flex items-center gap-3 text-[12.5px] font-medium"><span className={`relative h-6 w-11 rounded-full transition ${alarmEnabled ? 'bg-blue-500' : 'bg-white/20'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${alarmEnabled ? 'left-6' : 'left-1'}`} /></span> Phone alarm when available</span>
              <input type="checkbox" checked={alarmEnabled} onChange={(e) => setAlarmEnabled(e.target.checked)} className="sr-only" />
            </label>
            <label className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/5 px-4 py-3">
              <Bell size={17} className="text-red-300" />
              <select value={reminderMinutes} onChange={(e) => setReminderMinutes(Number(e.target.value))} className="flex-1 bg-transparent text-[12.5px] font-medium text-white outline-none">
                {REMINDER_PRESETS.map((r) => <option key={r.minutes} value={r.minutes} className="text-[#12213b]">{r.label}</option>)}
              </select>
            </label>
          </div>

          <button disabled={saving || !title.trim()} onClick={() => void addEvent()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3.5 text-[13px] font-bold shadow-lg shadow-blue-900/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40">
            <Save size={16} /> {saving ? 'Saving…' : 'Save Reminder'}
          </button>
          {message && <p className="mt-3 text-center text-[11px] text-blue-100/80">{message}</p>}
        </section>

        <section className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[20px] font-bold tracking-[-0.02em] text-[#12213b]"><Clock3 size={20} /> Upcoming</h2>
            <span className="text-[12px] font-semibold text-[#637796]">{upcoming.length} scheduled</span>
          </div>
          <div className="space-y-3">
            {upcoming.length === 0 && <div className="rounded-[22px] border border-dashed border-[#d8e2ef] bg-white p-8 text-center text-[13px] text-[#7b8da7]">No upcoming calendar reminders.</div>}
            {upcoming.map((event) => {
              const urgent = event.reminderMinutes <= 60;
              return (
                <article key={event.id} className="flex items-center gap-3 rounded-[22px] border border-white bg-white p-4 shadow-[0_8px_28px_rgba(15,35,70,0.055)]">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${urgent ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'}`}><CalendarDays size={21} /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13.5px] font-bold text-[#12213b]">{event.title}</p>
                      {urgent && <span className="rounded-full bg-red-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide text-red-500">Urgent</span>}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#7b8da7]">
                      <CalendarDays size={12} /> {new Date(event.startsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span>•</span>
                      <Clock3 size={12} /> {new Date(event.startsAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                      <span>•</span>
                      {event.reminderMinutes === 0 ? 'At event' : `${event.reminderMinutes} min before`}
                    </p>
                  </div>
                  {event.alarmEnabled && <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />}
                  <button onClick={() => void removeEvent(event)} aria-label={`Delete ${event.title}`} className="rounded-full p-2 text-[#9aa9bd] transition hover:bg-red-50 hover:text-red-500"><Trash2 size={15} /></button>
                </article>
              );
            })}
          </div>
        </section>

        {!can('push-full') && (
          <div className="mt-5 rounded-[18px] border border-[#dfe6f0] bg-white p-4 text-[11px] leading-[16px] text-[#71839f]">
            <span className="font-semibold text-[#3c5478]">Pro</span> unlocks richer AI-generated schedules and advanced notification delivery.
          </div>
        )}
      </div>
    </main>
  );
}
