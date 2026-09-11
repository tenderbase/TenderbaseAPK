-- Phase 1: document intelligence processing state and evidence chunks.
-- Document IDs are stored as text because tender documents currently arrive
-- as source/feed records rather than rows in a dedicated documents table.

create table if not exists public.tender_document_processing (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  document_id text not null,
  document_name text not null,
  file_type text,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'complete', 'failed')),
  error_message text,
  classified_as text,
  classification_confidence text
    check (classification_confidence is null or classification_confidence in ('high', 'medium', 'low')),
  extracted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tender_id, document_id)
);

create table if not exists public.tender_document_chunks (
  id uuid primary key default gen_random_uuid(),
  processing_id uuid not null references public.tender_document_processing(id) on delete cascade,
  tender_id uuid not null references public.tenders(id) on delete cascade,
  document_id text not null,
  chunk_index integer not null check (chunk_index >= 0),
  page_number integer check (page_number is null or page_number > 0),
  section text,
  content text not null,
  content_hash text,
  created_at timestamptz not null default now(),
  unique (processing_id, chunk_index)
);

create index if not exists idx_tender_document_processing_tender
  on public.tender_document_processing(tender_id);
create index if not exists idx_tender_document_processing_status
  on public.tender_document_processing(status);
create index if not exists idx_tender_document_chunks_tender
  on public.tender_document_chunks(tender_id);
create index if not exists idx_tender_document_chunks_document
  on public.tender_document_chunks(tender_id, document_id, chunk_index);

create or replace function public.set_tender_document_processing_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tender_document_processing_updated_at on public.tender_document_processing;
create trigger tender_document_processing_updated_at
before update on public.tender_document_processing
for each row execute function public.set_tender_document_processing_updated_at();

alter table public.tender_document_processing enable row level security;
alter table public.tender_document_chunks enable row level security;

-- Tender records are currently readable through the application's tender
-- access layer. Document processing rows follow that same read boundary.
-- Writes remain server-side only; no client INSERT/UPDATE policy is created.
drop policy if exists "document processing read" on public.tender_document_processing;
create policy "document processing read"
on public.tender_document_processing
for select
using (true);

drop policy if exists "document chunks read" on public.tender_document_chunks;
create policy "document chunks read"
on public.tender_document_chunks
for select
using (true);
