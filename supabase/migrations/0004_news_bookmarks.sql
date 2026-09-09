-- TenderBase: news bookmarks
--
-- Run in Supabase -> SQL Editor, in order after 0003. Safe to re-run.
--
-- One row per (user, bookmarked story). `story_id` is the app's stable id
-- ("<sourceId>:<url-hash>"), which survives live/fixture provenance switches.
-- The `snapshot` (src/lib/types/news.ts NewsItem) is JSONB so the saved list
-- can render even when the source feed is unreachable — the same reasoning as
-- saved_tenders.tender_json. RLS keeps every row with its owner.

create table if not exists public.news_bookmarks (
  user_id    uuid not null references auth.users (id) on delete cascade,
  story_id   text not null,
  source_id  text not null,
  -- Story snapshot for offline rendering; owned by the news domain model.
  snapshot   jsonb not null,
  saved_at   timestamptz not null default now(),

  primary key (user_id, story_id)
);

create index if not exists news_bookmarks_user_saved_idx
  on public.news_bookmarks (user_id, saved_at desc);

comment on table public.news_bookmarks is
  'A user''s bookmarked news stories with an offline-renderable snapshot.';

alter table public.news_bookmarks enable row level security;

drop policy if exists "own news bookmarks" on public.news_bookmarks;
create policy "own news bookmarks"
  on public.news_bookmarks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
