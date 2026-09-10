-- TenderBase: onboarding — the one-time Basic/Pro decision
--
-- Run in Supabase -> SQL Editor, AFTER 0001 (this table reuses that file's
-- public.touch_updated_at() trigger function). Safe to re-run.
--
-- WHY A TABLE AND NOT A COOKIE
-- The decision is a property of the account, not the browser: it decides
-- whether we still show the first-run screen when the same person signs in on
-- a new phone. Absence of a row IS the signal — it means "has not decided
-- yet", so there is no boolean to keep in sync and no way to be half-decided.
--
-- WHAT THIS IS NOT
-- This is not an entitlement. Pro comes from billing_subscriptions (or an
-- active trial row) and nothing else; a row here only records which door the
-- person walked through the first time. Editing it in the database cannot
-- unlock anything.

create table if not exists public.user_onboarding (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- 'basic' — the free account (also what "continue without deciding" means).
  -- 'pro'   — they chose Pro; whether that became a trial or a payment is the
  --           billing tables' business, not this row's.
  plan_choice text not null,

  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plan_choice_values check (plan_choice in ('basic', 'pro'))
);

comment on table public.user_onboarding is
  'One row per user, written when they make the first-run Basic/Pro choice. No row = not decided yet.';

alter table public.user_onboarding enable row level security;

drop policy if exists "own onboarding" on public.user_onboarding;
create policy "own onboarding"
  on public.user_onboarding
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists touch_user_onboarding on public.user_onboarding;
create trigger touch_user_onboarding
  before update on public.user_onboarding
  for each row execute function public.touch_updated_at();
