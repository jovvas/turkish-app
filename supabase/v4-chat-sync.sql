-- =====================================================================
--  Türkçe Study App — v4 migration: SYNC THE TUTOR CHAT
--
--  Run this ONCE in the Supabase dashboard: SQL Editor -> New query ->
--  paste this whole file -> Run.
--
--  What it adds: a single-row "chat_state" table that holds your current
--  Tutor conversation, so it syncs across your devices (phone, laptop…) and
--  keeps going until you tap "New chat". Same single-owner, no-login setup as
--  the rest of the app.
-- =====================================================================

create table if not exists public.chat_state (
  user_id    uuid primary key default '00000000-0000-0000-0000-000000000001',
  messages   jsonb not null default '[]'::jsonb,  -- [{ "role": "...", "content": "..." }]
  updated_at timestamptz default now()
);

alter table public.chat_state enable row level security;
drop policy if exists "owner manages chat state" on public.chat_state;
create policy "owner manages chat state" on public.chat_state
  for all to anon, authenticated using (true) with check (true);

-- Done. Reload the app — the Tutor conversation now follows you across devices.
