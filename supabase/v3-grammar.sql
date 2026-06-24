-- =====================================================================
--  Türkçe Study App — v3 migration: GRAMMAR module
--
--  Run this ONCE in the Supabase dashboard: SQL Editor -> New query ->
--  paste this whole file -> Run.
--
--  What it adds: a "grammar" table where you save grammar topics you come
--  across while studying — a title, an explanation in your own words, a
--  list of example sentences, and which book/page it came from.
--  Same single-owner, no-login setup as the rest of the app.
-- =====================================================================

create table if not exists public.grammar (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default '00000000-0000-0000-0000-000000000001',
  title       text not null,                       -- e.g. "Present continuous (-yor)"
  explanation text,                                -- your notes, free text
  examples    jsonb not null default '[]'::jsonb,  -- [{ "tr": "...", "meaning": "..." }]
  book_id     uuid references public.books(id) on delete set null,
  page        int,
  sort_order  int default 0,                       -- lower = higher in the list (for manual ordering later)
  created_at  timestamptz default now()
);

alter table public.grammar enable row level security;
drop policy if exists "owner manages grammar" on public.grammar;
create policy "owner manages grammar" on public.grammar
  for all to anon, authenticated using (true) with check (true);

create index if not exists grammar_user_idx
  on public.grammar (user_id, created_at desc);

-- Done. Reload the app — a new "Grammar" tab appears in the bottom bar.
