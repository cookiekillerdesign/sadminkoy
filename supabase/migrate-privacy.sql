-- ----------------------------------------------------------------------------
-- 12. Site texts - long-form editable copy (currently: the privacy policy).
--     One row per text, one column per language. An empty/missing row means
--     the site shows the built-in default from src/data/privacy.js.
--
--     Safe to run on an existing database (everything is "if not exists").
--     Already included at the bottom of schema.sql for fresh installs.
-- ----------------------------------------------------------------------------
create table if not exists public.site_texts (
  key        text primary key,
  ru         text,
  ro         text,
  en         text,
  updated_at timestamptz not null default now()
);

drop trigger if exists site_texts_touch on public.site_texts;
create trigger site_texts_touch before update on public.site_texts
  for each row execute function public.touch_updated_at();

alter table public.site_texts enable row level security;

drop policy if exists "site texts public read" on public.site_texts;
create policy "site texts public read" on public.site_texts
  for select using (true);

drop policy if exists "site texts admin write" on public.site_texts;
create policy "site texts admin write" on public.site_texts
  for all using (public.is_admin()) with check (public.is_admin());
