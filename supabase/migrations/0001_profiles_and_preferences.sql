-- TenderBase: company profiles + tender preferences
--
-- Run in Supabase -> SQL Editor. Safe to re-run.
--
-- Every table is keyed to auth.uid() and protected by RLS, so a user can only
-- ever read or write their own row. The anon key is public, so RLS is the only
-- thing standing between one bidder's compliance data and another's.

-- ---------------------------------------------------------------------------
-- Company profiles
-- ---------------------------------------------------------------------------

create table if not exists public.company_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- Identity
  legal_name        text not null default '',
  trading_name      text,
  company_type      text,

  -- Registration. Formats validated in the app; constrained here as a backstop.
  registration_number text,
  vat_number          text,
  csd_number          text,
  tax_clearance_expiry date,

  -- Compliance
  bbbee_level   smallint,
  bbbee_expiry  date,
  cidb_grading  text,

  -- Contact
  contact_person text,
  email          text,
  phone          text,

  -- Address
  address_line text,
  city         text,
  province     text,
  postal_code  text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bbbee_level_range check (bbbee_level is null or bbbee_level between 1 and 8),
  constraint registration_number_format check (
    registration_number is null or registration_number ~ '^\d{4}/\d{6}/\d{2}$'),
  constraint vat_number_format check (
    vat_number is null or vat_number ~ '^4\d{9}$'),
  constraint csd_number_format check (
    csd_number is null or csd_number ~ '^MAAA\d{7}$'),
  constraint postal_code_format check (
    postal_code is null or postal_code ~ '^\d{4}$')
);

comment on table public.company_profiles is
  'One row per user. The bidder''s own company details, used for tender qualification.';

alter table public.company_profiles enable row level security;

drop policy if exists "own company profile" on public.company_profiles;
create policy "own company profile"
  on public.company_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Tender preferences
-- ---------------------------------------------------------------------------

create table if not exists public.tender_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- Empty array means "no restriction", not "no results".
  categories text[] not null default '{}',
  provinces  text[] not null default '{}',

  include_national    boolean  not null default true,
  min_days_to_close   smallint not null default 0,
  require_documents   boolean  not null default false,

  alert_on_new_match     boolean not null default true,
  alert_on_closing_soon  boolean not null default true,
  alert_on_saved_updated boolean not null default false,
  digest text not null default 'daily',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint digest_values check (digest in ('off', 'daily', 'weekly')),
  constraint min_days_values check (min_days_to_close in (0, 3, 7, 14))
);

comment on table public.tender_preferences is
  'One row per user. Shapes the dashboard feed, recommendations and alerts.';

alter table public.tender_preferences enable row level security;

drop policy if exists "own preferences" on public.tender_preferences;
create policy "own preferences"
  on public.tender_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_company_profiles on public.company_profiles;
create trigger touch_company_profiles
  before update on public.company_profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_tender_preferences on public.tender_preferences;
create trigger touch_tender_preferences
  before update on public.tender_preferences
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Seed a blank row on first sign-in
--
-- Without this the app must handle "row missing" everywhere. search_path is
-- pinned because the function runs as definer.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_profiles (user_id, legal_name, email, contact_person)
  values (
    new.id,
    '',
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (user_id) do nothing;

  insert into public.tender_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
