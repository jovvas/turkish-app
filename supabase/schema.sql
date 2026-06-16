-- =====================================================================
--  Türkçe Study App — Supabase schema (single-user, no sign-in)
--  Run this in the Supabase dashboard: SQL Editor -> New query -> Run.
--
--  This app is Jovana's personal study app. There is no login: all data
--  belongs to one fixed owner id and the anon key (shipped in the app) is
--  allowed to manage it. The PDFs aren't sensitive and the app is private.
--
--  (If you already ran the v1 schema, run supabase/v2-migration.sql instead.)
-- =====================================================================

-- ---------- BOOKS (the library) --------------------------------------
create table if not exists public.books (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  subtitle    text,
  storage_path text not null,         -- path inside the "books" storage bucket
  total_pages int,
  cover_color text default '#c2410c',
  sort_order  int default 0,
  created_at  timestamptz default now()
);

alter table public.books enable row level security;
drop policy if exists "books are readable" on public.books;
create policy "books are readable" on public.books
  for select to anon, authenticated using (true);

-- ---------- ANNOTATIONS (per page) -----------------------------------
create table if not exists public.annotations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001',
  book_id    uuid not null references public.books(id) on delete cascade,
  page       int  not null,
  data       jsonb not null default '{}'::jsonb,  -- { strokes: [...], texts: [...] }
  updated_at timestamptz default now(),
  unique (user_id, book_id, page)
);

alter table public.annotations enable row level security;
drop policy if exists "owner manages annotations" on public.annotations;
create policy "owner manages annotations" on public.annotations
  for all to anon, authenticated using (true) with check (true);

create index if not exists annotations_lookup
  on public.annotations (user_id, book_id, page);

-- ---------- DICTIONARY -----------------------------------------------
create table if not exists public.dictionary (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001',
  turkish    text not null,
  meaning    text not null,
  notes      text,
  example    text,
  book_id    uuid references public.books(id) on delete set null,
  page       int,
  learned    boolean default false,
  created_at timestamptz default now()
);

alter table public.dictionary enable row level security;
drop policy if exists "owner manages dictionary" on public.dictionary;
create policy "owner manages dictionary" on public.dictionary
  for all to anon, authenticated using (true) with check (true);

create index if not exists dictionary_user_idx
  on public.dictionary (user_id, created_at desc);

-- ---------- BOOKMARKS (important pages) ------------------------------
create table if not exists public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001',
  book_id    uuid not null references public.books(id) on delete cascade,
  page       int  not null,
  label      text,
  created_at timestamptz default now(),
  unique (user_id, book_id, page)
);

alter table public.bookmarks enable row level security;
drop policy if exists "owner manages bookmarks" on public.bookmarks;
create policy "owner manages bookmarks" on public.bookmarks
  for all to anon, authenticated using (true) with check (true);

create index if not exists bookmarks_lookup
  on public.bookmarks (user_id, book_id, page);

-- ---------- READING STATE ("continue where I left off") --------------
create table if not exists public.reading_state (
  user_id    uuid not null default '00000000-0000-0000-0000-000000000001',
  book_id    uuid not null references public.books(id) on delete cascade,
  last_page  int  not null default 1,
  updated_at timestamptz default now(),
  primary key (user_id, book_id)
);

alter table public.reading_state enable row level security;
drop policy if exists "owner manages reading state" on public.reading_state;
create policy "owner manages reading state" on public.reading_state
  for all to anon, authenticated using (true) with check (true);

-- ---------- keep updated_at fresh on annotations ---------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists annotations_touch on public.annotations;
create trigger annotations_touch
  before update on public.annotations
  for each row execute function public.touch_updated_at();

-- =====================================================================
--  STORAGE: Storage -> New bucket -> name "books", make it PUBLIC.
-- =====================================================================
