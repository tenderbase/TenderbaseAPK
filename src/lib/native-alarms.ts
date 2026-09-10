import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { nativeAlarmId, reminderAt, type CalendarEvent } from './ai-calendar';

export async function requestAlarmPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

export async function scheduleCalendarAlarm(event: CalendarEvent): Promise<boolean> {
  if (!event.alarmEnabled) return false;
  if (!Capacitor.isNativePlatform()) return false;
  const at = reminderAt(event);
  if (at.getTime() <= Date.now()) return false;
  const permitted = await requestAlarmPermission();
  if (!permitted) return false;

  await LocalNotifications.schedule({
    notifications: [{
      id: nativeAlarmId(event.id),
      title: event.title,
      body: event.notes?.trim() || 'TenderBase calendar reminder',
      schedule: { at, allowWhileIdle: true },
      sound: 'default',
      extra: { calendarEventId: event.id, tenderId: event.tenderId ?? null },
    }],
  });
  return true;
}

export async function cancelCalendarAlarm(eventId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await LocalNotifications.cancel({ notifications: [{ id: nativeAlarmId(eventId) }] });
}
