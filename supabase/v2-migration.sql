-- =====================================================================
--  Türkçe Study App — v2 migration (run ONCE in Supabase SQL Editor)
--
--  What it does:
--   1. Removes the sign-in requirement: the app is now single-user, so all
--      data belongs to one fixed owner id and the anon key can read/write it.
--   2. Keeps every note & word you already saved (re-homes them to the owner).
--   3. Adds bookmarks + "resume where I left off" tables.
--
--  Safe to run on your existing database. Run the WHOLE file.
-- =====================================================================

-- The single fixed owner (matches src/lib/owner.ts).
-- ---------------------------------------------------------------------

-- ---------- 1. Drop the auth.users foreign keys FIRST ----------------
-- (There is no logged-in user anymore, so user_id is just a constant tag.)
-- This must happen before re-homing the rows, otherwise the old foreign
-- key rejects the owner id because it isn't in auth.users.
alter table public.annotations drop constraint if exists annotations_user_id_fkey;
alter table public.dictionary  drop constraint if exists dictionary_user_id_fkey;

-- ---------- 2. Re-home existing rows to the owner --------------------
-- You were the only user, so move everything you saved under the owner id.
update public.annotations set user_id = '00000000-0000-0000-0000-000000000001';
update public.dictionary  set user_id = '00000000-0000-0000-0000-000000000001';

alter table public.annotations alter column user_id set default '00000000-0000-0000-0000-000000000001';
alter table public.dictionary  alter column user_id set default '00000000-0000-0000-0000-000000000001';

-- ---------- 3. Open access to the anon key (no login) ----------------
-- The PDFs aren't sensitive and the app is private/obscure, so the anon
-- key (shipped in the app) is allowed to manage the data directly.
drop policy if exists "books are readable by authenticated users" on public.books;
drop policy if exists "books are readable" on public.books;
create policy "books are readable" on public.books
  for select to anon, authenticated using (true);

drop policy if exists "users manage their own annotations" on public.annotations;
drop policy if exists "owner manages annotations" on public.annotations;
create policy "owner manages annotations" on public.annotations
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "users manage their own dictionary" on public.dictionary;
drop policy if exists "owner manages dictionary" on public.dictionary;
create policy "owner manages dictionary" on public.dictionary
  for all to anon, authenticated using (true) with check (true);

-- ---------- 4. Bookmarks (important pages you can jump to) -----------
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

-- ---------- 5. Reading state ("continue where I left off") -----------
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

-- ---------- 6. Make Teach Yourself Turkish the backbone (first) ------
update public.books set sort_order = 0, subtitle = 'Your main learning reference'
  where slug = 'teach-yourself';
update public.books set sort_order = 1
  where slug = 'istanbul-a1';

-- Done. Reload the app.
