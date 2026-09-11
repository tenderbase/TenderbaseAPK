-- TenderBase: commercial intelligence semantics
--
-- eTenders commonly does not disclose tender/contract amounts as a standard
-- tender field. This migration keeps that normal state explicit and prevents
-- downstream AI/product code from interpreting NULL as a failed extraction.

alter table if exists public.tender_analyses
  add column if not exists commercial_value_status text not null default 'not_disclosed',
  add column if not exists published_value_cents bigint,
  add column if not exists commercial_attractiveness text not null default 'not_assessable',
  add column if not exists commercial_confidence text not null default 'not_available',
  add column if not exists contract_period text,
  add column if not exists pricing_information text,
  add column if not exists budget_indication text,
  add column if not exists commercial_notes jsonb not null default '[]'::jsonb;

alter table if exists public.tender_analyses
  drop constraint if exists tender_analysis_commercial_value_status;

alter table if exists public.tender_analyses
  add constraint tender_analysis_commercial_value_status
  check (commercial_value_status in ('not_disclosed', 'published', 'document_evidence', 'inferred', 'unknown'));

alter table if exists public.tender_analyses
  drop constraint if exists tender_analysis_commercial_attractiveness;

alter table if exists public.tender_analyses
  add constraint tender_analysis_commercial_attractiveness
  check (commercial_attractiveness in ('high', 'medium', 'low', 'not_assessable'));

alter table if exists public.tender_analyses
  drop constraint if exists tender_analysis_commercial_confidence;

alter table if exists public.tender_analyses
  add constraint tender_analysis_commercial_confidence
  check (commercial_confidence in ('high', 'medium', 'low', 'not_available'));

alter table if exists public.tender_analyses
  drop constraint if exists tender_analysis_published_value_nonnegative;

alter table if exists public.tender_analyses
  add constraint tender_analysis_published_value_nonnegative
  check (published_value_cents is null or published_value_cents >= 0);

comment on column public.tender_analyses.commercial_value_status is
  'Explicit source state for value. not_disclosed is the expected default for eTenders records.';

comment on column public.tender_analyses.commercial_attractiveness is
  'Commercial attractiveness is separate from Tender Fit Score and may be assessed from document evidence.';

comment on column public.tender_analyses.commercial_confidence is
  'Confidence in commercial intelligence; not_available is valid when no value/commercial evidence exists.';
