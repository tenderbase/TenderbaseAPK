-- TenderBase: saved searches
--
-- Run in Supabase -> SQL Editor, in order after 0002. Safe to re-run.
--
-- One row per (user, saved search). The `id` is the client-generated id from
-- the device store (ss_...) so a row keeps its identity across devices and
-- deletes stay precise. `params` is the Discover filter set; JSONB on
-- purpose, because the filter keys are owned by the app
-- (src/lib/saved-searches.ts) and must not need a migration every time a
-- filter is added. RLS keeps every row with its owner.

create table if not exists public.saved_searches (
  user_id    uuid not null references auth.users (id) on delete cascade,
  id         text not null,
  name       text not null,
  -- The Discover filter set captured by "Save search".
  params     jsonb not null,
  created_at timestamptz not null default now(),

  primary key (user_id, id)
);

create index if not exists saved_searches_user_created_idx
  on public.saved_searches (user_id, created_at desc);

comment on table public.saved_searches is
  'A user''s saved Discover searches, synced across devices.';

alter table public.saved_searches enable row level security;

drop policy if exists "own saved searches" on public.saved_searches;
create policy "own saved searches"
  on public.saved_searches
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
