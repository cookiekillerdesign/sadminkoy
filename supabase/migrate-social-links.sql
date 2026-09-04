-- ----------------------------------------------------------------------------
-- 14. Social / contact links ("Контакты" in admin) — the icon-links row in
--     the site footer (Behance, LinkedIn, WhatsApp, phone, ...) and in the
--     mobile menu sheet. `icon` is a key into the fixed registry in
--     src/lib/socialIcons.js, not raw markup — an unknown/removed key falls
--     back to a generic link icon there rather than breaking the page.
--     Flat list, no _i18n columns: a link doesn't change per site language.
--     Same shape and RLS as certifications.
--
--     Safe to run on an existing database (everything is "if not exists").
--     Already included at the bottom of schema.sql for fresh installs.
-- ----------------------------------------------------------------------------
create table if not exists public.social_links (
  id         uuid primary key default gen_random_uuid(),
  icon       text not null default 'link',
  label      text not null default '',
  url        text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_links_sort_idx on public.social_links (sort_order);

drop trigger if exists social_links_touch on public.social_links;
create trigger social_links_touch before update on public.social_links
  for each row execute function public.touch_updated_at();

alter table public.social_links enable row level security;

drop policy if exists "social links public read" on public.social_links;
create policy "social links public read" on public.social_links
  for select using (true);

drop policy if exists "social links admin write" on public.social_links;
create policy "social links admin write" on public.social_links
  for all using (public.is_admin()) with check (public.is_admin());

-- One-time seed: only runs the very first time (table still empty), and never
-- overwrites anything an admin has since added/edited/deleted/reordered.
-- Telegram and TikTok ship with an empty url (the site hides a link with no
-- address) - fill them in from admin → Контакты whenever you have the handles.
insert into public.social_links (icon, label, url, sort_order)
select * from (values
  ('behance',  'Behance',              'https://behance.net/iamcookiekiller',  0),
  ('linkedin', 'LinkedIn',             'https://linkedin.com/in/iamcookiekiller', 10),
  ('whatsapp', 'WhatsApp',             'https://wa.me/37369555534', 20),
  ('telegram', 'Telegram',             '', 30),
  ('tiktok',   'TikTok',               '', 40),
  ('phone',    '+373 69 555 534',      'tel:+37369555534', 50)
) as seed(icon, label, url, sort_order)
where not exists (select 1 from public.social_links);
