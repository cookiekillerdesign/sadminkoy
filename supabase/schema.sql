-- ============================================================================
-- Cookiekiller® portfolio — Supabase schema
-- Run once in Supabase Studio → SQL Editor → New query → Run.
-- Safe to re-run: everything is idempotent.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Admin allowlist
--    Being logged in is NOT enough to write. The user id must also be here.
-- ----------------------------------------------------------------------------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

-- ----------------------------------------------------------------------------
-- 2. Projects
-- ----------------------------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  status        text not null default 'case'    check (status   in ('case','live','dev')),
  platform      text not null default 'web'     check (platform in ('web','ios','android','mobile','print')),
  category      text not null default 'product' check (category in ('product','ecommerce','mobile','branding')),
  hue           text not null default '#1B3BFF',
  year          text,
  thumb_url     text,          -- 1:1 square in the homepage work list
  preview_url   text,          -- 4:3 floating hover preview on the homepage
  external_url  text,          -- optional "live site / Behance" link
  chips         jsonb not null default '[]'::jsonb,  -- [[deckIdx, itemIdx], ...]
  name_i18n     jsonb not null default '{}'::jsonb,  -- {"en":"","ru":"","ro":""}
  tags_i18n     jsonb not null default '{}'::jsonb,
  overview_i18n jsonb not null default '{}'::jsonb,
  sort_order    integer not null default 0,
  published     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_sort_idx      on public.projects (sort_order, created_at);
create index if not exists projects_published_idx on public.projects (published);

-- ----------------------------------------------------------------------------
-- 3. Project media (photo / gif / video, ordered)
-- ----------------------------------------------------------------------------
create table if not exists public.project_media (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  url          text not null,
  kind         text not null default 'image' check (kind in ('image','gif','video')),
  poster_url   text,          -- optional still frame shown before a video plays
  caption      text,
  storage_path text,          -- path inside the `media` bucket, for cleanup
  width        integer,
  height       integer,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists project_media_project_idx on public.project_media (project_id, sort_order);

-- ----------------------------------------------------------------------------
-- 4. Site media — editable slots on the homepage
-- ----------------------------------------------------------------------------
create table if not exists public.site_media (
  key          text primary key,
  url          text,
  kind         text not null default 'image' check (kind in ('image','gif','video')),
  alt          text,
  poster_url   text,
  storage_path text,
  opacity      numeric not null default 1 check (opacity >= 0 and opacity <= 1),
  enabled      boolean not null default true,
  updated_at   timestamptz not null default now()
);

insert into public.site_media (key, url, alt, opacity) values
  ('hero_media',         null, 'Фон первого экрана', 0.35),
  ('about_media',        null, 'Фото в блоке «Обо мне»', 1),
  ('og_image',           null, 'Картинка для соцсетей', 1),
  ('special_vet_media',  null, 'Фото в блоке «Приюты и ветеринары»', 1),
  ('special_metal_media', null, 'Фото в блоке «Метал-группы и лейблы»', 1)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 4b. Site settings — small site-wide on/off switches (e.g. the RU/RO/EN
--     language switcher in the header). Same key/value shape as site_media so
--     the admin panel and the public fetch can treat it the same way.
-- ----------------------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key,
  enabled    boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Off by default: the site shows English only until an admin turns this on.
insert into public.site_settings (key, enabled) values
  ('lang_switcher', false)
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 5. updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch    on public.projects;
create trigger projects_touch    before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists site_media_touch  on public.site_media;
create trigger site_media_touch  before update on public.site_media
  for each row execute function public.touch_updated_at();

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Row Level Security
--    Read: everyone (the public website uses the anon key).
--    Write: only users present in admin_users.
-- ----------------------------------------------------------------------------
alter table public.projects      enable row level security;
alter table public.project_media enable row level security;
alter table public.site_media    enable row level security;
alter table public.site_settings enable row level security;
alter table public.admin_users   enable row level security;

-- projects -------------------------------------------------------------------
drop policy if exists "projects public read"    on public.projects;
create policy "projects public read" on public.projects
  for select using (published = true or public.is_admin());

drop policy if exists "projects admin insert"   on public.projects;
create policy "projects admin insert" on public.projects
  for insert with check (public.is_admin());

drop policy if exists "projects admin update"   on public.projects;
create policy "projects admin update" on public.projects
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "projects admin delete"   on public.projects;
create policy "projects admin delete" on public.projects
  for delete using (public.is_admin());

-- project_media --------------------------------------------------------------
drop policy if exists "media public read"       on public.project_media;
create policy "media public read" on public.project_media
  for select using (
    public.is_admin() or exists (
      select 1 from public.projects p
      where p.id = project_media.project_id and p.published = true
    )
  );

drop policy if exists "media admin insert"      on public.project_media;
create policy "media admin insert" on public.project_media
  for insert with check (public.is_admin());

drop policy if exists "media admin update"      on public.project_media;
create policy "media admin update" on public.project_media
  for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "media admin delete"      on public.project_media;
create policy "media admin delete" on public.project_media
  for delete using (public.is_admin());

-- site_media -----------------------------------------------------------------
drop policy if exists "site media public read"  on public.site_media;
create policy "site media public read" on public.site_media
  for select using (true);

drop policy if exists "site media admin write"  on public.site_media;
create policy "site media admin write" on public.site_media
  for all using (public.is_admin()) with check (public.is_admin());

-- site_settings ----------------------------------------------------------
drop policy if exists "site settings public read" on public.site_settings;
create policy "site settings public read" on public.site_settings
  for select using (true);

drop policy if exists "site settings admin write" on public.site_settings;
create policy "site settings admin write" on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- admin_users ----------------------------------------------------------------
-- A logged-in admin may read the list (used by the panel to confirm access).
drop policy if exists "admins read self"        on public.admin_users;
create policy "admins read self" on public.admin_users
  for select using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. Storage bucket for uploads
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', true, 209715200)   -- 200 MB per file
on conflict (id) do update set public = true, file_size_limit = 209715200;

drop policy if exists "media bucket public read"   on storage.objects;
create policy "media bucket public read" on storage.objects
  for select using (bucket_id = 'media');

drop policy if exists "media bucket admin insert"  on storage.objects;
create policy "media bucket admin insert" on storage.objects
  for insert with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media bucket admin update"  on storage.objects;
create policy "media bucket admin update" on storage.objects
  for update using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media bucket admin delete"  on storage.objects;
create policy "media bucket admin delete" on storage.objects
  for delete using (bucket_id = 'media' and public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Convenience: promote a user to admin by email
--    Usage:  select public.grant_admin('you@example.com');
--    Only works from the SQL editor (service role); ordinary users can't call it.
-- ----------------------------------------------------------------------------
create or replace function public.grant_admin(target_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(target_email) limit 1;
  if uid is null then
    return 'Пользователь ' || target_email || ' не найден. Сначала создайте его в Authentication → Users.';
  end if;
  insert into public.admin_users (user_id, email) values (uid, target_email)
  on conflict (user_id) do nothing;
  return 'Готово: ' || target_email || ' теперь администратор.';
end;
$$;

revoke all on function public.grant_admin(text) from public, anon, authenticated;


-- ============================================================================
-- 9. Capabilities — admin-managed "Компетенции" blocks & their chips
--
--    Used to be a hardcoded array baked into the frontend (translations.*.
--    capabilities.decks), and a project's `chips` referenced it by raw
--    position — chips: [[deckIndex, itemIndex], ...]. That made the list
--    impossible to edit safely: reordering or deleting anything would
--    silently relabel or blank out tags already picked on existing projects.
--
--    Decks and items now live in their own tables with stable ids, and
--    `projects.chips` stores those ids directly (chips: ["<item-uuid>", ...]).
--    Adding, renaming, reordering and deleting is then always safe — the
--    worst a deletion does is drop that one tag from whatever projects had
--    it, which the frontend already does gracefully.
-- ----------------------------------------------------------------------------
create table if not exists public.capability_decks (
  id         uuid primary key default gen_random_uuid(),
  top1_i18n  jsonb not null default '{}'::jsonb,  -- {"en":"A - Product & UX", "ru":"…", "ro":"…"}
  top2_i18n  jsonb not null default '{}'::jsonb,  -- {"en":"Where I start", …}
  h3_i18n    jsonb not null default '{}'::jsonb,  -- {"en":"Product & UX Design", …}
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.capability_items (
  id         uuid primary key default gen_random_uuid(),
  deck_id    uuid not null references public.capability_decks(id) on delete cascade,
  label_i18n jsonb not null default '{}'::jsonb,  -- {"en":"Figma", "ru":"Figma", "ro":"Figma"}
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists capability_decks_sort_idx on public.capability_decks (sort_order);
create index if not exists capability_items_deck_idx  on public.capability_items (deck_id, sort_order);

drop trigger if exists capability_decks_touch on public.capability_decks;
create trigger capability_decks_touch before update on public.capability_decks
  for each row execute function public.touch_updated_at();

drop trigger if exists capability_items_touch on public.capability_items;
create trigger capability_items_touch before update on public.capability_items
  for each row execute function public.touch_updated_at();

alter table public.capability_decks enable row level security;
alter table public.capability_items enable row level security;

drop policy if exists "capability decks public read" on public.capability_decks;
create policy "capability decks public read" on public.capability_decks
  for select using (true);

drop policy if exists "capability decks admin write" on public.capability_decks;
create policy "capability decks admin write" on public.capability_decks
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "capability items public read" on public.capability_items;
create policy "capability items public read" on public.capability_items
  for select using (true);

drop policy if exists "capability items admin write" on public.capability_items;
create policy "capability items admin write" on public.capability_items
  for all using (public.is_admin()) with check (public.is_admin());

comment on column public.projects.chips is
  'array of capability_items.id (uuid strings) — see capability_decks / capability_items. Old installs may still hold legacy [[deckIndex,itemIndex]] pairs until the one-time migration below runs.';

-- ----------------------------------------------------------------------------
-- 10. One-time seed + migration
--
--     Runs only the very first time (capability_decks is still empty) so this
--     stays safe to re-run like the rest of the file, and never overwrites
--     anything an admin has since customized. It seeds the current default
--     blocks/items, then rewrites every project's `chips` from the legacy
--     [[deckIndex,itemIndex]] shape to the new item-id shape, mapping each
--     pair against the exact order just seeded below.
--
--     If your live data was tagged against an older/different version of the
--     list than what's seeded here, double-check the "Что использовали" tags
--     on your case studies afterwards — everything else in the panel is safe
--     to freely rename, reorder, add to or delete from now on.
-- ----------------------------------------------------------------------------
do $$
declare
  decks_json jsonb := '[{"top1": {"en": "A - Product & UX", "ru": "A - Продукт и UX", "ro": "A - Product & UX"}, "top2": {"en": "Where I start", "ru": "С чего я начинаю", "ro": "De unde încep"}, "h3": {"en": "Product & UX Design", "ru": "Продукт и UX дизайн", "ro": "Product & UX Design"}, "items": [{"en": "User Flows", "ru": "Пользовательские флоу", "ro": "User Flows"}, {"en": "Information Architecture", "ru": "Информационная архитектура", "ro": "Arhitectura informației"}, {"en": "MVP Design", "ru": "MVP-дизайн", "ro": "Design MVP"}, {"en": "A/B Testing", "ru": "A/B-тестирование", "ro": "Testare A/B"}, {"en": "Conversion Optimization", "ru": "Оптимизация конверсии", "ro": "Optimizare conversii"}, {"en": "UX Research", "ru": "UX-исследования", "ro": "Cercetare UX"}, {"en": "Usability Testing", "ru": "Юзабилити-тестирование", "ro": "Testare de uzabilitate"}, {"en": "Wireframing", "ru": "Вайрфреймы", "ro": "Wireframing"}, {"en": "Customer Journey Mapping", "ru": "Карта пути пользователя", "ro": "Harta călătoriei utilizatorului"}, {"en": "Design Sprints", "ru": "Дизайн-спринты", "ro": "Sprinturi de design"}, {"en": "Product Analytics", "ru": "Продуктовая аналитика", "ro": "Analitică de produs"}, {"en": "AI-Assisted Research", "ru": "AI-ресёрч", "ro": "Cercetare asistată de AI"}, {"en": "Design Thinking", "ru": "Дизайн-мышление", "ro": "Design Thinking"}, {"en": "Hypothesis Testing", "ru": "Тестирование гипотез", "ro": "Testare de ipoteze"}]}, {"top1": {"en": "B - UI & Systems", "ru": "B - UI и системы", "ro": "B - UI & Sisteme"}, "top2": {"en": "Where it scales", "ru": "Где это масштабируется", "ro": "Unde se scalează"}, "h3": {"en": "UI & Design Systems", "ru": "UI и дизайн-системы", "ro": "UI & Design Systems"}, "items": [{"en": "Design Systems", "ru": "Дизайн-системы", "ro": "Sisteme de design"}, {"en": "Prototyping", "ru": "Прототипирование", "ro": "Prototipare"}, {"en": "Responsive Design", "ru": "Адаптивный дизайн", "ro": "Design responsive"}, {"en": "Accessibility", "ru": "Доступность", "ro": "Accesibilitate"}, {"en": "Web · iOS · Android", "ru": "Web · iOS · Android", "ro": "Web · iOS · Android"}, {"en": "Design-to-dev handoff", "ru": "Передача в разработку", "ro": "Handoff către dezvoltare"}, {"en": "Design Tokens", "ru": "Дизайн-токены", "ro": "Tokenuri de design"}, {"en": "Motion Design", "ru": "Моушн-дизайн интерфейсов", "ro": "Motion design pentru interfețe"}, {"en": "AI & Agentic UX", "ru": "AI и агентный UX", "ro": "AI & UX agentic"}, {"en": "Dark Mode & Theming", "ru": "Тёмные темы и theming", "ro": "Mod întunecat & theming"}, {"en": "Spatial & AR/VR Design", "ru": "Spatial и AR/VR-дизайн", "ro": "Design Spatial & AR/VR"}, {"en": "No-Code Prototyping", "ru": "No-code прототипирование", "ro": "Prototipare No-Code"}]}, {"top1": {"en": "C - Brand", "ru": "C - Бренд", "ro": "C - Brand"}, "top2": {"en": "Where it gets a face", "ru": "Где появляется лицо", "ro": "Unde capătă o față"}, "h3": {"en": "Branding & Visual", "ru": "Брендинг и визуал", "ro": "Branding & Visual"}, "items": [{"en": "Identity Systems", "ru": "Айдентика", "ro": "Sisteme de identitate"}, {"en": "Rebranding", "ru": "Ребрендинг", "ro": "Rebranding"}, {"en": "Packaging", "ru": "Упаковка", "ro": "Ambalaje"}, {"en": "Motion & Visual Communication", "ru": "Моушн и визуальные коммуникации", "ro": "Motion & comunicare vizuală"}, {"en": "Print & Digital", "ru": "Print и digital", "ro": "Print & Digital"}, {"en": "3D & Immersive Graphics", "ru": "3D и immersive-графика", "ro": "Grafică 3D & imersivă"}, {"en": "Illustration", "ru": "Иллюстрация", "ro": "Ilustrație"}, {"en": "Social & Content Design", "ru": "Дизайн для соцсетей", "ro": "Design pentru social media"}, {"en": "Brand Guidelines", "ru": "Брендбук и гайдлайны", "ro": "Ghid de brand"}, {"en": "Typography & Lettering", "ru": "Типографика и леттеринг", "ro": "Tipografie & Lettering"}]}, {"top1": {"en": "D - Stack", "ru": "D - Стек", "ro": "D - Stack"}, "top2": {"en": "Where it gets fast", "ru": "Где это ускоряется", "ro": "Unde devine rapid"}, "h3": {"en": "Tools & AI Stack", "ru": "Инструменты и AI-стек", "ro": "Tools & AI Stack"}, "items": [{"en": "Figma", "ru": "Figma", "ro": "Figma"}, {"en": "Adobe CC", "ru": "Adobe CC", "ro": "Adobe CC"}, {"en": "FigJam", "ru": "FigJam", "ro": "FigJam"}, {"en": "Notion", "ru": "Notion", "ro": "Notion"}, {"en": "Linear", "ru": "Linear", "ro": "Linear"}, {"en": "Adobe Firefly", "ru": "Adobe Firefly", "ro": "Adobe Firefly"}, {"en": "Sora", "ru": "Sora", "ro": "Sora"}, {"en": "ChatGPT", "ru": "ChatGPT", "ro": "ChatGPT"}, {"en": "Figma Make", "ru": "Figma Make", "ro": "Figma Make"}, {"en": "Framer", "ru": "Framer", "ro": "Framer"}, {"en": "Webflow", "ru": "Webflow", "ro": "Webflow"}, {"en": "Google Stitch", "ru": "Google Stitch", "ro": "Google Stitch"}, {"en": "Claude", "ru": "Claude", "ro": "Claude"}, {"en": "CorelDRAW", "ru": "CorelDRAW", "ro": "CorelDRAW"}, {"en": "Sketch", "ru": "Sketch", "ro": "Sketch"}, {"en": "Affinity Designer", "ru": "Affinity Designer", "ro": "Affinity Designer"}, {"en": "Spline", "ru": "Spline", "ro": "Spline"}, {"en": "Midjourney", "ru": "Midjourney", "ro": "Midjourney"}]}]'::jsonb;
  deck       jsonb;
  item       jsonb;
  deck_id    uuid;
  item_id    uuid;
  d_idx      int := 0;
  i_idx      int;
  id_map     jsonb := '{}'::jsonb;   -- {"0": {"0": "<uuid>", "1": "<uuid>", …}, "1": {…}}
  proj       record;
  old_chip   jsonb;
  new_chips  jsonb;
  mapped_id  text;
begin
  if exists (select 1 from public.capability_decks) then
    return;
  end if;

  for deck in select * from jsonb_array_elements(decks_json) loop
    insert into public.capability_decks (top1_i18n, top2_i18n, h3_i18n, sort_order)
    values (deck->'top1', deck->'top2', deck->'h3', d_idx * 10)
    returning id into deck_id;

    -- jsonb_set only ever creates the *last* key of a path — the parent
    -- object for this deck has to exist first, or the nested item-id set
    -- below silently no-ops and id_map stays empty.
    id_map := jsonb_set(id_map, array[d_idx::text], '{}'::jsonb, true);

    i_idx := 0;
    for item in select * from jsonb_array_elements(deck->'items') loop
      insert into public.capability_items (deck_id, label_i18n, sort_order)
      values (deck_id, item, i_idx * 10)
      returning id into item_id;

      id_map := jsonb_set(id_map, array[d_idx::text, i_idx::text], to_jsonb(item_id::text), true);
      i_idx := i_idx + 1;
    end loop;

    d_idx := d_idx + 1;
  end loop;

  for proj in select id, chips from public.projects where jsonb_typeof(chips) = 'array' loop
    new_chips := '[]'::jsonb;
    for old_chip in select * from jsonb_array_elements(proj.chips) loop
      if jsonb_typeof(old_chip) = 'array' and jsonb_array_length(old_chip) = 2 then
        mapped_id := id_map #>> array[(old_chip->>0), (old_chip->>1)];
        if mapped_id is not null then
          new_chips := new_chips || to_jsonb(mapped_id);
        end if;
      end if;
    end loop;
    update public.projects set chips = new_chips where id = proj.id;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 11. Certifications ("Certifications" section on the homepage)
--
--     Unlike projects/capabilities this is a flat, un-translated list - a
--     credential's name/issuer reads the same in every site language, so
--     there are no _i18n jsonb columns here. `image_url` holds either a
--     Storage URL (uploaded from admin → Сертификаты) or one of the static
--     `/certs/*.png` paths shipped with the site.
-- ----------------------------------------------------------------------------
create table if not exists public.certifications (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '',
  issuer     text not null default '',
  date_label text not null default '',  -- free text, e.g. "Oct 2020" - not a real date, just what's printed on the cert
  code       text not null default '',  -- credential/verification code; blank when the issuer doesn't use one
  verify_url text not null default '',
  image_url  text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists certifications_sort_idx on public.certifications (sort_order);

drop trigger if exists certifications_touch on public.certifications;
create trigger certifications_touch before update on public.certifications
  for each row execute function public.touch_updated_at();

alter table public.certifications enable row level security;

drop policy if exists "certifications public read" on public.certifications;
create policy "certifications public read" on public.certifications
  for select using (true);

drop policy if exists "certifications admin write" on public.certifications;
create policy "certifications admin write" on public.certifications
  for all using (public.is_admin()) with check (public.is_admin());

-- One-time seed: only runs the very first time (table still empty), and never
-- overwrites anything an admin has since added/edited/deleted. Seeds the same
-- 5 credentials that ship as the static fallback, pointing at the same
-- `/certs/*.png` files bundled with the site - upload a real scan over any of
-- them in admin → Сертификаты whenever you'd rather it served from Storage.
insert into public.certifications (name, issuer, date_label, code, verify_url, image_url, sort_order)
select * from (values
  ('Adobe Certified Professional - Visual Design', 'Adobe', 'Oct 2020', 'FBAF-XM7X', 'https://verify.certiport.com', '/certs/adobe-visual-design.png', 0),
  ('ACP - Visual Design · Photoshop CC', 'Adobe', 'Oct 2020', 'JULU-4TWS', 'https://verify.certiport.com', '/certs/adobe-photoshop.png', 10),
  ('ACP - Graphic Design · Illustrator', 'Adobe', 'Apr 2021', 'FBAE-XMcd', 'https://verify.certiport.com', '/certs/adobe-illustrator.png', 20),
  ('ACP - Print & Digital Media · InDesign', 'Adobe', 'Feb 2022', 'ysmR-Dw74', 'https://verify.certiport.com', '/certs/adobe-indesign.png', 30),
  ('Basic Principles of Design', 'IBM SkillsBuild', 'Feb 2026', '', 'https://www.credly.com/badges/214197fc-20cd-4d2c-9ffd-403001a31b82', '/certs/ibm-basic-principles.png', 40)
) as seed(name, issuer, date_label, code, verify_url, image_url, sort_order)
where not exists (select 1 from public.certifications);

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

-- ----------------------------------------------------------------------------
-- 13. Storage / database usage for the admin dashboard.
--     Supabase does not expose the plan quota to the browser (that needs the
--     Management API and a personal token), but what is *used* can be counted
--     here: bytes in the `media` bucket and the size of the database.
--     Admin-only; anonymous callers get an error.
--
--     Safe to run on an existing database. Also included in schema.sql.
-- ----------------------------------------------------------------------------
create or replace function public.usage_stats()
returns json
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  media_bytes bigint;
  media_files bigint;
  db_bytes    bigint;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select coalesce(sum((o.metadata->>'size')::bigint), 0), count(*)
    into media_bytes, media_files
    from storage.objects o
   where o.bucket_id = 'media';

  select pg_database_size(current_database()) into db_bytes;

  return json_build_object(
    'media_bytes', media_bytes,
    'media_files', media_files,
    'db_bytes',    db_bytes
  );
end;
$$;

revoke all on function public.usage_stats() from public;
grant execute on function public.usage_stats() to authenticated;

-- ----------------------------------------------------------------------------
-- 14. Social / contact links ("Контакты" in admin) — the icon-links row in
--     the site footer (Behance, LinkedIn, WhatsApp, phone, ...) and in the
--     mobile menu sheet. `icon` is a key into the fixed registry in
--     src/lib/socialIcons.js, not raw markup — an unknown/removed key falls
--     back to a generic link icon there rather than breaking the page.
--     Flat list, no _i18n columns: a link doesn't change per site language.
--     Same shape and RLS as certifications above.
--
--     Safe to run on an existing database. Also available standalone as
--     supabase/migrate-social-links.sql for a database that already ran an
--     older schema.sql.
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

-- ----------------------------------------------------------------------------
-- 15. get_site_content() — bundles the public site's load into one call.
--
--     src/content/publicApi.js used to issue 8 separate anonymous GETs on
--     every visit (projects, project_media, site_media, site_settings,
--     capability_decks, capability_items, certifications, social_links).
--     Each one is small, but the browser can only run so many to the same
--     host in parallel, and every one of them pays a fresh TLS + Supabase
--     round trip — on a slow connection those queue up and delay the
--     homepage's largest paint. This function does the same 8 reads inside
--     Postgres and hands them back as one JSON object, so the site now makes
--     a single request instead.
--
--     SECURITY INVOKER (the default — not restated below): this runs with
--     the privileges of whoever calls it (the anon key, same as today), so
--     the existing "public read" row-level-security policies above still
--     decide what comes back. Nothing here can read more than a plain
--     SELECT from the anon key already could.
--
--     site_settings / capability_decks / capability_items / certifications /
--     social_links are wrapped in `to_regclass(...) is not null` + dynamic
--     EXECUTE, because a static query that merely mentions a table which
--     doesn't exist yet fails to plan at all — even inside a branch that
--     never runs. That mirrors the `.catch(() => [])` fallback the old
--     client-side code used for the same five "newer" tables, so a database
--     that hasn't run their migrations yet still returns the rest of the
--     site instead of erroring out. projects / project_media / site_media
--     are the three original tables and are always assumed present.
--
--     Same function also lives in migrate-combined-content.sql for existing
--     databases (`create or replace`, safe to run any time).
-- ----------------------------------------------------------------------------
create or replace function public.get_site_content()
returns json
language plpgsql
stable
as $$
declare
  site_settings_json    json := '[]'::json;
  capability_decks_json json := '[]'::json;
  capability_items_json json := '[]'::json;
  certifications_json   json := '[]'::json;
  social_links_json     json := '[]'::json;
  result json;
begin
  if to_regclass('public.site_settings') is not null then
    execute 'select coalesce(json_agg(t), ''[]''::json) from public.site_settings t'
      into site_settings_json;
  end if;

  if to_regclass('public.capability_decks') is not null then
    execute 'select coalesce(json_agg(t order by t.sort_order asc), ''[]''::json) from public.capability_decks t'
      into capability_decks_json;
  end if;

  if to_regclass('public.capability_items') is not null then
    execute 'select coalesce(json_agg(t order by t.sort_order asc), ''[]''::json) from public.capability_items t'
      into capability_items_json;
  end if;

  if to_regclass('public.certifications') is not null then
    execute 'select coalesce(json_agg(t order by t.sort_order asc), ''[]''::json) from public.certifications t'
      into certifications_json;
  end if;

  if to_regclass('public.social_links') is not null then
    execute 'select coalesce(json_agg(t order by t.sort_order asc), ''[]''::json) from public.social_links t'
      into social_links_json;
  end if;

  select json_build_object(
    'projects', (
      select coalesce(json_agg(p order by p.sort_order asc, p.created_at asc), '[]'::json)
      from public.projects p
      where p.published = true
    ),
    'project_media', (
      select coalesce(json_agg(m order by m.sort_order asc, m.created_at asc), '[]'::json)
      from public.project_media m
    ),
    'site_media', (
      select coalesce(json_agg(s), '[]'::json)
      from public.site_media s
    ),
    'site_settings', site_settings_json,
    'capability_decks', capability_decks_json,
    'capability_items', capability_items_json,
    'certifications', certifications_json,
    'social_links', social_links_json
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_site_content() from public;
grant execute on function public.get_site_content() to anon, authenticated;
