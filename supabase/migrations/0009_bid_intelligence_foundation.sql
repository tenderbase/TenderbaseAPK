-- TenderBase: bid intelligence foundation
--
-- This migration creates the persistent foundation for the premium workflow:
-- opportunity -> analysis -> requirements -> bid desk.
-- All user-owned operational data is protected by RLS.
-- Tender analysis is shared by tender_id because the underlying tender facts
-- are not user-specific; personalized fit lives on bid_opportunities.

-- ---------------------------------------------------------------------------
-- Tender analyses
-- ---------------------------------------------------------------------------
create table if not exists public.tender_analyses (
  id uuid primary key default gen_random_uuid(),
  tender_id text not null,
  version integer not null default 1,
  status text not null default 'queued',

  executive_summary text,
  scope_summary text,
  eligibility_summary text,
  risk_summary text,

  fit_score smallint,
  fit_confidence text,

  analysed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint tender_analysis_status check (status in ('queued', 'processing', 'complete', 'failed')),
  constraint tender_analysis_score check (fit_score is null or fit_score between 0 and 100),
  constraint tender_analysis_confidence check (fit_confidence is null or fit_confidence in ('high', 'medium', 'low')),
  constraint tender_analysis_version check (version > 0),
  unique (tender_id, version)
);

create index if not exists tender_analyses_tender_idx
  on public.tender_analyses (tender_id, version desc);

alter table public.tender_analyses enable row level security;

drop policy if exists "authenticated can read tender analyses" on public.tender_analyses;
create policy "authenticated can read tender analyses"
  on public.tender_analyses
  for select
  using (auth.role() = 'authenticated');

-- Writes are intentionally not exposed through the client. Analysis generation
-- will use a server-side/service role path once document processing is wired.

-- ---------------------------------------------------------------------------
-- Tender requirements
-- ---------------------------------------------------------------------------
create table if not exists public.tender_requirements (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.tender_analyses(id) on delete cascade,

  category text not null,
  title text not null,
  description text not null default '',
  mandatory boolean not null default false,
  status text not null default 'unknown',

  source_document text,
  source_page integer,
  evidence jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint requirement_status check (status in ('unknown', 'complete', 'missing', 'not_applicable', 'needs_review')),
  constraint requirement_category check (category in (
    'eligibility', 'compliance', 'technical', 'financial', 'submission',
    'documentation', 'cidb', 'bbbee', 'tax', 'briefing', 'pricing'
  )),
  constraint requirement_source_page check (source_page is null or source_page > 0)
);

create index if not exists tender_requirements_analysis_idx
  on public.tender_requirements (analysis_id, mandatory desc, created_at);

alter table public.tender_requirements enable row level security;

drop policy if exists "authenticated can read tender requirements" on public.tender_requirements;
create policy "authenticated can read tender requirements"
  on public.tender_requirements
  for select
  using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Bid opportunities — user-owned, personalized decision record
-- ---------------------------------------------------------------------------
create table if not exists public.bid_opportunities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tender_id text not null,

  stage text not null default 'qualifying',
  priority text not null default 'normal',

  fit_score smallint,
  fit_confidence text,
  estimated_bid_value_cents bigint,
  win_probability smallint,

  next_action text,
  next_action_due_at timestamptz,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint bid_stage check (stage in ('qualifying', 'pursuing', 'preparing', 'submitted', 'won', 'lost', 'withdrawn')),
  constraint bid_priority check (priority in ('low', 'normal', 'high', 'urgent')),
  constraint bid_fit_score check (fit_score is null or fit_score between 0 and 100),
  constraint bid_fit_confidence check (fit_confidence is null or fit_confidence in ('high', 'medium', 'low')),
  constraint bid_win_probability check (win_probability is null or win_probability between 0 and 100),
  constraint bid_value_nonnegative check (estimated_bid_value_cents is null or estimated_bid_value_cents >= 0),
  unique (user_id, tender_id)
);

create index if not exists bid_opportunities_user_stage_idx
  on public.bid_opportunities (user_id, stage, updated_at desc);

create index if not exists bid_opportunities_user_deadline_idx
  on public.bid_opportunities (user_id, next_action_due_at)
  where next_action_due_at is not null;

alter table public.bid_opportunities enable row level security;

drop policy if exists "own bid opportunities" on public.bid_opportunities;
create policy "own bid opportunities"
  on public.bid_opportunities
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Bid tasks
-- ---------------------------------------------------------------------------
create table if not exists public.bid_tasks (
  id uuid primary key default gen_random_uuid(),
  bid_opportunity_id uuid not null references public.bid_opportunities(id) on delete cascade,

  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'normal',
  due_at timestamptz,
  assigned_to uuid references auth.users(id) on delete set null,

  created_at timestamptz not null default now(),
  completed_at timestamptz,

  constraint bid_task_status check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  constraint bid_task_priority check (priority in ('low', 'normal', 'high', 'urgent'))
);

create index if not exists bid_tasks_opportunity_idx
  on public.bid_tasks (bid_opportunity_id, status, due_at);

alter table public.bid_tasks enable row level security;

drop policy if exists "own bid tasks" on public.bid_tasks;
create policy "own bid tasks"
  on public.bid_tasks
  for all
  using (
    exists (
      select 1 from public.bid_opportunities bo
      where bo.id = bid_opportunity_id
        and bo.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bid_opportunities bo
      where bo.id = bid_opportunity_id
        and bo.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
drop trigger if exists touch_tender_analyses on public.tender_analyses;
create trigger touch_tender_analyses
  before update on public.tender_analyses
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_tender_requirements on public.tender_requirements;
create trigger touch_tender_requirements
  before update on public.tender_requirements
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_bid_opportunities on public.bid_opportunities;
create trigger touch_bid_opportunities
  before update on public.bid_opportunities
  for each row execute function public.touch_updated_at();
