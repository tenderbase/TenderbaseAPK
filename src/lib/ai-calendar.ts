export type CalendarSource = 'manual' | 'tender' | 'ai';
export type CalendarEventType = 'tender_deadline' | 'briefing' | 'site_visit' | 'clarification' | 'submission' | 'meeting' | 'task' | 'reminder' | 'follow_up' | 'renewal';
export type CalendarPriority = 'low' | 'medium' | 'high' | 'critical';
export type CalendarStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

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
  eventType?: CalendarEventType;
  priority?: CalendarPriority;
  status?: CalendarStatus;
  location?: string | null;
  allDay?: boolean;
  preparationMinutes?: number;
  colorKey?: string;
}

export const EVENT_TYPES: Array<{ value: CalendarEventType; label: string; short: string }> = [
  { value: 'tender_deadline', label: 'Tender deadline', short: 'Deadline' },
  { value: 'briefing', label: 'Briefing', short: 'Briefing' },
  { value: 'site_visit', label: 'Site visit', short: 'Site visit' },
  { value: 'clarification', label: 'Clarification / questions', short: 'Clarification' },
  { value: 'submission', label: 'Submission', short: 'Submission' },
  { value: 'meeting', label: 'Business meeting', short: 'Meeting' },
  { value: 'task', label: 'Bid task', short: 'Bid task' },
  { value: 'reminder', label: 'Reminder', short: 'Reminder' },
  { value: 'follow_up', label: 'Follow-up', short: 'Follow-up' },
  { value: 'renewal', label: 'Renewal / review', short: 'Renewal' },
];

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

export function nativeAlarmId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) || 1;
}
