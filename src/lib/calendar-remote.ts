'use client';

import { createClient } from '@/lib/supabase';
import { currentSessionUserId } from '@/lib/supabase-user';
import type { CalendarEvent } from './ai-calendar';

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const userId = await currentSessionUserId();
  if (!userId) return [];
  const { data, error } = await createClient().from('calendar_events').select('*').order('starts_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id, title: r.title, notes: r.notes, startsAt: r.starts_at, endsAt: r.ends_at,
    reminderMinutes: r.reminder_minutes, alarmEnabled: r.alarm_enabled, tenderId: r.tender_id, source: r.source,
  }));
}

export async function saveCalendarEvent(event: CalendarEvent): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;
  const { error } = await createClient().from('calendar_events').upsert({
    id: event.id, user_id: userId, title: event.title, notes: event.notes ?? null,
    starts_at: event.startsAt, ends_at: event.endsAt ?? null, reminder_minutes: event.reminderMinutes,
    alarm_enabled: event.alarmEnabled, tender_id: event.tenderId ?? null, source: event.source,
  }, { onConflict: 'id' });
  return !error;
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;
  const { error } = await createClient().from('calendar_events').delete().eq('id', id).eq('user_id', userId);
  return !error;
}
