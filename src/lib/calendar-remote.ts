'use client';

import { createClient } from '@/lib/supabase';
import { currentSessionUserId } from '@/lib/supabase-user';
import type { CalendarEvent } from './ai-calendar';

function stableUuid(seed: string): string {
  let h1 = 0x811c9dc5, h2 = 0x9e3779b9, h3 = 0x85ebca6b, h4 = 0xc2b2ae35;
  for (let i = 0; i < seed.length; i += 1) {
    const c = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ c, 2246822519);
    h3 = Math.imul(h3 ^ c, 3266489917); h4 = Math.imul(h4 ^ c, 668265263);
  }
  const hex = [h1, h2, h3, h4].map((n) => (n >>> 0).toString(16).padStart(8, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function mapRow(r: any): CalendarEvent {
  return {
    id: r.id, title: r.title, notes: r.notes, startsAt: r.starts_at, endsAt: r.ends_at,
    reminderMinutes: r.reminder_minutes, alarmEnabled: r.alarm_enabled, tenderId: r.tender_id, source: r.source,
    eventType: r.event_type ?? 'reminder', priority: r.priority ?? 'medium', status: r.status ?? 'planned',
    location: r.location, allDay: r.all_day ?? false, preparationMinutes: r.preparation_minutes ?? 0, colorKey: r.color_key ?? 'blue',
  };
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  const userId = await currentSessionUserId();
  if (!userId) return [];
  const { data, error } = await createClient().from('calendar_events').select('*').order('starts_at', { ascending: true });
  if (error) return [];
  return (data ?? []).map(mapRow);
}

export async function saveCalendarEvent(event: CalendarEvent): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;
  const databaseId = event.source === 'tender' ? stableUuid(`${userId}:${event.id}`) : event.id;
  const { error } = await createClient().from('calendar_events').upsert({
    id: databaseId, user_id: userId, title: event.title, notes: event.notes ?? null,
    starts_at: event.startsAt, ends_at: event.endsAt ?? null, reminder_minutes: event.reminderMinutes,
    alarm_enabled: event.alarmEnabled, tender_id: event.tenderId ?? null, source: event.source,
    event_type: event.eventType ?? 'reminder', priority: event.priority ?? 'medium', status: event.status ?? 'planned',
    location: event.location ?? null, all_day: event.allDay ?? false, preparation_minutes: event.preparationMinutes ?? 0,
    color_key: event.colorKey ?? 'blue',
  }, { onConflict: 'id' });
  return !error;
}

export async function deleteCalendarEvent(id: string): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;
  const { error } = await createClient().from('calendar_events').delete().eq('id', id).eq('user_id', userId);
  return !error;
}
