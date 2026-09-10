-- TenderBase: saved tenders
--
-- Run in Supabase -> SQL Editor. Safe to re-run.
--
-- One row per (user, tender). The tender_json snapshot is what the Saved tab
-- renders instantly without re-fetching the ingestion API; tapping a card
-- opens the live tender detail page. RLS keeps every row with its owner.

create table if not exists public.saved_tenders (
  user_id    uuid not null references auth.users (id) on delete cascade,
  tender_id  text not null,
  -- Adapted tender snapshot (src/lib/adapt.ts output). JSONB on purpose:
  -- the tender shape is owned by the ingestion API and this table should not
  -- need a migration every time the upstream adds a field.
  tender_json jsonb not null,
  saved_at   timestamptz not null default now(),

  primary key (user_id, tender_id)
);

create index if not exists saved_tenders_user_idx
  on public.saved_tenders (user_id, saved_at desc);

comment on table public.saved_tenders is
  'A user''s saved tenders with an offline-renderable snapshot of each.';

alter table public.saved_tenders enable row level security;

drop policy if exists "own saved tenders" on public.saved_tenders;
create policy "own saved tenders"
  on public.saved_tenders
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
