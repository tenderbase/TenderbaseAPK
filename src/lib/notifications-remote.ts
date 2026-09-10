'use client';

import { createClient } from '@/lib/supabase';
import { currentSessionUserId } from '@/lib/supabase-user';
import type { AlertEntry } from '@/lib/alerts';

interface DbNotification {
  id: string;
  kind: AlertEntry['kind'];
  title: string;
  body: string;
  tender_id: string | null;
  score: number | null;
  created_at: string;
  read_at: string | null;
  metadata: Record<string, unknown> | null;
}

function toEntry(row: DbNotification): AlertEntry {
  return {
    id: row.id,
    kind: row.kind,
    tenderId: row.tender_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    read: row.read_at === null,
    ...(typeof row.score === 'number' ? { score: row.score } : {}),
  };
}

export async function fetchNotifications(limit = 100): Promise<AlertEntry[] | undefined> {
  const userId = await currentSessionUserId();
  if (!userId) return undefined;

  const { data, error } = await createClient()
    .from('notifications')
    .select('id,kind,title,body,tender_id,score,created_at,read_at,metadata')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[notifications] fetch failed:', error.message);
    return undefined;
  }
  return (data as DbNotification[]).map(toEntry);
}

export async function persistNotifications(entries: AlertEntry[]): Promise<boolean> {
  if (entries.length === 0) return true;
  const userId = await currentSessionUserId();
  if (!userId) return false;

  const rows = entries.map((entry) => ({
    id: entry.id,
    user_id: userId,
    kind: entry.kind,
    title: entry.title,
    body: entry.body,
    tender_id: entry.tenderId,
    score: entry.score ?? null,
    created_at: entry.createdAt,
    read_at: entry.read ? entry.createdAt : null,
    metadata: {},
  }));

  const { error } = await createClient()
    .from('notifications')
    .upsert(rows, { onConflict: 'id', ignoreDuplicates: false });

  if (error) {
    console.error('[notifications] persist failed:', error.message);
    return false;
  }
  return true;
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;
  const { error } = await createClient()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) console.error('[notifications] mark read failed:', error.message);
  return !error;
}

export async function markAllNotificationsRead(): Promise<boolean> {
  const userId = await currentSessionUserId();
  if (!userId) return false;
  const { error } = await createClient()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) console.error('[notifications] mark all read failed:', error.message);
  return !error;
}
