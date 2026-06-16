-- Run this in Supabase -> SQL Editor AFTER uploading the PDFs into the
-- "books" storage bucket (keeping these exact filenames):
--   - TeachYourselfTurkish.pdf
--   - ISTANBUL_A1_compressed.pdf   (the 25 MB version, fits the free tier)
-- It registers both books so they appear in your app's Library.

insert into public.books (slug, title, subtitle, storage_path, cover_color, sort_order)
values
  ('istanbul-a1',    'İstanbul A1 — Ders Kitabı', 'A1 coursebook (your backbone)', 'ISTANBUL_A1_compressed.pdf', '#e30a17', 0),
  ('teach-yourself', 'Teach Yourself Turkish',    'Reference & self-study',        'TeachYourselfTurkish.pdf',   '#1f6feb', 1)
on conflict (slug) do update set
  title       = excluded.title,
  subtitle    = excluded.subtitle,
  storage_path= excluded.storage_path,
  cover_color = excluded.cover_color,
  sort_order  = excluded.sort_order;
