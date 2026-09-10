-- TenderBase: billing (PayFast)
--
-- Run in Supabase -> SQL Editor, in order after 0005. Safe to re-run.
--
-- Two tables:
--   billing_payments      — one row per checkout attempt, reconciled by the
--                           PayFast ITN webhook. `id` is sent to PayFast as
--                           m_payment_id, so every ITN maps to exactly one
--                           local row.
--   billing_subscriptions — one row per user: the verified subscription that
--                           decides the Pro tier server-side.
--
-- RLS: users may READ their own billing history (invoices, plan screen).
-- No client write policy exists — only the server (service role, in the ITN
-- handler) may write, because a subscription row is what unlocks Pro.

create table if not exists public.billing_payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,

  -- 'pro-monthly' | 'pro-yearly' (validated in the app; plan catalogue lives
  -- in src/lib/payfast.ts so adding a plan needs no migration).
  plan          text not null,
  amount_cents  integer not null check (amount_cents > 0),

  status        text not null default 'pending'
                check (status in ('pending', 'complete', 'failed', 'cancelled')),

  pf_payment_id text,
  payfast_token text,
  -- Full ITN payload as received, for support and audit.
  itn           jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists billing_payments_user_created_idx
  on public.billing_payments (user_id, created_at desc);

create index if not exists billing_payments_token_idx
  on public.billing_payments (payfast_token);

comment on table public.billing_payments is
  'One row per PayFast checkout attempt; reconciled by the ITN webhook.';

create table if not exists public.billing_subscriptions (
  user_id             uuid primary key references auth.users (id) on delete cascade,

  plan                text not null,
  status              text not null default 'active'
                      check (status in ('active', 'cancelled', 'expired')),

  -- PayFast subscription token; the handle for the recurring debit and for
  -- cancellation through the PayFast Subscriptions API.
  payfast_token       text,
  current_period_end  timestamptz,
  cancel_at_period_end boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table public.billing_subscriptions is
  'Verified PayFast subscription per user — the server-side source of Pro.';

alter table public.billing_payments enable row level security;
alter table public.billing_subscriptions enable row level security;

-- Read-only for the owner (invoices + plan screen). Writes are service-role.
drop policy if exists "own billing payments read" on public.billing_payments;
create policy "own billing payments read"
  on public.billing_payments
  for select
  using (auth.uid() = user_id);

drop policy if exists "own subscription read" on public.billing_subscriptions;
create policy "own subscription read"
  on public.billing_subscriptions
  for select
  using (auth.uid() = user_id);

drop trigger if exists touch_billing_payments on public.billing_payments;
create trigger touch_billing_payments
  before update on public.billing_payments
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_billing_subscriptions on public.billing_subscriptions;
create trigger touch_billing_subscriptions
  before update on public.billing_subscriptions
  for each row execute function public.touch_updated_at();
