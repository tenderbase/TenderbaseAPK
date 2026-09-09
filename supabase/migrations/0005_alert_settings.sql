-- TenderBase: alert settings
--
-- Run in Supabase -> SQL Editor, in order after 0004 (this file reuses
-- public.touch_updated_at created by 0001). Safe to re-run.
--
-- One row per user. `muted` is the list of in-app alert kinds the user has
-- muted in Notification settings (src/lib/alerts.ts AlertKind:
-- "match" | "closing" | "system"). JSONB: channel prefs and quiet hours join
-- this row in later releases without further migrations.

create table if not exists public.alert_settings (
  user_id    uuid primary key references auth.users (id) on delete cascade,

  -- JSON array of muted AlertKind values, e.g. ["system"].
  muted      jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.alert_settings is
  'One row per user: which in-app alert kinds are muted, synced across devices.';

alter table public.alert_settings enable row level security;

drop policy if exists "own alert settings" on public.alert_settings;
create policy "own alert settings"
  on public.alert_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists touch_alert_settings on public.alert_settings;
create trigger touch_alert_settings
  before update on public.alert_settings
  for each row execute function public.touch_updated_at();
