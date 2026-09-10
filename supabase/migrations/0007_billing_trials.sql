-- TenderBase: subscription trials
--
-- Run in Supabase -> SQL Editor, in order after 0006. Safe to re-run.
--
-- The 14-day Pro trial is a server-side record, not a client cookie: the
-- tier the server grants is derived from this row, so a trial can be neither
-- self-granted nor extended in the browser.
--
--   trial_ends_at — when the trial's Pro access stops
--   trial_used_at — first trial start; one trial per account, ever

alter table public.billing_subscriptions
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_used_at timestamptz;

-- Widen the status set with 'trialing'.
alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_status_check;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_status_check
  check (status in ('trialing', 'active', 'cancelled', 'expired'));

comment on column public.billing_subscriptions.trial_ends_at is
  'When a server-verified trial stops granting Pro.';
comment on column public.billing_subscriptions.trial_used_at is
  'Set on the first trial start — one trial per account.';
