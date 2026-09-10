export type CalendarSource = 'manual' | 'tender' | 'ai';

export interface CalendarEvent {
  id: string;
  title: string;
  notes?: string | null;
  startsAt: string;
  endsAt?: string | null;
  reminderMinutes: number;
  alarmEnabled: boolean;
  tenderId?: string | null;
  source: CalendarSource;
}

export const REMINDER_PRESETS = [
  { label: 'At event time', minutes: 0 },
  { label: '15 minutes before', minutes: 15 },
  { label: '1 hour before', minutes: 60 },
  { label: '1 day before', minutes: 1440 },
  { label: '3 days before', minutes: 4320 },
  { label: '7 days before', minutes: 10080 },
  { label: '14 days before', minutes: 20160 },
] as const;

export function reminderAt(event: Pick<CalendarEvent, 'startsAt' | 'reminderMinutes'>): Date {
  return new Date(new Date(event.startsAt).getTime() - event.reminderMinutes * 60_000);
}

/** Stable positive native-notification id for a calendar event. */
export function nativeAlarmId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}
